'use client';

/**
 * Mbalit auth context — Firebase Auth FREE.
 *
 * Authentication is handled by our own Next.js route handlers
 * (`/api/auth/{signup,login,logout,me,change-pin}`). The session token lives
 * in an HTTP-only cookie (`mbalit_session`), and the userId is mirrored to
 * `localStorage` so the React tree can subscribe to the Firestore user doc
 * for live profile updates without an extra round-trip on every page load.
 *
 * Firestore is still accessed directly from the browser for live data
 * (profile updates, lists, etc.). The Firestore security rules must allow
 * the appropriate reads without depending on `request.auth` — sensitive
 * writes go through API routes that re-verify the session.
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
    serverTimestamp,
    onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
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
    logout: () => Promise<void>;
    updateCollectorWasteTypes: (wasteTypes: WasteType[]) => Promise<void>;
    setCollectorAvailability: (available: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const UID_STORAGE_KEY = 'mbalit_uid';

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

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: any }> {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
    });
    let data: any = {};
    try {
        data = await res.json();
    } catch {
        /* tolerate empty body */
    }
    return { ok: res.ok, status: res.status, data };
}

function mapUserDoc(userId: string, data: any): User {
    return {
        id: userId,
        email: data.email || '',
        name: data.name || '',
        phone: data.phone || '',
        role: data.role || 'user',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        ...data,
    } as User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [uid, setUid] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Bootstrap: ask the server who we are. The cookie travels automatically
     * via `credentials: same-origin`. If the server says 401 we fall back to
     * a clean signed-out state and clear the local uid hint.
     */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
                if (cancelled) return;
                if (res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (data?.uid) {
                        writeStoredUid(data.uid);
                        setUid(data.uid);
                        return;
                    }
                }
                // Not authenticated according to the server — clear any stale hint.
                writeStoredUid(null);
                setUid(null);
                setUser(null);
                setIsLoading(false);
            } catch {
                // Network failure: leave the optimistic uid in place if we have one
                // so cached data still renders, but stop the spinner.
                if (cancelled) return;
                const cached = readStoredUid();
                if (cached) setUid(cached);
                setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    /**
     * Subscribe to the user doc once we know our uid, so role / availability /
     * onboarding flags propagate live without a manual refetch.
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
        setIsLoading(true);
        try {
            const { ok, data, status } = await postJson('/api/auth/signup', { phone, pin });
            if (!ok || !data?.success || !data?.uid) {
                const err: any = new Error(data?.error || 'Could not create account.');
                err.status = status;
                throw err;
            }
            writeStoredUid(data.uid);
            setUid(data.uid);
            return data.uid;
        } catch (error) {
            console.error('Account creation error:', error);
            setIsLoading(false);
            throw error;
        }
        // Note: not clearing isLoading on success — the user-doc subscription
        // effect will flip it once the snapshot arrives, preventing a flash
        // of the signed-out state.
    };

    const completeProfile = async (
        uid: string,
        phone: string,
        _pin: string,
        roleData: any,
    ): Promise<void> => {
        // The PIN is intentionally NOT written here — it is already hashed and
        // stored by the signup route. Writing it again as plaintext would
        // defeat the whole point of the bcrypt migration.
        setIsLoading(true);
        try {
            const userData = {
                phone,
                onboardingComplete: true,
                updatedAt: serverTimestamp(),
                ...roleData,
            };
            await setDoc(doc(db, 'users', uid), userData, { merge: true });
            // The snapshot listener will refresh `user` automatically.
        } catch (error) {
            console.error('Profile update error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (phone: string, pin: string): Promise<string> => {
        setIsLoading(true);
        try {
            const { ok, data, status } = await postJson('/api/auth/login', { phone, pin });
            if (!ok || !data?.success || !data?.uid) {
                const err: any = new Error(data?.error || 'Phone number or PIN is incorrect.');
                err.status = status;
                throw err;
            }
            writeStoredUid(data.uid);
            setUid(data.uid);
            return data.uid;
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    const changePin = async (oldPin: string, newPin: string) => {
        if (!user) throw new Error('No user logged in');
        const { ok, data } = await postJson('/api/auth/change-pin', { oldPin, newPin });
        if (!ok || !data?.success) {
            // Surface the stable error code the dialog UI checks for.
            throw new Error(data?.error || 'change-pin-failed');
        }
    };

    const requestPinReset = async (phone: string): Promise<{ referenceCode: string }> => {
        // All rate limiting, audit logging, and Firestore writes happen on the
        // server (see app/api/auth/pin-reset/route.ts) so they are enforced with
        // admin credentials and cannot be bypassed by a modified client.
        let res: Response;
        try {
            res = await fetch('/api/auth/pin-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
        } catch (err) {
            console.error('Network error during PIN reset request:', err);
            throw new Error('Could not start a reset right now. Please check your connection and try again.');
        }

        let data: { success?: boolean; referenceCode?: string; error?: string } = {};
        try {
            data = await res.json();
        } catch {
            /* fall back to status-based message */
        }

        if (!res.ok || !data.success || !data.referenceCode) {
            throw new Error(data.error || 'Could not start a reset right now. Please try again in a moment.');
        }

        return { referenceCode: data.referenceCode };
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'same-origin',
            });
        } catch (error) {
            console.error('Logout request failed (clearing client state anyway):', error);
        } finally {
            writeStoredUid(null);
            setUid(null);
            setUser(null);
        }
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
