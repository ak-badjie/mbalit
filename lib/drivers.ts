/**
 * Admin-created driver accounts.
 *
 * Drivers do NOT sign themselves up. The organization admin creates the
 * account here — name, phone, temporary PIN — and hands those two credentials
 * to the driver verbally or on paper. The driver then signs in on the normal
 * Log In screen (phone + PIN, same as everyone else) and is forced to replace
 * the temporary PIN before they can use the app.
 *
 * Everything the driver would otherwise have been asked during signup — waste
 * types, organization membership, approval — is inherited from the
 * organization at creation time, so there is nothing left for them to fill in.
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { db } from './firebase';
import { WasteType } from '@/types';

const BCRYPT_COST = 10;

/** A random 6-digit PIN, suggested to the admin and editable before saving. */
export function generateTempPin(): string {
    let pin = '';
    for (let i = 0; i < 6; i++) pin += Math.floor(Math.random() * 10);
    return pin;
}

export interface CreateDriverInput {
    orgCode: string;
    orgName: string;
    ownerId: string;
    name: string;
    /** Canonical full phone, e.g. "+220 744 10 29" — see lib/phone.ts. */
    phone: string;
    /** Exactly 6 digits. The driver must change it on first sign-in. */
    tempPin: string;
    /** Waste types the organization handles; the driver inherits these. */
    wasteTypesHandled?: WasteType[];
}

/**
 * Create a ready-to-use driver account under an organization.
 *
 * Returns the new user id. Throws with a user-facing message if the phone is
 * already registered or the PIN isn't 6 digits.
 */
export async function createDriverAccount(input: CreateDriverInput): Promise<string> {
    const { orgCode, orgName, ownerId, name, phone, tempPin } = input;

    if (!/^\d{6}$/.test(tempPin)) {
        throw new Error('The temporary PIN must be exactly 6 digits.');
    }
    if (!phone || phone.trim().length < 6) {
        throw new Error('Please enter the driver’s phone number.');
    }
    if (!name.trim()) {
        throw new Error('Please enter the driver’s name.');
    }

    // Phone is the login identity — it has to be unique across every account
    // type, not just within this organization.
    const existing = await getDocs(
        query(collection(db, 'users'), where('phone', '==', phone), limit(1)),
    );
    if (!existing.empty) {
        throw new Error('That phone number already has an MBalit account.');
    }

    // Fall back to the org document's waste types, then the owner's, so a
    // driver is never created with an empty list (which would hide jobs).
    let wasteTypesHandled = input.wasteTypesHandled;
    if (!wasteTypesHandled || wasteTypesHandled.length === 0) {
        try {
            const orgSnap = await getDoc(doc(db, 'organizations', orgCode));
            wasteTypesHandled = (orgSnap.data()?.wasteTypesHandled || []) as WasteType[];
        } catch {
            wasteTypesHandled = [];
        }
    }
    if (!wasteTypesHandled || wasteTypesHandled.length === 0) {
        try {
            const ownerSnap = await getDoc(doc(db, 'users', ownerId));
            wasteTypesHandled = (ownerSnap.data()?.wasteTypesHandled || []) as WasteType[];
        } catch {
            wasteTypesHandled = [];
        }
    }

    const pinHash = await bcrypt.hash(tempPin, BCRYPT_COST);
    const driverRef = doc(collection(db, 'users'));

    await setDoc(driverRef, {
        id: driverRef.id,
        name: name.trim(),
        phone,
        pinHash,
        // Forces the change-PIN gate on first sign-in.
        mustChangePin: true,
        role: 'collector',
        accountSubtype: 'driver',
        collectorType: 'organization_member',
        organizationId: orgCode,
        organizationName: orgName,
        // Admin-created, so already vetted — no pending-approval limbo.
        isApproved: true,
        isAvailable: false,
        wasteTypesHandled,
        vehicleType: 'motorcycle',
        rating: 0,
        totalPickups: 0,
        earnings: 0,
        // Nothing left for the driver to fill in.
        onboardingComplete: true,
        createdByAdmin: ownerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Mirror into collectorProfiles so the team detail screen has something
    // to read (it renders vehicle, waste types and verification status).
    await setDoc(doc(db, 'collectorProfiles', driverRef.id), {
        displayName: name.trim(),
        bio: '',
        profileImage: '',
        phone,
        vehicleType: 'motorcycle',
        wasteTypesHandled,
        collectorType: 'organization_member',
        organizationId: orgCode,
        organizationName: orgName,
        isVerified: false,
        documentsSubmitted: false,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    }, { merge: true });

    // Add to the organization's approved member list.
    const orgRef = doc(db, 'organizations', orgCode);
    const orgSnap = await getDoc(orgRef);
    const members: string[] = orgSnap.exists() ? (orgSnap.data().members || []) : [];
    await updateDoc(orgRef, {
        members: [...members, driverRef.id],
        updatedAt: serverTimestamp(),
    });

    return driverRef.id;
}
