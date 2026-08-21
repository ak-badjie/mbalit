'use client';

/**
 * Mbalit auth context — Firebase-Auth-FREE.
 *
 * The app uses ONLY Firestore + Realtime Database. PINs are hashed with
 * bcryptjs in the browser and stored on the user document as `pinHash`. The
 * signed-in user id is persisted in `localStorage` so the session survives
 * page reloads. PIN reset is support-assisted (a referenceCode is written to
 * `pinResetRequests`; support clears it manually).
 *
 * SECURITY TRADEOFF
 * -----------------
 * Without Firebase Auth there is no `request.auth.uid` for Firestore Security
 * Rules to key on. The Firestore rules must permit the necessary client
 * reads/writes directly. Anyone who can read the `users` collection can see
 * the bcrypt `pinHash` and brute-force a 6-digit PIN offline. This is the
 * unavoidable consequence of the "Firestore + RTDB only" architecture and is
 * documented so future maintainers understand why the bcrypt cost factor and
 * PIN length cannot harden it past a determined attacker.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    collection,
    where,
    orderBy,
    limit,
    serverTimestamp,
    onSnapshot,
    Timestamp,
    addDoc,
    deleteDoc,
    updateDoc,
    writeBatch,
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { db } from './firebase';
import { removeBiometric } from './biometric';
import { normalizeOrgCode } from './org-code';
import { User, WasteType, Collector } from '@/types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    createAccount: (phone: string, pin: string) => Promise<string>;
    completeProfile: (uid: string, phone: string, pin: string, roleData: any) => Promise<void>;
    login: (phone: string, pin: string) => Promise<string>;
    /**
     * Verify the current signed-in user's PIN — used by the lock screen on
     * returning visits to the PWA. Does NOT mint a new session; just checks
     * the hash against the user doc's pinHash.
     */
    verifyPin: (pin: string) => Promise<boolean>;
    checkPhoneExists: (phone: string) => Promise<boolean>;
    checkOrgCode: (orgCode: string) => Promise<boolean>;
    changePin: (oldPin: string, newPin: string) => Promise<void>;
    /**
     * Replace the PIN WITHOUT asking for the old one. Only permitted while
     * the account is flagged `mustChangePin` — i.e. the user just signed in
     * with the temporary PIN their admin issued, so re-typing it would be
     * pure friction. Clears the flag on success.
     */
    completeForcedPinChange: (newPin: string) => Promise<void>;
    requestPinReset: (phone: string) => Promise<{ referenceCode: string }>;
    /**
     * Destructive — wipes the user's Firestore footprint and signs them out.
     * Requires the current PIN as confirmation. See implementation comment
     * for what gets deleted vs deactivated.
     */
    deleteAccount: (pin: string) => Promise<void>;
    logout: () => Promise<void>;
    updateCollectorWasteTypes: (wasteTypes: WasteType[]) => Promise<void>;
    setCollectorAvailability: (available: boolean) => Promise<void>;
}

const UNLOCKED_SESSION_KEY = 'mbalit_unlocked';
// Same-tab `sessionStorage` writes don't fire a 'storage' event, so PinLock
// can't observe them unless we emit a custom event manually. Listeners on
// 'mbalit-unlock-changed' resync from sessionStorage when this fires.
const emitUnlockChange = () => {
    if (typeof window === 'undefined') return;
    try { window.dispatchEvent(new Event('mbalit-unlock-changed')); } catch { /* noop */ }
};
const markUnlocked = () => {
    if (typeof window === 'undefined') return;
    try { window.sessionStorage.setItem(UNLOCKED_SESSION_KEY, '1'); } catch { /* noop */ }
    emitUnlockChange();
};
const clearUnlocked = () => {
    if (typeof window === 'undefined') return;
    try { window.sessionStorage.removeItem(UNLOCKED_SESSION_KEY); } catch { /* noop */ }
    emitUnlockChange();
};

const AuthContext = createContext<AuthContextType | null>(null);

const UID_STORAGE_KEY = 'mbalit_uid';
const BCRYPT_COST = 10;

// Pin reset throttle (client-side; defense-in-depth only).
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const MAX_RESETS_PER_WEEK = 3;

function readStoredUid(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage.getItem(UID_STORAGE_KEY);
    } catch {
        return null;
    }
}

function writeStoredUid(uid: string | null) {
    if (typeof window === 'undefined') return;
    try {
        if (uid) window.localStorage.setItem(UID_STORAGE_KEY, uid);
        else window.localStorage.removeItem(UID_STORAGE_KEY);
    } catch {
        /* storage may be disabled — non-fatal */
    }
}

function mapUserDoc(userId: string, data: any): User {
    return {
        ...data,
        id: userId,
        email: data.email || '',
        name: data.name || '',
        phone: data.phone || '',
        role: data.role || 'user',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as User;
}

function makeReferenceCode(): string {
    const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    return `R-${seg()}-${seg()}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [uid, setUid] = useState<string | null>(() => readStoredUid());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!uid) {
            setUser(null);
            setIsLoading(false);
            return;
        }
        const unsub = onSnapshot(
            doc(db, 'users', uid),
            (snap) => {
                if (snap.exists()) {
                    setUser(mapUserDoc(uid, snap.data()));
                } else {
                    writeStoredUid(null);
                    setUid(null);
                    setUser(null);
                }
                setIsLoading(false);
            },
            (err) => {
                console.error('User doc subscription error:', err);
                setIsLoading(false);
            },
        );
        return () => unsub();
    }, [uid]);

    const checkPhoneExists = async (phone: string): Promise<boolean> => {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('phone', '==', phone));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    };

    const checkOrgCode = async (orgCode: string): Promise<boolean> => {
        const normalized = normalizeOrgCode(orgCode);
        if (!normalized) return false;
        try {
            // Codes are stored normalised (upper-case, no separators), so a
            // user typing "cfs 482" still resolves. The raw fallback keeps
            // any legacy lower-case-hyphen code working.
            const orgDoc = await getDoc(doc(db, 'organizations', normalized));
            if (orgDoc.exists()) return true;
            if (orgCode !== normalized) {
                const legacy = await getDoc(doc(db, 'organizations', orgCode));
                return legacy.exists();
            }
            return false;
        } catch (error) {
            console.error('Error checking org code:', error);
            return false;
        }
    };

    const createAccount = async (phone: string, pin: string): Promise<string> => {
        if (!/^\d{6}$/.test(pin)) {
            throw new Error('PIN must be exactly 6 digits.');
        }
        setIsLoading(true);
        try {
            const exists = await checkPhoneExists(phone);
            if (exists) {
                throw new Error('An account with this phone already exists. Please sign in instead.');
            }

            const pinHash = await bcrypt.hash(pin, BCRYPT_COST);
            const newRef = doc(collection(db, 'users'));
            await setDoc(newRef, {
                id: newRef.id,
                phone,
                pinHash,
                onboardingComplete: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            writeStoredUid(newRef.id);
            markUnlocked();
            setUid(newRef.id);
            return newRef.id;
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    const completeProfile = async (
        targetUid: string,
        phone: string,
        _pin: string,
        roleData: any,
    ): Promise<void> => {
        setIsLoading(true);
        try {
            const userData = {
                phone,
                onboardingComplete: true,
                updatedAt: serverTimestamp(),
                ...roleData,
            };
            await setDoc(doc(db, 'users', targetUid), userData, { merge: true });
        } catch (error) {
            console.error('Profile update error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (phone: string, pin: string): Promise<string> => {
        if (!/^\d{6}$/.test(pin)) {
            throw new Error('Phone number or PIN is incorrect.');
        }
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('phone', '==', phone), limit(1));
            const snap = await getDocs(q);
            if (snap.empty) {
                throw new Error('Phone number or PIN is incorrect.');
            }
            const userDoc = snap.docs[0]!;
            const data = userDoc.data() as { pinHash?: string };
            if (!data.pinHash) {
                throw new Error('This account is not fully set up. Please reset your PIN to continue.');
            }
            const ok = await bcrypt.compare(pin, data.pinHash);
            if (!ok) {
                throw new Error('Phone number or PIN is incorrect.');
            }
            writeStoredUid(userDoc.id);
            markUnlocked();
            setUid(userDoc.id);
            return userDoc.id;
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    const changePin = async (oldPin: string, newPin: string) => {
        if (!user) throw new Error('No user logged in');
        if (!/^\d{6}$/.test(newPin)) {
            throw new Error('PIN must be exactly 6 digits.');
        }
        const userRef = doc(db, 'users', user.id);
        const snap = await getDoc(userRef);
        if (!snap.exists()) throw new Error('Account not found.');
        const data = snap.data() as { pinHash?: string };
        const ok = data.pinHash ? await bcrypt.compare(oldPin, data.pinHash) : false;
        if (!ok) {
            throw new Error('old-pin-incorrect');
        }
        const pinHash = await bcrypt.hash(newPin, BCRYPT_COST);
        await setDoc(
            userRef,
            { pinHash, mustChangePin: false, updatedAt: serverTimestamp() },
            { merge: true },
        );
    };

    const completeForcedPinChange = async (newPin: string) => {
        if (!user) throw new Error('No user signed in.');
        if (!/^\d{6}$/.test(newPin)) {
            throw new Error('PIN must be exactly 6 digits.');
        }
        const userRef = doc(db, 'users', user.id);
        const snap = await getDoc(userRef);
        if (!snap.exists()) throw new Error('Account not found.');
        const data = snap.data() as { mustChangePin?: boolean; pinHash?: string };
        // Guard against this being reachable outside the forced flow — it is
        // the one path that sets a PIN without proving knowledge of the old one.
        if (data.mustChangePin !== true) {
            throw new Error('This account does not need to change its PIN.');
        }
        if (data.pinHash && (await bcrypt.compare(newPin, data.pinHash))) {
            throw new Error('Please choose a PIN different from the temporary one.');
        }
        const pinHash = await bcrypt.hash(newPin, BCRYPT_COST);
        await setDoc(
            userRef,
            { pinHash, mustChangePin: false, updatedAt: serverTimestamp() },
            { merge: true },
        );
        markUnlocked();
    };

    const requestPinReset = async (phone: string): Promise<{ referenceCode: string }> => {
        const requestsCol = collection(db, 'pinResetRequests');
        const sevenDaysAgo = Timestamp.fromMillis(Date.now() - SEVEN_DAYS_MS);

        try {
            const recentSnap = await getDocs(
                query(
                    requestsCol,
                    where('phone', '==', phone),
                    where('createdAt', '>=', sevenDaysAgo),
                    orderBy('createdAt', 'desc'),
                    limit(10),
                ),
            );
            const recent = recentSnap.docs.map((d) =>
                d.data() as { status?: string; createdAt?: Timestamp },
            );
            const pending = recent.find((r) => r.status === 'pending');
            if (pending && pending.createdAt && Date.now() - pending.createdAt.toMillis() < ONE_DAY_MS) {
                throw new Error(
                    'A reset request is already in progress for this number. Please wait for our team to contact you.',
                );
            }
            if (recent.length >= MAX_RESETS_PER_WEEK) {
                throw new Error(
                    'Too many reset attempts for this number this week. Please contact support directly.',
                );
            }
        } catch (err) {
            if (err instanceof Error && /reset|attempt|progress/i.test(err.message)) {
                throw err;
            }
            console.warn('PIN reset throttle lookup failed (continuing):', err);
        }

        let userId: string | null = null;
        try {
            const usersSnap = await getDocs(
                query(collection(db, 'users'), where('phone', '==', phone), limit(1)),
            );
            if (!usersSnap.empty) userId = usersSnap.docs[0]!.id;
        } catch (err) {
            console.warn('User lookup during pin reset failed:', err);
        }

        const referenceCode = makeReferenceCode();
        try {
            const reqRef = await addDoc(requestsCol, {
                phone,
                userId,
                accountExists: !!userId,
                referenceCode,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                source: 'web-client',
            });
            await addDoc(collection(db, 'pinResetAuditLog'), {
                event: 'pin_reset_requested',
                requestId: reqRef.id,
                referenceCode,
                phone,
                userId,
                accountExists: !!userId,
                createdAt: serverTimestamp(),
                source: 'web-client',
            });
        } catch (err) {
            console.error('Could not record PIN reset request:', err);
            throw new Error('Could not start a reset right now. Please try again in a moment.');
        }

        return { referenceCode };
    };

    /**
     * Wipe the user's entire footprint and sign them out.
     *
     * Deletes outright:
     *   - users/{uid}
     *   - collectorProfiles/{uid}
     *   - wallets/{uid}
     *   - collectorStats/{uid}
     *   - collectorSettings/{uid}
     *   - any walletTransactions / notifications keyed to this user
     *     (best-effort; we batch the first 100 of each)
     *
     * Deactivates rather than deletes:
     *   - organizations/{orgCode} where the user is the owner — flipping
     *     isActive:false so existing members + finished jobs stay coherent.
     *
     * Anything not in those collections (completed jobs in RTDB, payment
     * records, reviews left for other collectors) is intentionally kept so
     * historical data stays consistent for the other party. Server-side
     * cleanup of those should run as a background job.
     *
     * Requires the user to re-enter their PIN as a confirmation step.
     */
    const deleteAccount = async (pin: string): Promise<void> => {
        if (!user) throw new Error('No user signed in.');
        const ok = await verifyPin(pin);
        if (!ok) throw new Error('PIN is incorrect — account NOT deleted.');

        const uid = user.id;

        // 1. Deactivate any org owned by this user (don't hard-delete: members
        //    still reference it).
        try {
            const ownedOrgsSnap = await getDocs(
                query(collection(db, 'organizations'), where('ownerId', '==', uid))
            );
            for (const orgDoc of ownedOrgsSnap.docs) {
                try {
                    await updateDoc(orgDoc.ref, {
                        isActive: false,
                        deletedOwnerId: uid,
                        deletedAt: serverTimestamp(),
                    });
                } catch (err) {
                    console.warn('Could not deactivate org', orgDoc.id, err);
                }
            }
        } catch (err) {
            console.warn('Owned-orgs lookup failed during delete:', err);
        }

        // 2. Best-effort wipe of related rows. Batched for atomicity per batch.
        const collectionsToScan: Array<{ name: string; field: string }> = [
            { name: 'walletTransactions', field: 'walletId' },
            { name: 'notifications', field: 'userId' },
            { name: 'pinResetRequests', field: 'userId' },
        ];
        for (const c of collectionsToScan) {
            try {
                const snap = await getDocs(
                    query(collection(db, c.name), where(c.field, '==', uid), limit(100))
                );
                if (snap.empty) continue;
                const batch = writeBatch(db);
                snap.docs.forEach((d) => batch.delete(d.ref));
                await batch.commit();
            } catch (err) {
                console.warn(`Could not wipe ${c.name} for ${uid}:`, err);
            }
        }

        // 3. Delete the per-user singletons.
        const singletons = ['wallets', 'collectorStats', 'collectorSettings', 'collectorProfiles'];
        for (const col of singletons) {
            try { await deleteDoc(doc(db, col, uid)); } catch { /* noop */ }
        }

        // 4. Finally drop the user doc itself. After this point the onSnapshot
        //    listener will fire with snap.exists()===false which clears the
        //    in-memory state anyway, but we explicitly log out so the lock
        //    flag + stored uid are cleared in one go.
        try { await deleteDoc(doc(db, 'users', uid)); } catch (err) {
            console.error('User doc delete failed:', err);
            throw new Error('Account could not be fully deleted. Please contact support.');
        }

        // 5. Clean up local biometric credential + session state.
        try { removeBiometric(uid); } catch { /* noop */ }
        writeStoredUid(null);
        clearUnlocked();
        setUid(null);
        setUser(null);
    };

    const logout = async () => {
        writeStoredUid(null);
        clearUnlocked();
        setUid(null);
        setUser(null);
    };

    /**
     * Verify the signed-in user's PIN against their stored bcrypt hash.
     * Marks the current session as unlocked on success. Used by the lock screen.
     */
    const verifyPin = async (pin: string): Promise<boolean> => {
        if (!user) throw new Error('No user signed in.');
        if (!/^\d{6}$/.test(pin)) return false;
        const snap = await getDoc(doc(db, 'users', user.id));
        if (!snap.exists()) return false;
        const data = snap.data() as { pinHash?: string };
        if (!data.pinHash) return false;
        const ok = await bcrypt.compare(pin, data.pinHash);
        if (ok) markUnlocked();
        return ok;
    };

    const updateCollectorWasteTypes = async (wasteTypes: WasteType[]) => {
        if (!user) return;
        try {
            await setDoc(
                doc(db, 'users', user.id),
                { wasteTypesHandled: wasteTypes, updatedAt: serverTimestamp() },
                { merge: true }
            );
            setUser((prev) => prev ? { ...prev, wasteTypesHandled: wasteTypes } as Collector : null);
        } catch (error) {
            console.error('Error updating waste types:', error);
            throw error;
        }
    };

    const setCollectorAvailability = async (available: boolean) => {
        if (!user) return;
        try {
            await setDoc(
                doc(db, 'users', user.id),
                { isAvailable: available, updatedAt: serverTimestamp() },
                { merge: true }
            );
            setUser((prev) => prev ? { ...prev, isAvailable: available } as Collector : null);
        } catch (error) {
            console.error('Error updating availability:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                createAccount,
                completeProfile,
                login,
                verifyPin,
                checkPhoneExists,
                checkOrgCode,
                changePin,
                completeForcedPinChange,
                requestPinReset,
                deleteAccount,
                logout,
                updateCollectorWasteTypes,
                setCollectorAvailability,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function useRequireAuth(redirectTo: string = '/auth') {
    const context = useAuth();
    const router = require('next/navigation').useRouter();
    React.useEffect(() => {
        if (!context.isLoading && !context.user) {
            router.push(redirectTo);
        }
    }, [context.user, context.isLoading, router, redirectTo]);
    return context;
}
