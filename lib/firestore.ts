import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    GeoPoint,
    DocumentReference,
} from 'firebase/firestore';
import { ref, set, onValue, off } from 'firebase/database';
import { db, realtimeDb } from './firebase';
import {
    PickupRequest,
    WasteType,
    WasteSize,
    GeoLocation,
    RequestStatus,
    Collector,
    Payment,
    PaymentStatus
} from '@/types';
import { calculateDistance } from './maps';

// =====================================
// PICKUP REQUESTS
// =====================================

// Create a new pickup request
export async function createPickupRequest(
    customerId: string,
    wasteType: WasteType,
    wasteSize: WasteSize,
    pickupLocation: GeoLocation,
    estimatedPrice: number
): Promise<string> {
    const requestRef = doc(collection(db, 'requests'));

    const requestData = {
        customerId,
        wasteType,
        wasteSize,
        pickupLocation: new GeoPoint(pickupLocation.lat, pickupLocation.lng),
        pickupAddress: pickupLocation.formattedAddress || '',
        estimatedPrice,
        status: 'pending' as RequestStatus,
        createdAt: serverTimestamp(),
    };

    await setDoc(requestRef, requestData);
    return requestRef.id;
}

// Get a pickup request by ID
export async function getPickupRequest(requestId: string): Promise<PickupRequest | null> {
    const requestDoc = await getDoc(doc(db, 'requests', requestId));

    if (!requestDoc.exists()) return null;

    const data = requestDoc.data();
    return {
        id: requestDoc.id,
        customerId: data.customerId,
        collectorId: data.collectorId,
        wasteType: data.wasteType,
        wasteSize: data.wasteSize,
        pickupLocation: {
            lat: data.pickupLocation.latitude,
            lng: data.pickupLocation.longitude,
            formattedAddress: data.pickupAddress,
        },
        estimatedPrice: data.estimatedPrice,
        finalPrice: data.finalPrice,
        distance: data.distance,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        assignedAt: data.assignedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
    } as PickupRequest;
}

// Update pickup request status
export async function updateRequestStatus(
    requestId: string,
    status: RequestStatus,
    additionalData?: Record<string, unknown>
): Promise<void> {
    const updateData: Record<string, unknown> = {
        status,
        updatedAt: serverTimestamp(),
        ...additionalData,
    };

    if (status === 'assigned') {
        updateData.assignedAt = serverTimestamp();
    } else if (status === 'completed') {
        updateData.completedAt = serverTimestamp();
    }

    await updateDoc(doc(db, 'requests', requestId), updateData);
}

// Listen to request updates in real-time
export function subscribeToRequest(
    requestId: string,
    callback: (request: PickupRequest | null) => void
): () => void {
    const unsubscribe = onSnapshot(
        doc(db, 'requests', requestId),
        (snapshot) => {
            if (!snapshot.exists()) {
                callback(null);
                return;
            }

            const data = snapshot.data();
            callback({
                id: snapshot.id,
                customerId: data.customerId,
                collectorId: data.collectorId,
                wasteType: data.wasteType,
                wasteSize: data.wasteSize,
                pickupLocation: {
                    lat: data.pickupLocation.latitude,
                    lng: data.pickupLocation.longitude,
                    formattedAddress: data.pickupAddress,
                },
                estimatedPrice: data.estimatedPrice,
                finalPrice: data.finalPrice,
                distance: data.distance,
                status: data.status,
                createdAt: data.createdAt?.toDate() || new Date(),
                assignedAt: data.assignedAt?.toDate(),
                completedAt: data.completedAt?.toDate(),
            } as PickupRequest);
        }
    );

    return unsubscribe;
}

// =====================================
// COLLECTORS
// =====================================

// Get available collectors who handle a specific waste type
export async function getAvailableCollectors(wasteType: WasteType): Promise<Collector[]> {
    const q = query(
        collection(db, 'users'),
        where('role', '==', 'collector'),
        where('isAvailable', '==', true),
        where('wasteTypesHandled', 'array-contains', wasteType)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            role: 'collector' as const,
            wasteTypesHandled: data.wasteTypesHandled,
            isAvailable: data.isAvailable,
            currentLocation: data.currentLocation ? {
                lat: data.currentLocation.latitude,
                lng: data.currentLocation.longitude,
            } : undefined,
            rating: data.rating,
            totalPickups: data.totalPickups,
            earnings: data.earnings,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Collector;
    });
}

// Find nearest available collector
export async function findNearestCollector(
    customerLocation: GeoLocation,
    wasteType: WasteType
): Promise<{ collector: Collector; distance: number } | null> {
    const collectors = await getAvailableCollectors(wasteType);

    if (collectors.length === 0) return null;

    let nearest: { collector: Collector; distance: number } | null = null;

    for (const collector of collectors) {
        if (!collector.currentLocation) continue;

        const distance = calculateDistance(
            customerLocation.lat,
            customerLocation.lng,
            collector.currentLocation.lat,
            collector.currentLocation.lng
        );

        if (!nearest || distance < nearest.distance) {
            nearest = { collector, distance };
        }
    }

    return nearest;
}

// Assign collector to request
export async function assignCollectorToRequest(
    requestId: string,
    collectorId: string,
    distance: number
): Promise<void> {
    await updateDoc(doc(db, 'requests', requestId), {
        collectorId,
        distance,
        status: 'assigned',
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Also update collector's availability
    await updateDoc(doc(db, 'users', collectorId), {
        isAvailable: false,
        currentRequestId: requestId,
        updatedAt: serverTimestamp(),
    });
}

// Update collector location in Realtime Database (for live tracking)
export async function updateCollectorLocation(
    collectorId: string,
    location: GeoLocation
): Promise<void> {
    const locationRef = ref(realtimeDb, `collectors/${collectorId}/location`);
    await set(locationRef, {
        lat: location.lat,
        lng: location.lng,
        timestamp: Date.now(),
    });

    // Also update in Firestore for matching queries
    await updateDoc(doc(db, 'users', collectorId), {
        currentLocation: new GeoPoint(location.lat, location.lng),
        updatedAt: serverTimestamp(),
    });
}

// Subscribe to collector location updates
export function subscribeToCollectorLocation(
    collectorId: string,
    callback: (location: GeoLocation | null) => void
): () => void {
    const locationRef = ref(realtimeDb, `collectors/${collectorId}/location`);

    const listener = onValue(locationRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            callback({ lat: data.lat, lng: data.lng });
        } else {
            callback(null);
        }
    });

    return () => off(locationRef, 'value', listener);
}

// Get pending requests for collectors
export async function getPendingRequests(wasteTypes: WasteType[]): Promise<PickupRequest[]> {
    const q = query(
        collection(db, 'requests'),
        where('status', '==', 'pending'),
        where('wasteType', 'in', wasteTypes),
        orderBy('createdAt', 'desc'),
        limit(20)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            customerId: data.customerId,
            wasteType: data.wasteType,
            wasteSize: data.wasteSize,
            pickupLocation: {
                lat: data.pickupLocation.latitude,
                lng: data.pickupLocation.longitude,
                formattedAddress: data.pickupAddress,
            },
            estimatedPrice: data.estimatedPrice,
            status: data.status,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as PickupRequest;
    });
}

// =====================================
// PAYMENTS
// =====================================

// Create payment record
export async function createPayment(
    requestId: string,
    customerId: string,
    collectorId: string,
    amount: number,
    method: 'modernpay' | 'wave' | 'card'
): Promise<string> {
    const paymentRef = doc(collection(db, 'payments'));

    await setDoc(paymentRef, {
        requestId,
        customerId,
        collectorId,
        amount,
        currency: 'GMD',
        status: 'pending' as PaymentStatus,
        method,
        createdAt: serverTimestamp(),
    });

    return paymentRef.id;
}

// Update payment status
export async function updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    transactionId?: string
): Promise<void> {
    const updateData: Record<string, unknown> = {
        status,
        updatedAt: serverTimestamp(),
    };

    if (transactionId) {
        updateData.transactionId = transactionId;
    }

    if (status === 'completed') {
        updateData.completedAt = serverTimestamp();
    }

    await updateDoc(doc(db, 'payments', paymentId), updateData);
}

// Get collector's earnings
export async function getCollectorEarnings(collectorId: string): Promise<number> {
    const q = query(
        collection(db, 'payments'),
        where('collectorId', '==', collectorId),
        where('status', '==', 'completed')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.reduce((total, doc) => {
        return total + (doc.data().amount || 0);
    }, 0);
}

// =====================================
// WALLET BALANCE
// =====================================

// Get collector's wallet balance
export async function getWalletBalance(collectorId: string): Promise<number> {
    const walletDoc = await getDoc(doc(db, 'wallets', collectorId));

    if (walletDoc.exists()) {
        return walletDoc.data().balance || 0;
    }

    // Create wallet if doesn't exist
    await setDoc(doc(db, 'wallets', collectorId), {
        balance: 0,
        currency: 'GMD',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return 0;
}

// Credit wallet (add money - from completed jobs)
export async function creditWallet(
    collectorId: string,
    amount: number,
    description: string,
    transactionId?: string
): Promise<void> {
    const walletRef = doc(db, 'wallets', collectorId);
    const walletDoc = await getDoc(walletRef);

    const currentBalance = walletDoc.exists() ? walletDoc.data().balance || 0 : 0;
    const newBalance = currentBalance + amount;

    if (walletDoc.exists()) {
        await updateDoc(walletRef, {
            balance: newBalance,
            updatedAt: serverTimestamp(),
        });
    } else {
        await setDoc(walletRef, {
            balance: newBalance,
            currency: 'GMD',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    // Record transaction
    const transRef = doc(collection(db, 'walletTransactions'));
    await setDoc(transRef, {
        walletId: collectorId,
        type: 'credit',
        amount,
        description,
        transactionId,
        balanceAfter: newBalance,
        createdAt: serverTimestamp(),
    });
}

// Withdraw from wallet
export async function withdrawFromWallet(
    collectorId: string,
    amount: number,
    paymentMethod: string,
    phoneNumber: string
): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    const walletRef = doc(db, 'wallets', collectorId);
    const walletDoc = await getDoc(walletRef);

    if (!walletDoc.exists()) {
        return { success: false, error: 'Wallet not found' };
    }

    const currentBalance = walletDoc.data().balance || 0;

    if (amount > currentBalance) {
        return { success: false, error: 'Insufficient balance' };
    }

    if (amount < 50) {
        return { success: false, error: 'Minimum withdrawal is 50 GMD' };
    }

    const newBalance = currentBalance - amount;

    // Update wallet
    await updateDoc(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp(),
    });

    // Record transaction
    const transRef = doc(collection(db, 'walletTransactions'));
    const transactionId = transRef.id;

    await setDoc(transRef, {
        walletId: collectorId,
        type: 'withdraw',
        amount: -amount,
        description: `Withdrawal to ${paymentMethod} (${phoneNumber})`,
        paymentMethod,
        phoneNumber,
        status: 'pending',
        balanceAfter: newBalance,
        createdAt: serverTimestamp(),
    });

    return { success: true, transactionId };
}

// Get wallet transactions
export async function getWalletTransactions(collectorId: string, limitCount: number = 20) {
    const q = query(
        collection(db, 'walletTransactions'),
        where('walletId', '==', collectorId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    }));
}

// =====================================
// COLLECTOR STATS
// =====================================

import {
    CollectorStats,
    CollectorSettings,
    CollectorProfile,
    Review,
    Notification as AppNotification,
} from '@/types';

// Get collector stats
export async function getCollectorStats(collectorId: string): Promise<CollectorStats> {
    const statsDoc = await getDoc(doc(db, 'collectorStats', collectorId));

    if (statsDoc.exists()) {
        const data = statsDoc.data();
        return {
            todayPickups: data.todayPickups || 0,
            todayEarnings: data.todayEarnings || 0,
            weeklyPickups: data.weeklyPickups || 0,
            weeklyEarnings: data.weeklyEarnings || 0,
            monthlyPickups: data.monthlyPickups || 0,
            monthlyEarnings: data.monthlyEarnings || 0,
            totalEarnings: data.totalEarnings || 0,
            averageRating: data.averageRating || 0,
            totalReviews: data.totalReviews || 0,
            hoursOnlineToday: data.hoursOnlineToday || 0,
            acceptanceRate: data.acceptanceRate || 0,
            completionRate: data.completionRate || 0,
        };
    }

    // Return default stats if none exist
    return {
        todayPickups: 0,
        todayEarnings: 0,
        weeklyPickups: 0,
        weeklyEarnings: 0,
        monthlyPickups: 0,
        monthlyEarnings: 0,
        totalEarnings: 0,
        averageRating: 0,
        totalReviews: 0,
        hoursOnlineToday: 0,
        acceptanceRate: 0,
        completionRate: 0,
    };
}

// Update collector stats after job completion
export async function updateCollectorStats(
    collectorId: string,
    jobAmount: number
): Promise<void> {
    const statsRef = doc(db, 'collectorStats', collectorId);
    const statsDoc = await getDoc(statsRef);

    if (statsDoc.exists()) {
        const data = statsDoc.data();
        await updateDoc(statsRef, {
            todayPickups: (data.todayPickups || 0) + 1,
            todayEarnings: (data.todayEarnings || 0) + jobAmount,
            weeklyPickups: (data.weeklyPickups || 0) + 1,
            weeklyEarnings: (data.weeklyEarnings || 0) + jobAmount,
            monthlyPickups: (data.monthlyPickups || 0) + 1,
            monthlyEarnings: (data.monthlyEarnings || 0) + jobAmount,
            totalEarnings: (data.totalEarnings || 0) + jobAmount,
            updatedAt: serverTimestamp(),
        });
    } else {
        await setDoc(statsRef, {
            todayPickups: 1,
            todayEarnings: jobAmount,
            weeklyPickups: 1,
            weeklyEarnings: jobAmount,
            monthlyPickups: 1,
            monthlyEarnings: jobAmount,
            totalEarnings: jobAmount,
            averageRating: 0,
            totalReviews: 0,
            hoursOnlineToday: 0,
            acceptanceRate: 100,
            completionRate: 100,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }
}

// =====================================
// COLLECTOR NOTIFICATIONS
// =====================================

export async function getCollectorNotifications(collectorId: string): Promise<AppNotification[]> {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', collectorId),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            userId: data.userId,
            title: data.title,
            message: data.message,
            type: data.type || 'info',
            read: data.read || false,
            createdAt: data.createdAt?.toDate() || new Date(),
            data: data.data,
        } as AppNotification;
    });
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: serverTimestamp(),
    });
}

export async function markAllNotificationsAsRead(collectorId: string): Promise<void> {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', collectorId),
        where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = snapshot.docs.map((docSnapshot) =>
        updateDoc(doc(db, 'notifications', docSnapshot.id), {
            read: true,
            readAt: serverTimestamp(),
        })
    );

    await Promise.all(batch);
}

export async function createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    data?: Record<string, unknown>
): Promise<string> {
    const notifRef = doc(collection(db, 'notifications'));

    await setDoc(notifRef, {
        userId,
        title,
        message,
        type,
        read: false,
        data,
        createdAt: serverTimestamp(),
    });

    return notifRef.id;
}

// =====================================
// COLLECTOR SETTINGS
// =====================================

export async function getCollectorSettings(collectorId: string): Promise<CollectorSettings> {
    const settingsDoc = await getDoc(doc(db, 'collectorSettings', collectorId));

    if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        return {
            notificationsEnabled: data.notificationsEnabled ?? true,
            soundEnabled: data.soundEnabled ?? true,
            autoAcceptJobs: data.autoAcceptJobs ?? false,
            maxDistance: data.maxDistance ?? 10,
            preferredWasteTypes: data.preferredWasteTypes ?? [],
            darkMode: data.darkMode ?? false,
            language: data.language ?? 'en',
        };
    }

    // Return default settings
    return {
        notificationsEnabled: true,
        soundEnabled: true,
        autoAcceptJobs: false,
        maxDistance: 10,
        preferredWasteTypes: [],
        darkMode: false,
        language: 'en',
    };
}

export async function updateCollectorSettings(
    collectorId: string,
    settings: Partial<CollectorSettings>
): Promise<void> {
    const settingsRef = doc(db, 'collectorSettings', collectorId);
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
        await updateDoc(settingsRef, {
            ...settings,
            updatedAt: serverTimestamp(),
        });
    } else {
        await setDoc(settingsRef, {
            notificationsEnabled: true,
            soundEnabled: true,
            autoAcceptJobs: false,
            maxDistance: 10,
            preferredWasteTypes: [],
            darkMode: false,
            language: 'en',
            ...settings,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }
}

// =====================================
// COLLECTOR PROFILE
// =====================================

export async function getCollectorProfile(collectorId: string): Promise<CollectorProfile | null> {
    const profileDoc = await getDoc(doc(db, 'collectorProfiles', collectorId));

    if (!profileDoc.exists()) return null;

    const data = profileDoc.data();
    return {
        id: profileDoc.id,
        displayName: data.displayName || '',
        bio: data.bio || '',
        profileImage: data.profileImage,
        phone: data.phone || '',
        email: data.email || '',
        preciseLocation: data.preciseLocation ? {
            lat: data.preciseLocation.latitude,
            lng: data.preciseLocation.longitude,
            formattedAddress: data.formattedAddress,
        } : { lat: 0, lng: 0 },
        wasteTypesHandled: data.wasteTypesHandled || [],
        vehicleType: data.vehicleType || 'motorcycle',
        vehicleCapacity: data.vehicleCapacity || '',
        isVerified: data.isVerified || false,
        documentsSubmitted: data.documentsSubmitted || false,
        joinedAt: data.joinedAt?.toDate() || new Date(),
    };
}

export async function updateCollectorProfile(
    collectorId: string,
    profile: Partial<CollectorProfile>
): Promise<void> {
    const profileRef = doc(db, 'collectorProfiles', collectorId);

    const updateData: Record<string, unknown> = {
        ...profile,
        updatedAt: serverTimestamp(),
    };

    // Convert GeoLocation to GeoPoint if present
    if (profile.preciseLocation) {
        updateData.preciseLocation = new GeoPoint(
            profile.preciseLocation.lat,
            profile.preciseLocation.lng
        );
        updateData.formattedAddress = profile.preciseLocation.formattedAddress;
    }

    const profileDoc = await getDoc(profileRef);

    if (profileDoc.exists()) {
        await updateDoc(profileRef, updateData);
    } else {
        await setDoc(profileRef, {
            ...updateData,
            createdAt: serverTimestamp(),
        });
    }
}

// =====================================
// REVIEWS (Bidirectional)
// =====================================

export async function getReviewsForUser(userId: string): Promise<Review[]> {
    const q = query(
        collection(db, 'reviews'),
        where('toUserId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            jobId: data.jobId,
            fromUserId: data.fromUserId,
            fromUserName: data.fromUserName,
            fromUserImage: data.fromUserImage,
            toUserId: data.toUserId,
            toUserName: data.toUserName,
            rating: data.rating,
            comment: data.comment,
            isCollectorReview: data.isCollectorReview,
            createdAt: data.createdAt?.toDate() || new Date(),
            response: data.response,
            responseAt: data.responseAt?.toDate(),
        } as Review;
    });
}

export async function getReviewsGivenByUser(userId: string): Promise<Review[]> {
    const q = query(
        collection(db, 'reviews'),
        where('fromUserId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            jobId: data.jobId,
            fromUserId: data.fromUserId,
            fromUserName: data.fromUserName,
            fromUserImage: data.fromUserImage,
            toUserId: data.toUserId,
            toUserName: data.toUserName,
            rating: data.rating,
            comment: data.comment,
            isCollectorReview: data.isCollectorReview,
            createdAt: data.createdAt?.toDate() || new Date(),
            response: data.response,
            responseAt: data.responseAt?.toDate(),
        } as Review;
    });
}

export async function createReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<string> {
    const reviewRef = doc(collection(db, 'reviews'));

    await setDoc(reviewRef, {
        ...review,
        createdAt: serverTimestamp(),
    });

    // Update the reviewed user's average rating
    await updateUserRating(review.toUserId);

    return reviewRef.id;
}

export async function addReviewResponse(reviewId: string, response: string): Promise<void> {
    await updateDoc(doc(db, 'reviews', reviewId), {
        response,
        responseAt: serverTimestamp(),
    });
}

// Helper to update user's average rating
async function updateUserRating(userId: string): Promise<void> {
    const reviews = await getReviewsForUser(userId);

    if (reviews.length === 0) return;

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Update stats
    const statsRef = doc(db, 'collectorStats', userId);
    const statsDoc = await getDoc(statsRef);

    if (statsDoc.exists()) {
        await updateDoc(statsRef, {
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews: reviews.length,
        });
    } else {
        await setDoc(statsRef, {
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews: reviews.length,
            todayPickups: 0,
            todayEarnings: 0,
            weeklyPickups: 0,
            weeklyEarnings: 0,
            monthlyPickups: 0,
            monthlyEarnings: 0,
            totalEarnings: 0,
            hoursOnlineToday: 0,
            acceptanceRate: 0,
            completionRate: 0,
            createdAt: serverTimestamp(),
        });
    }
}

