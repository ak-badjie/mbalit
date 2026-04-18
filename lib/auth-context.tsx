'use client';

/**
 * Mbalit auth context — Firebase Auth FREE, fully client-side.
 *
 * The app intentionally uses ONLY Firestore + Realtime Database (no Firebase
 * Auth, no Cloud Storage, no admin service account). PINs are hashed with
 * bcryptjs in the browser and stored on the user document as `pinHash`. The
 * "logged-in" user id is persisted in `localStorage` so the session survives
 * page reloads.
 *
 * SECURITY TRADEOFF
 * -----------------
 * Without Firebase Auth there is no `request.auth.uid` for Firestore Security
 * Rules to key on. The Firestore rules must permit the necessary client
 * reads/writes directly. Anyone who can read the `users` collection can see
 * the bcrypt `pinHash` and brute-force a 6-digit PIN offline. This is the
 * unavoidable consequence of the user-mandated "Firestore + RTDB only,
 * no service account" architecture; it is documented here so future
 * maintainers understand why the bcrypt cost factor and PIN length cannot
 * harden it past a determined attacker. The right long-term fix is to
 * obtain a Firebase Admin service account and move PIN verification + report
 * fan-out behind authenticated API routes.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    verifyPasswordResetCode,
    confirmPasswordReset,
    type ActionCodeSettings,
} from 'firebase/auth';
import { db, auth } from './firebase';
import { User, WasteType, Collector } from '@/types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    createAccount: (phone: string, pin: string) => Promise<string>;
    completeProfile: (uid: string, phone: string, pin: string, roleData: any) => Promise<void>;
    login: (phone: string, pin: string) => Promise<string>;
    checkPhoneExists: (phone: string) => Promise<boolean>;
    checkOrgCode: (orgCode: string) => Promise<boolean>;
    changePin: (oldPin: string, newPin: string) => Promise<void>;
    requestPinReset: (phone: string) => Promise<{ referenceCode: string }>;
    // Recovery email (self-service PIN reset via Firebase Auth email link)
    addRecoveryEmail: (email: string) => Promise<void>;
    resendRecoveryEmailVerification: () => Promise<void>;
    removeRecoveryEmail: () => Promise<void>;
    lookupRecoveryEmailForPhone: (phone: string) => Promise<{ email: string; verified: boolean } | null>;
    sendPinResetEmail: (phone: string) => Promise<{ email: string }>;
    verifyRecoveryActionCode: (oobCode: string) => Promise<{ email: string }>;
    completeRecoveryEmailVerification: (oobCode: string) => Promise<void>;
    completePinResetWithCode: (oobCode: string, newPin: string) => Promise<{ uid: string }>;
    logout: () => Promise<void>;
    updateCollectorWasteTypes: (wasteTypes: WasteType[]) => Promise<void>;
    setCollectorAvailability: (available: boolean) => Promise<void>;
}

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
    // Spread `data` FIRST, then layer the explicit fields on top. The previous
    // ordering ran the spread last, which overwrote the converted Date objects
    // with raw Firestore Timestamps and could resurrect stale field values.
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

    /**
     * Subscribe to the user doc whenever we know our uid, so role / availability
     * / onboarding flags propagate live without a manual refetch. If the
     * stored uid points at a deleted account, we clean up and sign out.
     */
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
                    // Stale uid (account deleted) — clear it.
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
        // Intentionally does NOT swallow errors — callers must distinguish
        // "no account exists" from "lookup failed" so a network/permission
        // error never misroutes a real user toward signup.
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('phone', '==', phone));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    };

    const checkOrgCode = async (orgCode: string): Promise<boolean> => {
        try {
            const orgDoc = await getDoc(doc(db, 'organizations', orgCode));
            return orgDoc.exists();
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
            // Hard-fail if a user with this phone already exists, so we never
            // shadow-create a duplicate (which would leave the original PIN
            // strandable and confuse the login lookup).
            const exists = await checkPhoneExists(phone);
            if (exists) {
                throw new Error('An account with this phone already exists. Please sign in instead.');
            }

            const pinHash = await bcrypt.hash(pin, BCRYPT_COST);
            // Use the standard Firestore "doc(collection)" trick to mint a
            // collision-resistant 20-char id WITHOUT writing yet, so we can
            // hand the same id to the snapshot listener.
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
            setUid(newRef.id);
            return newRef.id;
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
        // Note: not clearing isLoading on success — the user-doc subscription
        // effect will flip it once the snapshot arrives, preventing a flash
        // of the signed-out state.
    };

    const completeProfile = async (
        targetUid: string,
        phone: string,
        _pin: string,
        roleData: any,
    ): Promise<void> => {
        // The PIN is intentionally NOT written here — it is already hashed and
        // stored by createAccount. Writing it again as plaintext would defeat
        // the bcrypt protection.
        setIsLoading(true);
        try {
            const userData = {
                phone,
                onboardingComplete: true,
                updatedAt: serverTimestamp(),
                ...roleData,
            };
            await setDoc(doc(db, 'users', targetUid), userData, { merge: true });
            // The snapshot listener will refresh `user` automatically.
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
            // Stable error code the change-pin dialog UI checks for.
            throw new Error('old-pin-incorrect');
        }
        const pinHash = await bcrypt.hash(newPin, BCRYPT_COST);
        await setDoc(userRef, { pinHash, updatedAt: serverTimestamp() }, { merge: true });
    };

    const requestPinReset = async (phone: string): Promise<{ referenceCode: string }> => {
        // Best-effort throttle on the client. A determined attacker can bypass
        // this; we still write every attempt to `pinResetAuditLog` so support
        // can spot abuse after the fact.
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
            // Re-throw user-facing throttle messages; swallow lookup-only failures
            // so a broken index doesn't block a legitimate reset request.
            if (err instanceof Error && /reset|attempt|progress/i.test(err.message)) {
                throw err;
            }
            console.warn('PIN reset throttle lookup failed (continuing):', err);
        }

        // Look up the user (we still write the request when no account exists,
        // to avoid leaking which numbers are registered).
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

    // ──────────────────────────────────────────────────────────────────────
    // RECOVERY EMAIL (self-service PIN reset via Firebase Auth)
    // ──────────────────────────────────────────────────────────────────────
    //
    // Architecture note: PIN auth itself is still phone+bcrypt in Firestore
    // (see top-of-file SECURITY TRADEOFF). Firebase Auth is used here ONLY
    // as a verified email factor: when the user attaches a recovery email we
    // create (or reuse) a Firebase Auth account with a random throwaway
    // password and immediately send a `sendPasswordResetEmail` link. The act
    // of completing that email link (which proves email ownership) marks the
    // recovery email as verified on the user doc. The same `sendPasswordResetEmail`
    // primitive is later used for the actual PIN-reset flow — the action
    // handler page (/auth/email-action) calls verifyPasswordResetCode to
    // confirm ownership, then collects a new 6-digit PIN and writes the
    // bcrypt hash back to the Firestore user doc. We immediately invalidate
    // the oobCode by calling confirmPasswordReset with another random
    // password (the Auth password is never user-facing).
    //
    // The email link's continueUrl carries `mode=verify-recovery` or
    // `mode=reset-pin` so the action handler can branch.

    const ACTION_HANDLER_PATH = '/auth/email-action';

    const buildActionCodeSettings = (mode: 'verify-recovery' | 'reset-pin'): ActionCodeSettings => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return {
            url: `${origin}${ACTION_HANDLER_PATH}?intent=${mode}`,
            handleCodeInApp: false,
        };
    };

    const randomPassword = () => {
        // Throwaway 32-char password — never shown, never reused.
        const bytes = new Uint8Array(24);
        if (typeof window !== 'undefined' && window.crypto) {
            window.crypto.getRandomValues(bytes);
        } else {
            for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        }
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('') + 'A1!';
    };

    const addRecoveryEmail = async (email: string): Promise<void> => {
        if (!user) throw new Error('You must be signed in to add a recovery email.');
        if (!auth) throw new Error('Auth not ready. Please try again.');
        const normalized = email.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
            throw new Error('Please enter a valid email address.');
        }

        // Make sure no other Mbalit user has already claimed this recovery
        // email. Fail-closed: if the duplicate-check query itself fails (bad
        // index, permissions, network), we refuse rather than risk attaching
        // the same recovery email to two accounts (which would make the later
        // email→user lookup in `findUserByRecoveryEmail` ambiguous and could
        // let one user reset another user's PIN).
        try {
            // Pull up to 2 matches so we can distinguish "none" from "only mine".
            const dupSnap = await getDocs(
                query(collection(db, 'users'), where('recoveryEmail', '==', normalized), limit(2)),
            );
            const other = dupSnap.docs.find((d) => d.id !== user.id);
            if (other) {
                throw new Error('This email is already linked to another account.');
            }
        } catch (err) {
            if (err instanceof Error && /already linked/.test(err.message)) throw err;
            console.error('Recovery email duplicate check failed (refusing):', err);
            throw new Error('Could not verify this email is unique. Please try again in a moment.');
        }

        // Try to create a Firebase Auth account with a throwaway password.
        // If the email is already registered in Firebase Auth (e.g. user
        // re-attaching after removing), fall through and just resend the
        // password-reset email — ownership is proven by clicking the link.
        let authUid: string | undefined;
        try {
            const cred = await createUserWithEmailAndPassword(auth, normalized, randomPassword());
            authUid = cred.user.uid;
            // Don't keep the user signed in to Firebase Auth — our session
            // model is the localStorage uid only.
            try { await auth.signOut(); } catch { /* non-fatal */ }
        } catch (err) {
            const code = (err as { code?: string })?.code || '';
            if (code === 'auth/email-already-in-use') {
                // Acceptable — the password-reset link still proves ownership.
                authUid = undefined;
            } else if (code === 'auth/invalid-email') {
                throw new Error('Please enter a valid email address.');
            } else if (code === 'auth/weak-password') {
                // Should never happen with our random password, but surface it.
                throw new Error('Could not set up recovery email. Please try again.');
            } else if (code === 'auth/operation-not-allowed') {
                throw new Error('Email recovery is not enabled. Please contact support.');
            } else {
                throw err;
            }
        }

        // Persist the (unverified) recovery email so the action handler can
        // map the email back to this user when the link is clicked.
        await setDoc(
            doc(db, 'users', user.id),
            {
                recoveryEmail: normalized,
                recoveryEmailVerified: false,
                ...(authUid ? { recoveryAuthUid: authUid } : {}),
                updatedAt: serverTimestamp(),
            },
            { merge: true },
        );

        // Send the verification email (Firebase Auth password-reset link with
        // our continueUrl tagging the intent).
        await sendPasswordResetEmail(auth, normalized, buildActionCodeSettings('verify-recovery'));
    };

    const resendRecoveryEmailVerification = async (): Promise<void> => {
        if (!user) throw new Error('You must be signed in.');
        if (!user.recoveryEmail) throw new Error('No recovery email on file.');
        if (!auth) throw new Error('Auth not ready. Please try again.');
        await sendPasswordResetEmail(auth, user.recoveryEmail, buildActionCodeSettings('verify-recovery'));
    };

    const removeRecoveryEmail = async (): Promise<void> => {
        if (!user) throw new Error('You must be signed in.');
        // Just unlink on the user doc. Deleting the underlying Firebase Auth
        // account requires the user to be signed in to Firebase Auth, which
        // we don't keep them in. Leaving the orphaned Auth row is harmless —
        // it can't be used to sign in to Mbalit and the user can re-attach
        // it later (the email-already-in-use branch above handles that).
        await setDoc(
            doc(db, 'users', user.id),
            {
                recoveryEmail: null,
                recoveryEmailVerified: false,
                recoveryAuthUid: null,
                updatedAt: serverTimestamp(),
            },
            { merge: true },
        );
    };

    const lookupRecoveryEmailForPhone = async (
        phone: string,
    ): Promise<{ email: string; verified: boolean } | null> => {
        try {
            const snap = await getDocs(query(collection(db, 'users'), where('phone', '==', phone), limit(1)));
            if (snap.empty) return null;
            const data = snap.docs[0]!.data() as { recoveryEmail?: string; recoveryEmailVerified?: boolean };
            if (!data.recoveryEmail) return null;
            return { email: data.recoveryEmail, verified: !!data.recoveryEmailVerified };
        } catch (err) {
            console.warn('Recovery-email lookup failed:', err);
            return null;
        }
    };

    const sendPinResetEmail = async (phone: string): Promise<{ email: string }> => {
        if (!auth) throw new Error('Auth not ready. Please try again.');
        const found = await lookupRecoveryEmailForPhone(phone);
        if (!found) {
            throw new Error('No recovery email is on file for this number.');
        }
        if (!found.verified) {
            throw new Error('Your recovery email is not verified yet. Please use the support-assisted reset.');
        }
        try {
            await sendPasswordResetEmail(auth, found.email, buildActionCodeSettings('reset-pin'));
        } catch (err) {
            const code = (err as { code?: string })?.code || '';
            if (code === 'auth/user-not-found') {
                // Out-of-sync: the Firestore doc says we have a recovery email
                // but Firebase Auth doesn't. Treat it as not-on-file so the
                // caller can fall back to the support flow.
                throw new Error('No recovery email is on file for this number.');
            }
            if (code === 'auth/too-many-requests') {
                throw new Error('Too many email reset attempts. Please wait a few minutes and try again.');
            }
            throw err;
        }
        return { email: found.email };
    };

    const verifyRecoveryActionCode = async (oobCode: string): Promise<{ email: string }> => {
        if (!auth) throw new Error('Auth not ready. Please try again.');
        const email = await verifyPasswordResetCode(auth, oobCode);
        return { email: email.toLowerCase() };
    };

    // Find the Mbalit user doc whose recoveryEmail matches the given email.
    // Returns a strictly-typed projection (only the fields we touch in the
    // recovery flows) so callers can't accidentally consume untrusted fields
    // from the user document under a different shape.
    type RecoveryUserRow = {
        id: string;
        phone: string;
        recoveryEmail: string;
        recoveryEmailVerified: boolean;
        recoveryAuthUid?: string;
    };
    const findUserByRecoveryEmail = async (email: string): Promise<RecoveryUserRow | null> => {
        const snap = await getDocs(
            query(collection(db, 'users'), where('recoveryEmail', '==', email.toLowerCase()), limit(1)),
        );
        if (snap.empty) return null;
        const docSnap = snap.docs[0]!;
        const raw = docSnap.data() as Partial<{
            phone: string;
            recoveryEmail: string;
            recoveryEmailVerified: boolean;
            recoveryAuthUid: string;
        }>;
        return {
            id: docSnap.id,
            phone: raw.phone || '',
            recoveryEmail: (raw.recoveryEmail || '').toLowerCase(),
            recoveryEmailVerified: !!raw.recoveryEmailVerified,
            recoveryAuthUid: raw.recoveryAuthUid,
        };
    };

    const completeRecoveryEmailVerification = async (oobCode: string): Promise<void> => {
        if (!auth) throw new Error('Auth not ready. Please try again.');
        const email = (await verifyPasswordResetCode(auth, oobCode)).toLowerCase();
        // Invalidate the code immediately by setting another random password.
        await confirmPasswordReset(auth, oobCode, randomPassword());

        const found = await findUserByRecoveryEmail(email);
        if (!found) {
            throw new Error('Could not find an Mbalit account linked to this email.');
        }
        await setDoc(
            doc(db, 'users', found.id),
            { recoveryEmailVerified: true, updatedAt: serverTimestamp() },
            { merge: true },
        );
    };

    const completePinResetWithCode = async (
        oobCode: string,
        newPin: string,
    ): Promise<{ uid: string }> => {
        if (!auth) throw new Error('Auth not ready. Please try again.');
        if (!/^\d{6}$/.test(newPin)) throw new Error('PIN must be exactly 6 digits.');

        const email = (await verifyPasswordResetCode(auth, oobCode)).toLowerCase();
        const found = await findUserByRecoveryEmail(email);
        if (!found) {
            throw new Error('Could not find an Mbalit account linked to this email.');
        }

        // Hash the new PIN BEFORE consuming the oobCode so a hash failure
        // doesn't burn the reset link.
        const pinHash = await bcrypt.hash(newPin, BCRYPT_COST);

        // Burn the reset code (it's single-use anyway, but make it explicit).
        await confirmPasswordReset(auth, oobCode, randomPassword());

        await setDoc(
            doc(db, 'users', found.id),
            {
                pinHash,
                // Verifying the email link also implicitly proves email
                // ownership again, so flip verified=true if it wasn't already.
                recoveryEmailVerified: true,
                updatedAt: serverTimestamp(),
            },
            { merge: true },
        );

        // Audit-log the self-service reset for parity with the support flow.
        try {
            await addDoc(collection(db, 'pinResetAuditLog'), {
                event: 'pin_reset_self_service',
                userId: found.id,
                phone: found.phone,
                method: 'recovery_email',
                createdAt: serverTimestamp(),
                source: 'web-client',
            });
        } catch (err) {
            console.warn('Could not write pin reset audit log:', err);
        }

        // Sign the user in (our localStorage-only session model).
        writeStoredUid(found.id);
        setUid(found.id);
        return { uid: found.id };
    };

    const logout = async () => {
        writeStoredUid(null);
        setUid(null);
        setUser(null);
        // Best-effort sign-out from Firebase Auth in case the user is in the
        // middle of a recovery flow (otherwise harmless).
        try { if (auth) await auth.signOut(); } catch { /* non-fatal */ }
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
                checkPhoneExists,
                checkOrgCode,
                changePin,
                requestPinReset,
                addRecoveryEmail,
                resendRecoveryEmailVerification,
                removeRecoveryEmail,
                lookupRecoveryEmailForPhone,
                sendPinResetEmail,
                verifyRecoveryActionCode,
                completeRecoveryEmailVerification,
                completePinResetWithCode,
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
