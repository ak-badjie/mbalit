// Agency Management for Mbalit
// Handles collection agencies with multiple drivers

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import { Agency, Collector } from '@/types';

// =====================================
// AGENCY CODE GENERATION
// =====================================

// Generate unique 6-character agency code
export function generateAgencyCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0,O,1,I)
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// =====================================
// AGENCY CRUD
// =====================================

// Create a new agency
export async function createAgency(
    ownerId: string,
    name: string
): Promise<{ agency: Agency; code: string }> {
    const agencyRef = doc(collection(db, 'agencies'));
    const agencyCode = generateAgencyCode();

    const agencyData: Omit<Agency, 'id'> = {
        name,
        ownerId,
        agencyCode,
        drivers: [],
        pendingDrivers: [],
        totalEarnings: 0,
        walletBalance: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    await setDoc(agencyRef, {
        ...agencyData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Update owner's collector profile
    await updateDoc(doc(db, 'users', ownerId), {
        collectorType: 'agency_owner',
        agencyId: agencyRef.id,
        updatedAt: serverTimestamp(),
    });

    // Create agency wallet
    await setDoc(doc(db, 'wallets', agencyRef.id), {
        balance: 0,
        currency: 'GMD',
        type: 'agency',
        ownerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return {
        agency: { id: agencyRef.id, ...agencyData },
        code: agencyCode,
    };
}

// Get agency by ID
export async function getAgency(agencyId: string): Promise<Agency | null> {
    const agencyDoc = await getDoc(doc(db, 'agencies', agencyId));

    if (!agencyDoc.exists()) return null;

    const data = agencyDoc.data();
    return {
        id: agencyDoc.id,
        name: data.name,
        ownerId: data.ownerId,
        agencyCode: data.agencyCode,
        drivers: data.drivers || [],
        pendingDrivers: data.pendingDrivers || [],
        totalEarnings: data.totalEarnings || 0,
        walletBalance: data.walletBalance || 0,
        isActive: data.isActive ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
    };
}

// Get agency by code (for joining)
export async function getAgencyByCode(code: string): Promise<Agency | null> {
    const q = query(
        collection(db, 'agencies'),
        where('agencyCode', '==', code.toUpperCase()),
        where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
        id: doc.id,
        name: data.name,
        ownerId: data.ownerId,
        agencyCode: data.agencyCode,
        drivers: data.drivers || [],
        pendingDrivers: data.pendingDrivers || [],
        totalEarnings: data.totalEarnings || 0,
        walletBalance: data.walletBalance || 0,
        isActive: data.isActive ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
    };
}

// Get agency for owner
export async function getAgencyByOwner(ownerId: string): Promise<Agency | null> {
    const q = query(
        collection(db, 'agencies'),
        where('ownerId', '==', ownerId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
        id: doc.id,
        name: data.name,
        ownerId: data.ownerId,
        agencyCode: data.agencyCode,
        drivers: data.drivers || [],
        pendingDrivers: data.pendingDrivers || [],
        totalEarnings: data.totalEarnings || 0,
        walletBalance: data.walletBalance || 0,
        isActive: data.isActive ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
    };
}

// =====================================
// DRIVER MANAGEMENT
// =====================================

// Request to join an agency (driver side)
export async function requestToJoinAgency(
    driverId: string,
    agencyCode: string
): Promise<{ success: boolean; error?: string; agencyName?: string }> {
    // Find agency by code
    const agency = await getAgencyByCode(agencyCode);

    if (!agency) {
        return { success: false, error: 'Agency not found. Check the code and try again.' };
    }

    // Check if already a member or pending
    if (agency.drivers.includes(driverId)) {
        return { success: false, error: 'You are already a member of this agency.' };
    }

    if (agency.pendingDrivers.includes(driverId)) {
        return { success: false, error: 'Your request is already pending approval.' };
    }

    // Add to pending drivers
    await updateDoc(doc(db, 'agencies', agency.id), {
        pendingDrivers: arrayUnion(driverId),
        updatedAt: serverTimestamp(),
    });

    // Update driver's profile
    await updateDoc(doc(db, 'users', driverId), {
        collectorType: 'agency_driver',
        agencyId: agency.id,
        isApproved: false, // Not approved yet
        updatedAt: serverTimestamp(),
    });

    return { success: true, agencyName: agency.name };
}

// Approve a driver (agency owner side)
export async function approveDriver(
    agencyId: string,
    driverId: string,
    ownerId: string
): Promise<{ success: boolean; error?: string }> {
    const agency = await getAgency(agencyId);

    if (!agency) {
        return { success: false, error: 'Agency not found.' };
    }

    if (agency.ownerId !== ownerId) {
        return { success: false, error: 'Only the agency owner can approve drivers.' };
    }

    if (!agency.pendingDrivers.includes(driverId)) {
        return { success: false, error: 'Driver not found in pending list.' };
    }

    // Move from pending to approved
    await updateDoc(doc(db, 'agencies', agencyId), {
        pendingDrivers: arrayRemove(driverId),
        drivers: arrayUnion(driverId),
        updatedAt: serverTimestamp(),
    });

    // Update driver's approval status
    await updateDoc(doc(db, 'users', driverId), {
        isApproved: true,
        updatedAt: serverTimestamp(),
    });

    return { success: true };
}

// Reject a driver request (agency owner side)
export async function rejectDriver(
    agencyId: string,
    driverId: string,
    ownerId: string
): Promise<{ success: boolean; error?: string }> {
    const agency = await getAgency(agencyId);

    if (!agency) {
        return { success: false, error: 'Agency not found.' };
    }

    if (agency.ownerId !== ownerId) {
        return { success: false, error: 'Only the agency owner can reject drivers.' };
    }

    // Remove from pending
    await updateDoc(doc(db, 'agencies', agencyId), {
        pendingDrivers: arrayRemove(driverId),
        updatedAt: serverTimestamp(),
    });

    // Reset driver's profile
    await updateDoc(doc(db, 'users', driverId), {
        collectorType: 'individual',
        agencyId: null,
        isApproved: true, // Reset to individual
        updatedAt: serverTimestamp(),
    });

    return { success: true };
}

// Remove a driver from agency
export async function removeDriver(
    agencyId: string,
    driverId: string,
    ownerId: string
): Promise<{ success: boolean; error?: string }> {
    const agency = await getAgency(agencyId);

    if (!agency) {
        return { success: false, error: 'Agency not found.' };
    }

    if (agency.ownerId !== ownerId) {
        return { success: false, error: 'Only the agency owner can remove drivers.' };
    }

    // Remove from drivers list
    await updateDoc(doc(db, 'agencies', agencyId), {
        drivers: arrayRemove(driverId),
        updatedAt: serverTimestamp(),
    });

    // Reset driver's profile to individual
    await updateDoc(doc(db, 'users', driverId), {
        collectorType: 'individual',
        agencyId: null,
        isApproved: true,
        updatedAt: serverTimestamp(),
    });

    return { success: true };
}

// Get all drivers for an agency
export async function getAgencyDrivers(agencyId: string): Promise<Collector[]> {
    const agency = await getAgency(agencyId);

    if (!agency || agency.drivers.length === 0) {
        return [];
    }

    const drivers: Collector[] = [];

    for (const driverId of agency.drivers) {
        const driverDoc = await getDoc(doc(db, 'users', driverId));
        if (driverDoc.exists()) {
            const data = driverDoc.data();
            drivers.push({
                id: driverDoc.id,
                email: data.email,
                name: data.name,
                phone: data.phone,
                role: 'collector',
                collectorType: 'agency_driver',
                agencyId: agencyId,
                wasteTypesHandled: data.wasteTypesHandled || [],
                isAvailable: data.isAvailable ?? false,
                isApproved: data.isApproved ?? true,
                currentLocation: data.currentLocation,
                rating: data.rating || 0,
                totalPickups: data.totalPickups || 0,
                earnings: data.earnings || 0,
                vehicleType: data.vehicleType,
                maxCapacity: data.maxCapacity,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            });
        }
    }

    return drivers;
}

// Get pending driver requests for an agency
export async function getPendingDrivers(agencyId: string): Promise<Collector[]> {
    const agency = await getAgency(agencyId);

    if (!agency || agency.pendingDrivers.length === 0) {
        return [];
    }

    const drivers: Collector[] = [];

    for (const driverId of agency.pendingDrivers) {
        const driverDoc = await getDoc(doc(db, 'users', driverId));
        if (driverDoc.exists()) {
            const data = driverDoc.data();
            drivers.push({
                id: driverDoc.id,
                email: data.email,
                name: data.name,
                phone: data.phone,
                role: 'collector',
                collectorType: 'agency_driver',
                agencyId: agencyId,
                wasteTypesHandled: data.wasteTypesHandled || [],
                isAvailable: false,
                isApproved: false,
                currentLocation: data.currentLocation,
                rating: data.rating || 0,
                totalPickups: data.totalPickups || 0,
                earnings: data.earnings || 0,
                vehicleType: data.vehicleType,
                maxCapacity: data.maxCapacity,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            });
        }
    }

    return drivers;
}

// =====================================
// AGENCY WALLET/EARNINGS
// =====================================

// Credit agency wallet (from completed jobs)
export async function creditAgencyWallet(
    agencyId: string,
    amount: number,
    description: string,
    requestId?: string
): Promise<void> {
    const walletRef = doc(db, 'wallets', agencyId);
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
            type: 'agency',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    // Record transaction
    const transRef = doc(collection(db, 'walletTransactions'));
    await setDoc(transRef, {
        walletId: agencyId,
        walletType: 'agency',
        type: 'credit',
        amount,
        description,
        requestId,
        balanceAfter: newBalance,
        createdAt: serverTimestamp(),
    });

    // Update agency total earnings
    await updateDoc(doc(db, 'agencies', agencyId), {
        totalEarnings: (await getAgency(agencyId))?.totalEarnings || 0 + amount,
        walletBalance: newBalance,
        updatedAt: serverTimestamp(),
    });
}

// Get agency wallet balance
export async function getAgencyWalletBalance(agencyId: string): Promise<number> {
    const walletDoc = await getDoc(doc(db, 'wallets', agencyId));
    return walletDoc.exists() ? walletDoc.data().balance || 0 : 0;
}
