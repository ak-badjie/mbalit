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
import { doc, setDoc, getDoc, serverTimestamp, getDocs, query, collection, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserRole, WasteType, Collector, Customer, AccountType, UserProfile } from '@/types';

// Auth context types
interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signUp: (email: string, password: string, name: string, phone: string, role: UserRole) => Promise<void>;
    signUpUser: (email: string, password: string, name: string, phone: string, accountType: AccountType, organizationName?: string) => Promise<void>;
    createUserAccountOnly: (email: string, password: string, accountType: AccountType) => Promise<FirebaseUser>;
    signInWithGoogle: (role?: UserRole, accountType?: AccountType) => Promise<{ isNewUser: boolean; displayName: string | null; photoURL: string | null }>;
    login: (email: string, password: string) => Promise<void>;
    loginWithPhoneAndPin: (phone: string, pin: string) => Promise<void>;
    changePin: (oldPin: string, newPin: string) => Promise<void>;
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

    // Sign up function for collectors
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

    // Create user account only (for users who will complete onboarding separately)
    // This creates the Firebase auth account with onboardingComplete: false
    const createUserAccountOnly = async (
        email: string,
        password: string,
        accountType: AccountType
    ) => {
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Create minimal user profile in Firestore with onboardingComplete: false
            const userData = {
                email,
                role: 'user' as UserRole,
                accountType,
                onboardingComplete: false, // User must complete onboarding
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(doc(db, 'users', firebaseUser.uid), userData);

            // Fetch and set user profile
            const profile = await fetchUserProfile(firebaseUser);
            setUser(profile);

            return firebaseUser;
        } catch (error) {
            console.error('Create user account error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Sign up function for users (individual, business, corporate)
    const signUpUser = async (
        email: string,
        password: string,
        name: string,
        phone: string,
        accountType: AccountType,
        organizationName?: string
    ) => {
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Update display name
            await updateProfile(firebaseUser, { displayName: name });

            // Create user profile in Firestore
            const userData: Partial<UserProfile> = {
                email,
                name,
                phone,
                role: 'user',
                accountType,
                organizationName: accountType !== 'individual' ? organizationName : undefined,
                contactPerson: name,
                activeOrders: [],
                completedOrders: 0,
                onboardingComplete: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await setDoc(doc(db, 'users', firebaseUser.uid), {
                ...userData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

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

    // Login with Phone and PIN
    // NOTE: This does NOT create a Firebase Auth session (firebaseUser will be null or custom)
    // It is a "data-only" login for this specific app flow.
    const loginWithPhoneAndPin = async (phone: string, pin: string) => {
        setIsLoading(true);
        try {
            // Normalize phone: remove spaces, ensure it matches storage format
            // Assuming storage is "+220 123 4567" or similar, strictly matching input
            // For robustness, ideally store/search normalized.
            // Here we search for exact match or normalized.

            const usersRef = collection(db, 'users');
            // Try specific phone search
            const q = query(usersRef, where('phone', '==', phone));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error('user-not-found');
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            // Verify PIN
            // SECURITY WARNING: In production, hash this PIN!
            if (userData.pin !== pin) {
                throw new Error('wrong-password');
            }

            // Manually set User state
            const profile = {
                id: userDoc.id,
                email: userData.email || '',
                name: userData.name || '',
                phone: userData.phone || '',
                role: userData.role || 'customer',
                createdAt: userData.createdAt?.toDate() || new Date(),
                updatedAt: userData.updatedAt?.toDate() || new Date(),
                ...userData,
            } as User;

            setUser(profile);
            // We do NOT set firebaseUser because there is no Firebase Auth session
            // This means security rules relying on request.auth will fail
        } catch (error) {
            console.error('Phone/PIN Login error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };



    // Change PIN function
    const changePin = async (oldPin: string, newPin: string) => {
        if (!user) throw new Error('No user logged in');

        setIsLoading(true);
        try {
            // Re-verify old PIN
            // In a real app, you might want to force a fresh login-like check
            // or just check against the loaded profile if you trust it.
            // For security, checking against Firestore is better.

            const userRef = doc(db, 'users', user.id);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) throw new Error('User not found');

            const userData = userDoc.data();
            const currentPin = userData.pin;

            if (currentPin && currentPin !== oldPin) {
                throw new Error('old-pin-incorrect');
            }

            // Update to new PIN
            await setDoc(userRef, {
                pin: newPin,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Update local state
            setUser(prev => prev ? { ...prev, pin: newPin } : null);

        } catch (error) {
            console.error('Change PIN error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Google Sign In function
    const signInWithGoogle = async (role: UserRole = 'collector', accountType?: AccountType): Promise<{ isNewUser: boolean; displayName: string | null; photoURL: string | null }> => {
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
                const userData = role === 'collector'
                    ? {
                        email: firebaseUser.email,
                        name: firebaseUser.displayName || '',
                        phone: '',
                        role,
                        profileImage: firebaseUser.photoURL || '',
                        onboardingComplete: false, // MUST complete onboarding before accessing dashboard
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    }
                    : {
                        email: firebaseUser.email,
                        name: firebaseUser.displayName || '',
                        phone: '',
                        role: 'user',
                        accountType: accountType || 'individual',
                        profileImage: firebaseUser.photoURL || '',
                        contactPerson: firebaseUser.displayName || '',
                        activeOrders: [],
                        completedOrders: 0,
                        onboardingComplete: false, // Will complete after phone number entry
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
        signUpUser,
        createUserAccountOnly,
        signInWithGoogle,
        login,
        loginWithPhoneAndPin,
        changePin,
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
