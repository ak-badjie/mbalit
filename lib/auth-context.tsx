'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, setDoc, getDoc, getDocs, query, collection, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { User, UserRole, WasteType, Collector } from '@/types';

// Auth context types
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signup: (phone: string, pin: string) => Promise<string>;
    login: (phone: string, pin: string) => Promise<void>;
    checkPhoneExists: (phone: string) => Promise<boolean>;
    checkOrgCode: (orgCode: string) => Promise<boolean>;
    changePin: (oldPin: string, newPin: string) => Promise<void>;
    logout: () => Promise<void>;
    updateCollectorWasteTypes: (wasteTypes: WasteType[]) => Promise<void>;
    setCollectorAvailability: (available: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Generate a unique user ID
function generateUserId(): string {
    return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

// Auth provider component (Database-only, no Google/Firebase Auth)
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore session from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const storedUserId = localStorage.getItem('mbalit_user_id');
        if (storedUserId) {
            fetchUserProfile(storedUserId).then((profile) => {
                setUser(profile);
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    }, []);

    // Fetch user profile from Firestore
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

    // Check if a phone number already exists in the database
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

    // Check if an organization code exists
    const checkOrgCode = async (orgCode: string): Promise<boolean> => {
        try {
            const orgDoc = await getDoc(doc(db, 'organizations', orgCode));
            return orgDoc.exists();
        } catch (error) {
            console.error('Error checking org code:', error);
            return false;
        }
    };

    // Signup: create user directly in Firestore (no Firebase Auth)
    const signup = async (phone: string, pin: string): Promise<string> => {
        setIsLoading(true);
        try {
            // Check if phone already registered
            const exists = await checkPhoneExists(phone);
            if (exists) {
                throw new Error('This phone number is already registered. Please log in instead.');
            }

            const userId = generateUserId();

            const userData = {
                phone,
                pin,
                role: 'user' as UserRole,
                onboardingComplete: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(doc(db, 'users', userId), userData);

            // Store session
            localStorage.setItem('mbalit_user_id', userId);

            const profile = await fetchUserProfile(userId);
            setUser(profile);

            return userId;
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Login: phone + PIN lookup in Firestore
    const login = async (phone: string, pin: string) => {
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('phone', '==', phone));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error('user-not-found');
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            if (userData.pin !== pin) {
                throw new Error('wrong-password');
            }

            const profile = {
                id: userDoc.id,
                email: userData.email || '',
                name: userData.name || '',
                phone: userData.phone || '',
                role: userData.role || 'user',
                createdAt: userData.createdAt?.toDate() || new Date(),
                updatedAt: userData.updatedAt?.toDate() || new Date(),
                ...userData,
            } as User;

            // Store session
            localStorage.setItem('mbalit_user_id', userDoc.id);
            setUser(profile);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Change PIN
    const changePin = async (oldPin: string, newPin: string) => {
        if (!user) throw new Error('No user logged in');

        setIsLoading(true);
        try {
            const userRef = doc(db, 'users', user.id);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) throw new Error('User not found');

            const userData = userDoc.data();
            if (userData.pin && userData.pin !== oldPin) {
                throw new Error('old-pin-incorrect');
            }

            await setDoc(userRef, {
                pin: newPin,
                updatedAt: serverTimestamp()
            }, { merge: true });

            setUser(prev => prev ? { ...prev, pin: newPin } : null);
        } catch (error) {
            console.error('Change PIN error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Logout
    const logout = async () => {
        try {
            localStorage.removeItem('mbalit_user_id');
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    };

    // Update collector waste types
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

    // Set collector availability
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

    const value: AuthContextType = {
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
