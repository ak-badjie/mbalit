'use client';

/**
 * User-Agency relationship management
 * Allows users to save preferred agencies for waste collection
 */

import {
    doc,
    updateDoc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';

export interface AgencyListing {
    id: string;
    name: string;
    ownerId: string;
    rating: number;
    totalPickups: number;
    driversCount: number;
    isActive: boolean;
    description?: string;
    serviceAreas?: string[];
    createdAt: Date;
}

/**
 * Get all active agencies
 */
export async function getAllAgencies(): Promise<AgencyListing[]> {
    const agenciesRef = collection(db, 'agencies');
    const q = query(agenciesRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);

    const agencies: AgencyListing[] = [];
    snapshot.forEach((doc) => {
        const data = doc.data();
        agencies.push({
            id: doc.id,
            name: data.name,
            ownerId: data.ownerId,
            rating: data.rating || 0,
            totalPickups: data.totalPickups || 0,
            driversCount: data.drivers?.length || 0,
            isActive: data.isActive,
            description: data.description,
            serviceAreas: data.serviceAreas,
            createdAt: data.createdAt?.toDate() || new Date(),
        });
    });

    return agencies;
}

/**
 * Get user's preferred agencies
 */
export async function getUserPreferredAgencies(userId: string): Promise<string[]> {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return [];

    return userDoc.data()?.preferredAgencies || [];
}

/**
 * Add agency to user's preferred list
 */
export async function addAgencyToPreferred(userId: string, agencyId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        preferredAgencies: arrayUnion(agencyId)
    });
}

/**
 * Remove agency from user's preferred list
 */
export async function removeAgencyFromPreferred(userId: string, agencyId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        preferredAgencies: arrayRemove(agencyId)
    });
}

/**
 * Get agency details by ID
 */
export async function getAgencyById(agencyId: string): Promise<AgencyListing | null> {
    const agencyRef = doc(db, 'agencies', agencyId);
    const agencyDoc = await getDoc(agencyRef);

    if (!agencyDoc.exists()) return null;

    const data = agencyDoc.data();
    return {
        id: agencyDoc.id,
        name: data.name,
        ownerId: data.ownerId,
        rating: data.rating || 0,
        totalPickups: data.totalPickups || 0,
        driversCount: data.drivers?.length || 0,
        isActive: data.isActive,
        description: data.description,
        serviceAreas: data.serviceAreas,
        createdAt: data.createdAt?.toDate() || new Date(),
    };
}

/**
 * Get multiple agencies by IDs
 */
export async function getAgenciesByIds(agencyIds: string[]): Promise<AgencyListing[]> {
    if (agencyIds.length === 0) return [];

    const agencies: AgencyListing[] = [];

    // Firestore doesn't support array queries > 10, so batch if needed
    for (const agencyId of agencyIds) {
        const agency = await getAgencyById(agencyId);
        if (agency) agencies.push(agency);
    }

    return agencies;
}
