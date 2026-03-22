'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
    doc, setDoc, getDoc, getDocs, query, collection, where, serverTimestamp 
} from 'firebase/firestore';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult,
    updateEmail,
    updatePassword,
} from 'firebase/auth';
import { db, auth } from './firebase';
import { User, UserRole, WasteType, Collector } from '@/types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signup: (phone: string, pin: string, confirmationResult: ConfirmationResult, smsCode: string) => Promise<string>;
    login: (phone: string, pin: string) => Promise<void>;
    checkPhoneExists: (phone: string) => Promise<boolean>;
    checkOrgCode: (orgCode: string) => Promise<boolean>;
    changePin: (oldPin: string, newPin: string) => Promise<void>;
    logout: () => Promise<void>;
    updateCollectorWasteTypes: (wasteTypes: WasteType[]) => Promise<void>;
    setCollectorAvailability: (available: boolean) => Promise<void>;
    sendSmsVerification: (phone: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
    resetPinWithSms: (newPin: string, confirmationResult: ConfirmationResult, smsCode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function generateDummyEmail(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `${cleanPhone}@mbalit.app`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUserProfile = useCallback(async (userId: string): Promise<User | null> => {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                return {
                    id: userId,
                    email: data.email || '',
                    name: data.name || '',
                    phone: data.phone || '',
                    role: data.role || 'user',
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    ...data,
                } as User;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const profile = await fetchUserProfile(firebaseUser.uid);
                setUser(profile);
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [fetchUserProfile]);

    const checkPhoneExists = async (phone: string): Promise<boolean> => {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('phone', '==', phone));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error) {
            console.error('Error checking phone:', error);
            return false;
        }
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

    const sendSmsVerification = async (phone: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
        try {
            return await signInWithPhoneNumber(auth, phone, appVerifier);
        } catch (error) {
            console.error('Error sending SMS:', error);
            throw error;
        }
    };

    const signup = async (phone: string, pin: string, confirmationResult: ConfirmationResult, smsCode: string): Promise<string> => {
        setIsLoading(true);
        try {
            const exists = await checkPhoneExists(phone);
            if (exists) {
                throw new Error('This phone number is already registered. Please log in instead.');
            }

            const credential = await confirmationResult.confirm(smsCode);
            const firebaseUser = credential.user;

            const dummyEmail = generateDummyEmail(phone);
            await updateEmail(firebaseUser, dummyEmail);
            await updatePassword(firebaseUser, pin);

            const userData = {
                phone,
                role: 'user' as UserRole,
                onboardingComplete: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), userData);

            const profile = await fetchUserProfile(firebaseUser.uid);
            setUser(profile);

            return firebaseUser.uid;
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (phone: string, pin: string) => {
        setIsLoading(true);
        try {
            const dummyEmail = generateDummyEmail(phone);
            await signInWithEmailAndPassword(auth, dummyEmail, pin);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const resetPinWithSms = async (newPin: string, confirmationResult: ConfirmationResult, smsCode: string) => {
        setIsLoading(true);
        try {
            const credential = await confirmationResult.confirm(smsCode);
            const firebaseUser = credential.user;
            await updatePassword(firebaseUser, newPin);
            const profile = await fetchUserProfile(firebaseUser.uid);
            setUser(profile);
        } catch (error) {
            console.error('Reset PIN error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const changePin = async (oldPin: string, newPin: string) => {
        if (!auth.currentUser || !user) throw new Error('No user logged in');
        setIsLoading(true);
        try {
            const dummyEmail = generateDummyEmail(user.phone);
            await signInWithEmailAndPassword(auth, dummyEmail, oldPin);
            await updatePassword(auth.currentUser, newPin);
        } catch (error) {
            console.error('Change PIN error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
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
                signup,
                login,
                checkPhoneExists,
                checkOrgCode,
                changePin,
                logout,
                updateCollectorWasteTypes,
                setCollectorAvailability,
                sendSmsVerification,
                resetPinWithSms,
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

export function useRequireAuth() {
    const context = useAuth();
    const router = require('next/navigation').useRouter();
    React.useEffect(() => {
        if (!context.isLoading && !context.user) {
            router.push('/auth');
        }
    }, [context.user, context.isLoading, router]);
    return context;
}

