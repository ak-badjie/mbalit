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
    serverTimestamp,
    GeoPoint,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, getMessagingInstance } from './firebase';
import { normalizeOrgCode } from './org-code';
import { getToken } from 'firebase/messaging';
import {
    WasteType,
    GeoLocation,
} from '@/types';

import {
    CollectorStats,
    CollectorSettings,
    CollectorProfile,
    Review,
    Notification as AppNotification,
} from '@/types';

// =====================================
// PAYMENTS (Firestore)
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
        status: 'pending',
        method,
        createdAt: serverTimestamp(),
    });

    return paymentRef.id;
}

// Update payment status
export async function updatePaymentStatus(
    paymentId: string,
    status: string,
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
// WALLET BALANCE (Firestore)
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
            escrowBalance: 0,
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
    try {
        const requestWithdrawal = httpsCallable(functions, 'requestWithdrawal');
        const response = await requestWithdrawal({
            amount,
            network: paymentMethod,
            account_number: phoneNumber,
            walletType: 'individual',
            userId: collectorId
        });
        const data = response.data as any;
        return { success: true, transactionId: data.reference };
    } catch (error: any) {
        console.error('Withdrawal error:', error);
        return { success: false, error: error.message || 'Withdrawal failed' };
    }
}

// Withdraw from organization wallet
export async function withdrawFromOrgWallet(
    orgId: string,
    amount: number,
    paymentMethod: string,
    phoneNumber: string
): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    try {
        const requestWithdrawal = httpsCallable(functions, 'requestWithdrawal');
        const response = await requestWithdrawal({
            amount,
            network: paymentMethod,
            account_number: phoneNumber,
            walletType: 'organization',
            orgId: orgId
        });
        const data = response.data as any;
        return { success: true, transactionId: data.reference };
    } catch (error: any) {
        console.error('Org Withdrawal error:', error);
        return { success: false, error: error.message || 'Withdrawal failed' };
    }
}

// =====================================
// ESCROW BALANCE (Firestore)
// =====================================

// Add to Escrow Balance
export async function creditEscrow(
    collectorId: string,
    agencyId: string | undefined,
    amount: number,
    description: string,
    transactionId?: string
): Promise<void> {
    const isOrg = !!agencyId;
    const targetId = isOrg ? agencyId! : collectorId;
    const collectionName = isOrg ? 'organizations' : 'wallets';
    const balanceField = isOrg ? 'walletBalance' : 'balance'; // We use escrowBalance on both
    
    const ref = doc(db, collectionName, targetId);
    const snap = await getDoc(ref);

    const currentEscrow = snap.exists() ? (snap.data().escrowBalance || 0) : 0;
    const newEscrow = currentEscrow + amount;

    if (snap.exists()) {
        await updateDoc(ref, {
            escrowBalance: newEscrow,
            updatedAt: serverTimestamp(),
        });
    } else if (!isOrg) {
        await setDoc(ref, {
            balance: 0,
            escrowBalance: newEscrow,
            currency: 'GMD',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    // Record transaction
    const transRef = doc(collection(db, 'walletTransactions'));
    await setDoc(transRef, {
        walletId: targetId,
        walletType: isOrg ? 'organization' : 'individual',
        type: 'escrow_credit',
        amount,
        description,
        transactionId,
        escrowBalanceAfter: newEscrow,
        createdAt: serverTimestamp(),
    });
}

// Release Escrow (move from escrow to main wallet)
export async function releaseEscrowForPickup(
    collectorId: string,
    agencyId: string | undefined,
    amount: number,
    description: string
): Promise<void> {
    const isOrg = !!agencyId;
    const targetId = isOrg ? agencyId! : collectorId;
    const collectionName = isOrg ? 'organizations' : 'wallets';
    const balanceField = isOrg ? 'walletBalance' : 'balance';
    
    const ref = doc(db, collectionName, targetId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const currentEscrow = snap.data().escrowBalance || 0;
    const currentWallet = snap.data()[balanceField] || 0;
    
    // Safety check - release up to available escrow
    const amountToRelease = Math.min(amount, currentEscrow);
    if (amountToRelease <= 0) return;

    const newEscrow = currentEscrow - amountToRelease;
    const newWallet = currentWallet + amountToRelease;

    await updateDoc(ref, {
        [balanceField]: newWallet,
        escrowBalance: newEscrow,
        updatedAt: serverTimestamp(),
    });

    // Record transaction
    const transRef = doc(collection(db, 'walletTransactions'));
    await setDoc(transRef, {
        walletId: targetId,
        walletType: isOrg ? 'organization' : 'individual',
        type: 'escrow_release',
        amount: amountToRelease,
        description,
        escrowBalanceAfter: newEscrow,
        balanceAfter: newWallet,
        createdAt: serverTimestamp(),
    });
}

// Refund Escrow to Customer Wallet
export async function refundEscrowToCustomer(
    customerId: string,
    collectorId: string,
    agencyId: string | undefined,
    amountToRefund: number,
    description: string
): Promise<void> {
    const isOrg = !!agencyId;
    const targetId = isOrg ? agencyId! : collectorId;
    const collectionName = isOrg ? 'organizations' : 'wallets';
    
    const providerRef = doc(db, collectionName, targetId);
    const providerSnap = await getDoc(providerRef);

    if (providerSnap.exists()) {
        const currentEscrow = providerSnap.data().escrowBalance || 0;
        const actualRefund = Math.min(amountToRefund, currentEscrow);
        
        if (actualRefund > 0) {
            await updateDoc(providerRef, {
                escrowBalance: currentEscrow - actualRefund,
                updatedAt: serverTimestamp(),
            });
            
            // Credit customer wallet
            await creditWallet(customerId, actualRefund, description);
        }
    }
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
// COLLECTOR STATS (Firestore)
// =====================================

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
// COLLECTOR NOTIFICATIONS (Firestore)
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
// COLLECTOR SETTINGS (Firestore)
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
// COLLECTOR PROFILE (Firestore)
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
        collectorType: data.collectorType || 'individual',
        agencyId: data.agencyId,
        agencyName: data.agencyName,
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
// REVIEWS (Firestore - Bidirectional)
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

// =====================================
// USER NOTIFICATIONS (alias)
// =====================================

export async function getNotifications(userId: string): Promise<AppNotification[]> {
    return getCollectorNotifications(userId);
}

// =====================================
// BROWSE COLLECTORS (Firestore)
// =====================================

export interface CollectorListItem {
    id: string;
    displayName: string;
    profileImage?: string;
    rating: number;
    totalReviews: number;
    totalPickups: number;
    wasteTypesHandled: string[];
    vehicleType: string;
    collectorType: string;
    bio?: string;
}

// Get all collectors for subscription browsing
export async function getAllCollectors(): Promise<CollectorListItem[]> {
    const q = query(
        collection(db, 'collectorProfiles'),
        orderBy('displayName', 'asc'),
        limit(100)
    );

    const snapshot = await getDocs(q);

    const collectors: CollectorListItem[] = [];

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        // Get stats for rating
        let rating = 0;
        let totalReviews = 0;
        let totalPickups = 0;
        try {
            const statsDoc = await getDoc(doc(db, 'collectorStats', docSnap.id));
            if (statsDoc.exists()) {
                const stats = statsDoc.data();
                rating = stats.averageRating || 0;
                totalReviews = stats.totalReviews || 0;
                totalPickups = stats.monthlyPickups || 0;
            }
        } catch { /* ignore */ }

        collectors.push({
            id: docSnap.id,
            displayName: data.displayName || 'Collector',
            profileImage: data.profileImage,
            rating,
            totalReviews,
            totalPickups,
            wasteTypesHandled: data.wasteTypesHandled || [],
            vehicleType: data.vehicleType || 'motorcycle',
            collectorType: data.collectorType || 'individual',
            bio: data.bio,
        });
    }

    return collectors;
}

// Search collectors by name
export async function searchCollectors(searchTerm: string): Promise<CollectorListItem[]> {
    // Firestore doesn't support full-text search, so we fetch all and filter client-side
    const all = await getAllCollectors();
    const term = searchTerm.toLowerCase();
    return all.filter(c =>
        c.displayName.toLowerCase().includes(term) ||
        c.bio?.toLowerCase().includes(term) ||
        c.wasteTypesHandled.some(w => w.toLowerCase().includes(term))
    );
}

// =====================================
// SUBSCRIPTION PAYMENT PROCESSING (Firestore)
// =====================================

export async function processSubscriptionPayment(
    collectorId: string,
    customerId: string,
    amount: number,
    subscriptionId?: string,
    jobId?: string,
): Promise<{ paymentId: string; collectorEarnings: number; platformFee: number }> {
    // Check if collectorId belongs to an organization
    const orgDoc = await getDoc(doc(db, 'organizations', collectorId));
    const isOrganization = orgDoc.exists();
    
    // 10% platform fee for Orgs, 30% for individual drivers
    const PLATFORM_FEE_RATE = isOrganization ? 0.10 : 0.30;
    const COLLECTOR_RATE = 1.0 - PLATFORM_FEE_RATE;

    const collectorEarnings = Math.round(amount * COLLECTOR_RATE * 100) / 100;
    const platformFee = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;

    // Create payment record
    const paymentRef = doc(collection(db, 'payments'));
    await setDoc(paymentRef, {
        requestId: jobId || subscriptionId || '',
        subscriptionId: subscriptionId || null,
        customerId,
        collectorId,
        amount,
        collectorEarnings,
        platformFee,
        currency: 'GMD',
        status: 'completed',
        method: 'in_app',
        createdAt: serverTimestamp(),
        completedAt: serverTimestamp(),
    });

    // Credit collector escrow
    await creditEscrow(
        collectorId,
        isOrganization ? collectorId : undefined,
        collectorEarnings,
        `Subscription Payment Escrow: ${jobId || subscriptionId}`,
        paymentRef.id
    );

    // Update collector stats
    await updateCollectorStats(collectorId, collectorEarnings);

    // Create notification for collector
    await createNotification(
        collectorId,
        'Payment Received',
        `You earned ${collectorEarnings} GMD from a ${amount} GMD payment (${Math.round(COLLECTOR_RATE * 100)}% share).`,
        'success',
        { paymentId: paymentRef.id, amount, collectorEarnings, platformFee }
    );

    return { paymentId: paymentRef.id, collectorEarnings, platformFee };
}

// =====================================
// ORGANIZATION MANAGEMENT (Firestore)
// =====================================

// Get organization by org code.
// Codes are matched case-insensitively and ignore any separators the user
// typed, so "cfs 482", "CFS-482" and "cfs482" all find the same org.
export async function getOrganization(orgCode: string) {
    const normalized = normalizeOrgCode(orgCode);
    let orgDoc = await getDoc(doc(db, 'organizations', normalized));
    if (!orgDoc.exists() && orgCode !== normalized) {
        // Fall back to the raw id for any legacy lower-case-hyphen code.
        orgDoc = await getDoc(doc(db, 'organizations', orgCode));
    }
    if (!orgDoc.exists()) return null;
    return { id: orgDoc.id, ...orgDoc.data() };
}

// Get organization by owner ID
export async function getOrganizationByOwner(ownerId: string) {
    const q = query(collection(db, 'organizations'), where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const orgDoc = snap.docs[0];
    return { id: orgDoc.id, ...orgDoc.data() };
}

// Get all members (approved + pending) of an organization
export async function getOrganizationMembers(orgCode: string) {
    const org = await getOrganization(orgCode);
    if (!org) return { approved: [], pending: [] };

    const memberIds = (org as any).members || [];
    const pendingIds = (org as any).pendingMembers || [];

    const fetchUsers = async (ids: string[]) => {
        const users = [];
        for (const id of ids) {
            const userDoc = await getDoc(doc(db, 'users', id));
            if (userDoc.exists()) {
                users.push({ id: userDoc.id, ...userDoc.data() });
            }
        }
        return users;
    };

    const [approved, pending] = await Promise.all([
        fetchUsers(memberIds),
        fetchUsers(pendingIds),
    ]);

    return { approved, pending };
}

// Approve a pending member
export async function approveMember(orgCode: string, memberId: string) {
    const orgRef = doc(db, 'organizations', orgCode);
    const orgDoc = await getDoc(orgRef);
    if (!orgDoc.exists()) throw new Error('Organization not found');

    const data = orgDoc.data();
    const pending = (data.pendingMembers || []).filter((id: string) => id !== memberId);
    const members = [...(data.members || []), memberId];

    await updateDoc(orgRef, {
        pendingMembers: pending,
        members,
        updatedAt: serverTimestamp(),
    });

    // Update the member's user doc
    await updateDoc(doc(db, 'users', memberId), {
        isApproved: true,
        updatedAt: serverTimestamp(),
    });
}

// Remove a member from the organization
export async function removeMember(orgCode: string, memberId: string) {
    const orgRef = doc(db, 'organizations', orgCode);
    const orgDoc = await getDoc(orgRef);
    if (!orgDoc.exists()) throw new Error('Organization not found');

    const data = orgDoc.data();
    const members = (data.members || []).filter((id: string) => id !== memberId);
    const pending = (data.pendingMembers || []).filter((id: string) => id !== memberId);

    await updateDoc(orgRef, {
        members,
        pendingMembers: pending,
        updatedAt: serverTimestamp(),
    });
}

// Update organization details
export async function updateOrganizationDetails(orgCode: string, updates: Record<string, unknown>) {
    const orgRef = doc(db, 'organizations', orgCode);
    await updateDoc(orgRef, {
        ...updates,
        updatedAt: serverTimestamp(),
    });
}

// Request and save push notification permission
export async function requestNotificationPermission(userId: string) {
    if (typeof window === 'undefined') return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const messaging = await getMessagingInstance();
            if (messaging) {
                // If a VAPID key is configured, it would go here. Otherwise it relies on Firebase defaults.
                const token = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                });
                if (token) {
                    await updateDoc(doc(db, 'users', userId), { 
                        fcmToken: token,
                        updatedAt: serverTimestamp() 
                    });
                    console.log('FCM token saved successfully.');
                }
            }
        }
    } catch (e) {
        console.error('Failed to request or save notification permission:', e);
    }
}
