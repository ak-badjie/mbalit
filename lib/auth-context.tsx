'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    User as FirebaseUser,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserRole, WasteType, Collector, Customer } from '@/types';

// Auth context types
interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signUp: (email: string, password: string, name: string, phone: string, role: UserRole) => Promise<void>;
    signInWithGoogle: (role?: UserRole) => Promise<{ isNewUser: boolean; displayName: string | null; photoURL: string | null }>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    updateCollectorWasteTypes: (wasteTypes: WasteType[]) => Promise<void>;
    setCollectorAvailability: (available: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch user profile from Firestore
    const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<User | null> => {
        try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                return {
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: data.name || firebaseUser.displayName || '',
                    phone: data.phone || '',
                    role: data.role || 'customer',
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

    // Listen to auth state changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setFirebaseUser(firebaseUser);

            if (firebaseUser) {
                const profile = await fetchUserProfile(firebaseUser);
                setUser(profile);
            } else {
                setUser(null);
            }

            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [fetchUserProfile]);

    // Sign up function
    const signUp = async (
        email: string,
        password: string,
        name: string,
        phone: string,
        role: UserRole
    ) => {
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Update display name
            await updateProfile(firebaseUser, { displayName: name });

            // Create user profile in Firestore
            const userData = role === 'collector'
                ? {
                    email,
                    name,
                    phone,
                    role,
                    wasteTypesHandled: [],
                    isAvailable: false,
                    rating: 5.0,
                    totalPickups: 0,
                    earnings: 0,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }
                : {
                    email,
                    name,
                    phone,
                    role,
                    activeRequests: [],
                    completedRequests: 0,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };

            await setDoc(doc(db, 'users', firebaseUser.uid), userData);

            // Fetch and set user profile
            const profile = await fetchUserProfile(firebaseUser);
            setUser(profile);
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Login function
    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Google Sign In function
    const signInWithGoogle = async (role: UserRole = 'collector'): Promise<{ isNewUser: boolean; displayName: string | null; photoURL: string | null }> => {
        setIsLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const firebaseUser = result.user;

            // Check if user already exists
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            const isNewUser = !userDoc.exists();

            if (isNewUser) {
                // Create MINIMAL user profile - onboarding will fill in the rest
                // Don't set collector-specific values (rating, totalPickups, etc.) until onboarding completes
                const userData = {
                    email: firebaseUser.email,
                    name: firebaseUser.displayName || '',
                    phone: '',
                    role,
                    profileImage: firebaseUser.photoURL || '',
                    onboardingComplete: false, // MUST complete onboarding before accessing dashboard
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };

                await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            }

            // Fetch and set user profile
            const profile = await fetchUserProfile(firebaseUser);
            setUser(profile);

            // Return Google profile data for immediate use in onboarding
            return {
                isNewUser,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL
            };
        } catch (error) {
            console.error('Google Sign In error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Logout function
    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    };

    // Update collector waste types (during onboarding)
    const updateCollectorWasteTypes = async (wasteTypes: WasteType[]) => {
        if (!firebaseUser || !user) return;

        try {
            await setDoc(
                doc(db, 'users', firebaseUser.uid),
                {
                    wasteTypesHandled: wasteTypes,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            setUser((prev) => prev ? { ...prev, wasteTypesHandled: wasteTypes } as Collector : null);
        } catch (error) {
            console.error('Error updating waste types:', error);
            throw error;
        }
    };

    // Set collector availability
    const setCollectorAvailability = async (available: boolean) => {
        if (!firebaseUser || !user) return;

        try {
            await setDoc(
                doc(db, 'users', firebaseUser.uid),
                {
                    isAvailable: available,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            setUser((prev) => prev ? { ...prev, isAvailable: available } as Collector : null);
        } catch (error) {
            console.error('Error updating availability:', error);
            throw error;
        }
    };

    const value: AuthContextType = {
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !!user,
        signUp,
        signInWithGoogle,
        login,
        logout,
        updateCollectorWasteTypes,
        setCollectorAvailability,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook to use auth context
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Hook to require authentication
export function useRequireAuth(redirectTo: string = '/auth') {
    const { user, isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            window.location.href = redirectTo;
        }
    }, [isLoading, isAuthenticated, redirectTo]);

    return { user, isLoading, isAuthenticated };
}
