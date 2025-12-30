'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail,
    Lock,
    User,
    Phone,
    ArrowRight,
    ArrowLeft,
    Loader2,
    Eye,
    EyeOff,
    Camera,
    Check,
    Package,
    Car,
    Scale,
    Building2,
    Users,
    Briefcase,
    Truck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TruckLogo } from '@/components/ui/truck-logo';
import { WASTE_TYPES } from '@/lib/waste-config';
import { WasteType, AccountType } from '@/types';

// Step indicator for onboarding
const OnboardingSteps: React.FC<{ currentStep: number; totalSteps: number }> = ({
    currentStep,
    totalSteps,
}) => (
    <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => (
            <React.Fragment key={i}>
                <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{
                        scale: currentStep === i + 1 ? 1.1 : 1,
                        backgroundColor: i + 1 <= currentStep ? '#10b981' : '#e5e7eb',
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${i + 1 <= currentStep ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                        }`}
                >
                    {i + 1 < currentStep ? <Check size={18} /> : i + 1}
                </motion.div>
                {i < totalSteps - 1 && (
                    <div
                        className={`flex-1 h-1 rounded-full transition-colors ${i + 1 < currentStep ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                    />
                )}
            </React.Fragment>
        ))}
    </div>
);

// Car size options for collectors
const CAR_SIZES = [
    { id: 'motorcycle', name: 'Motorcycle', capacity: '50 kg', icon: '🏍️' },
    { id: 'small', name: 'Small Car', capacity: '200 kg', icon: '🚗' },
    { id: 'pickup', name: 'Pickup Truck', capacity: '500 kg', icon: '🛻' },
    { id: 'truck', name: 'Large Truck', capacity: '2000 kg', icon: '🚚' },
];

// Account type options for users
const ACCOUNT_TYPES: { id: AccountType; name: string; description: string; icon: React.ReactNode }[] = [
    { id: 'individual', name: 'Individual', description: 'Personal account for home waste collection', icon: <User className="w-6 h-6" /> },
    { id: 'business', name: 'Business', description: 'For small to medium businesses', icon: <Briefcase className="w-6 h-6" /> },
    { id: 'corporate', name: 'Corporate', description: 'For large organizations & UN agencies', icon: <Building2 className="w-6 h-6" /> },
];

// Google icon SVG
const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

// Wrapper with Suspense for useSearchParams
export default function AuthPageWrapper() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        }>
            <AuthPage />
        </Suspense>
    );
}

function AuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isSignupMode = searchParams.get('signup') === 'true';
    const isCollectorMode = searchParams.get('role') === 'collector';
    const continueOnboarding = searchParams.get('continue') === 'onboarding';
    const { login, signUp, signUpUser, signInWithGoogle, isLoading, user, firebaseUser } = useAuth();

    // Role selection state
    const [selectedRole, setSelectedRole] = useState<'user' | 'collector' | null>(isCollectorMode ? 'collector' : null);

    // Auth state
    const [mode, setMode] = useState<'login' | 'signup'>(isSignupMode ? 'signup' : 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // User signup state
    const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null);
    const [organizationName, setOrganizationName] = useState('');
    const [userOnboardingStep, setUserOnboardingStep] = useState(0);

    // Collector onboarding state (multi-step)
    const [onboardingStep, setOnboardingStep] = useState(0);
    const [isGoogleUser, setIsGoogleUser] = useState(false);
    const [fullName, setFullName] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [carSize, setCarSize] = useState<string | null>(null);
    const [selectedWasteTypes, setSelectedWasteTypes] = useState<WasteType[]>([]);
    const [maxCapacity, setMaxCapacity] = useState<number>(100);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update mode based on URL params and auto-start onboarding if continuing
    useEffect(() => {
        if (isSignupMode) {
            setMode('signup');
        }
        if (isCollectorMode) {
            setSelectedRole('collector');
        }

        // If user is logged in but needs to complete onboarding
        if (continueOnboarding && user && user.onboardingComplete === false) {
            setIsGoogleUser(true);
            setOnboardingStep(1);
            // Pre-fill with user's Google data
            if (user.name) setFullName(user.name);
            if (user.profileImage) setProfileImage(user.profileImage);
        }
    }, [isSignupMode, isCollectorMode, continueOnboarding, user]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await login(email, password);
            // Redirect based on user role (will be determined after login)
            // For now, we check if user exists and redirect accordingly
            window.location.href = '/';
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Login failed';
            if (msg.includes('user-not-found') || msg.includes('wrong-password')) {
                setError('Invalid email or password');
            } else {
                setError(msg);
            }
        }
    };

    // Handle user signup start (email/password entry for users)
    const handleUserSignupStart = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        // Move to user onboarding step 1 (name & phone)
        setUserOnboardingStep(1);
    };

    // Handle user onboarding completion
    const handleUserOnboardingComplete = async () => {
        setError(null);

        try {
            await signUpUser(
                email,
                password,
                fullName,
                phoneNumber,
                selectedAccountType!,
                selectedAccountType !== 'individual' ? organizationName : undefined
            );

            // Redirect to dashboard
            window.location.href = '/dashboard';
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Signup failed';
            setError(msg);
        }
    };

    const handleSignupStart = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate email/password then move to onboarding
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        // Move to onboarding step 1
        setOnboardingStep(1);
    };

    const handleOnboardingComplete = async () => {
        setError(null);

        try {
            if (isGoogleUser && firebaseUser) {
                // For Google users, UPDATE the existing profile with all onboarding data
                const collectorData = {
                    name: fullName,
                    phone: phoneNumber,
                    profileImage: profileImage || user?.profileImage || '',
                    vehicleType: carSize,
                    wasteTypesHandled: selectedWasteTypes,
                    maxCapacity,
                    isAvailable: false,
                    rating: 0, // Will be calculated from reviews
                    totalPickups: 0,
                    earnings: 0,
                    onboardingComplete: true, // NOW they can access dashboard
                    updatedAt: serverTimestamp(),
                };

                // Update users collection
                await updateDoc(doc(db, 'users', firebaseUser.uid), collectorData);

                // Also create/update collectorProfiles document for profile page
                const profileData = {
                    displayName: fullName,
                    bio: '',
                    profileImage: profileImage || user?.profileImage || '',
                    phone: phoneNumber,
                    email: user?.email || firebaseUser.email || '',
                    vehicleType: carSize,
                    vehicleCapacity: `${maxCapacity} kg`,
                    wasteTypesHandled: selectedWasteTypes,
                    isVerified: false,
                    documentsSubmitted: false,
                    joinedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                await setDoc(doc(db, 'collectorProfiles', firebaseUser.uid), profileData, { merge: true });

                window.location.href = '/collector/dashboard';
            } else {
                // For email/password users, create the account
                await signUp(email, password, fullName, phoneNumber, 'collector');

                // Update with additional collector data
                if (firebaseUser) {
                    const collectorData = {
                        vehicleType: carSize,
                        wasteTypesHandled: selectedWasteTypes,
                        maxCapacity,
                        isAvailable: false,
                        rating: 0,
                        totalPickups: 0,
                        earnings: 0,
                        onboardingComplete: true,
                        updatedAt: serverTimestamp(),
                    };
                    await updateDoc(doc(db, 'users', firebaseUser.uid), collectorData);

                    // Also create collectorProfiles document
                    const profileData = {
                        displayName: fullName,
                        bio: '',
                        profileImage: profileImage || '',
                        phone: phoneNumber,
                        email: email,
                        vehicleType: carSize,
                        vehicleCapacity: `${maxCapacity} kg`,
                        wasteTypesHandled: selectedWasteTypes,
                        isVerified: false,
                        documentsSubmitted: false,
                        joinedAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    };
                    await setDoc(doc(db, 'collectorProfiles', firebaseUser.uid), profileData, { merge: true });
                }

                window.location.href = '/collector/dashboard';
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Signup failed';
            setError(msg);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleWasteType = (type: WasteType) => {
        setSelectedWasteTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const canProceedOnboarding = () => {
        switch (onboardingStep) {
            case 1: return fullName.trim().length > 0;
            case 2: return phoneNumber.trim().length > 0 && carSize !== null;
            case 3: return selectedWasteTypes.length > 0;
            case 4: return maxCapacity > 0;
            default: return false;
        }
    };

    const canProceedUserOnboarding = () => {
        switch (userOnboardingStep) {
            case 1: return fullName.trim().length > 0 && phoneNumber.trim().length > 0;
            default: return false;
        }
    };

    // Role Selection Screen
    if (!selectedRole && mode === 'signup') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg"
                >
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className="inline-flex justify-center mb-4"
                        >
                            <TruckLogo size="lg" showText={true} />
                        </motion.div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Join Mbalit
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            How would you like to use Mbalit?
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* User Option */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedRole('user')}
                            className="w-full p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-500 hover:shadow-lg transition-all text-left group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                    <Users className="w-8 h-8" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                        I need waste collected
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        For individuals, businesses, and corporate organizations looking for waste collection services
                                    </p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                            </div>
                        </motion.button>

                        {/* Collector Option */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedRole('collector')}
                            className="w-full p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-500 hover:shadow-lg transition-all text-left group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <Truck className="w-8 h-8" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                        I want to collect waste
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Become a collector and earn money by picking up waste in your area
                                    </p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            </div>
                        </motion.button>
                    </div>

                    {/* Back to login */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setMode('login')}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors"
                        >
                            Already have an account? <span className="font-medium">Login</span>
                        </button>
                    </div>

                    {/* Back to home link */}
                    <div className="mt-4 text-center">
                        <a
                            href="/"
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors"
                        >
                            ← Back to home
                        </a>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Account Type Selection for Users
    if (selectedRole === 'user' && mode === 'signup' && !selectedAccountType) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg"
                >
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className="inline-flex justify-center mb-4"
                        >
                            <TruckLogo size="lg" showText={true} />
                        </motion.div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Select Account Type
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            Choose the type of account that best fits your needs
                        </p>
                    </div>

                    <div className="space-y-4">
                        {ACCOUNT_TYPES.map((type) => (
                            <motion.button
                                key={type.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedAccountType(type.id)}
                                className="w-full p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-500 hover:shadow-lg transition-all text-left group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        {type.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                            {type.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {type.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    {/* Back button */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setSelectedRole(null)}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors"
                        >
                            ← Back to role selection
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // User signup form and onboarding
    if (selectedRole === 'user' && mode === 'signup' && selectedAccountType) {
        // User onboarding step 1: Name, Phone, Organization (if applicable)
        if (userOnboardingStep === 1) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-md"
                    >
                        <Card variant="elevated" padding="lg">
                            <div className="text-center mb-6">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Complete Your Profile
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">
                                    {selectedAccountType === 'individual' ? 'Tell us about yourself' : 'Tell us about your organization'}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Full Name / Contact Person */}
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {selectedAccountType === 'individual' ? 'Full Name' : 'Contact Person'} *
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Enter your name"
                                            required
                                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Organization Name (for business/corporate) */}
                                {selectedAccountType !== 'individual' && (
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {selectedAccountType === 'business' ? 'Business Name' : 'Organization Name'} *
                                        </label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                value={organizationName}
                                                onChange={(e) => setOrganizationName(e.target.value)}
                                                placeholder={selectedAccountType === 'business' ? 'Enter business name' : 'Enter organization name'}
                                                required
                                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Phone Number */}
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Phone Number *
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="+220 123 4567"
                                            required
                                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </div>

                            {/* Navigation Buttons */}
                            <div className="mt-8 flex justify-between gap-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => setUserOnboardingStep(0)}
                                    leftIcon={<ArrowLeft size={18} />}
                                >
                                    Back
                                </Button>

                                <Button
                                    variant="primary"
                                    disabled={!canProceedUserOnboarding() || isLoading || (selectedAccountType !== 'individual' && !organizationName.trim())}
                                    isLoading={isLoading}
                                    onClick={handleUserOnboardingComplete}
                                    rightIcon={<Check size={18} />}
                                >
                                    Complete Setup
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            );
        }

        // User email/password form
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className="inline-flex justify-center mb-4"
                        >
                            <TruckLogo size="lg" showText={true} />
                        </motion.div>
                        <Badge variant="secondary" className="mb-2">
                            {ACCOUNT_TYPES.find(t => t.id === selectedAccountType)?.name} Account
                        </Badge>
                        <p className="text-gray-500 dark:text-gray-400">
                            Create your account to get started
                        </p>
                    </div>

                    <Card variant="elevated" padding="lg">
                        <form onSubmit={handleUserSignupStart} className="space-y-4">
                            {/* Email */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                fullWidth
                                disabled={isLoading}
                                isLoading={isLoading}
                                rightIcon={!isLoading ? <ArrowRight size={18} /> : undefined}
                            >
                                Continue
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-white dark:bg-gray-800 text-gray-500">
                                    or continue with
                                </span>
                            </div>
                        </div>

                        {/* Google Sign In */}
                        <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            fullWidth
                            disabled={isLoading}
                            onClick={async () => {
                                try {
                                    const { isNewUser } = await signInWithGoogle('user', selectedAccountType!);
                                    if (isNewUser) {
                                        // Need to complete onboarding
                                        setUserOnboardingStep(1);
                                    } else {
                                        // Existing user - redirect to dashboard
                                        window.location.href = '/dashboard';
                                    }
                                } catch (err: unknown) {
                                    const msg = err instanceof Error ? err.message : 'Google sign in failed';
                                    setError(msg);
                                }
                            }}
                            leftIcon={<GoogleIcon />}
                        >
                            Continue with Google
                        </Button>

                        {/* Back button */}
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setSelectedAccountType(null)}
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors"
                            >
                                ← Change account type
                            </button>
                        </div>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // Auth form (login or collector signup initial step)
    if (onboardingStep === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className="inline-flex justify-center mb-4"
                        >
                            <TruckLogo size="lg" showText={true} />
                        </motion.div>
                        <p className="text-gray-500 dark:text-gray-400">
                            {mode === 'login' ? 'Welcome back!' : selectedRole === 'collector' ? 'Become a Waste Collector' : 'Create your account'}
                        </p>
                    </div>

                    <Card variant="elevated" padding="lg">
                        {/* Mode Tabs */}
                        <div className="flex mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                            {(['login', 'signup'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => {
                                        setMode(m);
                                        if (m === 'signup' && !selectedRole) {
                                            setSelectedRole(null); // Show role selection
                                        }
                                    }}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === m
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                        }`}
                                >
                                    {m === 'login' ? 'Login' : 'Sign Up'}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={mode === 'login' ? handleLogin : handleSignupStart} className="space-y-4">
                            {/* Email */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                fullWidth
                                disabled={isLoading}
                                isLoading={isLoading}
                                rightIcon={!isLoading ? <ArrowRight size={18} /> : undefined}
                            >
                                {mode === 'login' ? 'Login' : 'Continue'}
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-white dark:bg-gray-800 text-gray-500">
                                    or continue with
                                </span>
                            </div>
                        </div>

                        {/* Google Sign In */}
                        <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            fullWidth
                            disabled={isLoading}
                            onClick={async () => {
                                try {
                                    const { isNewUser, displayName, photoURL } = await signInWithGoogle('collector');
                                    if (isNewUser) {
                                        setIsGoogleUser(true);
                                        setOnboardingStep(1);
                                        // Pre-fill with Google profile data immediately
                                        if (displayName) {
                                            setFullName(displayName);
                                        }
                                        if (photoURL) {
                                            setProfileImage(photoURL);
                                        }
                                    } else {
                                        // Existing user - check if onboarding complete
                                        window.location.href = '/collector/dashboard';
                                    }
                                } catch (err: unknown) {
                                    const msg = err instanceof Error ? err.message : 'Google sign in failed';
                                    setError(msg);
                                }
                            }}
                            leftIcon={<GoogleIcon />}
                        >
                            Continue with Google
                        </Button>

                        {/* Back to home link */}
                        <div className="mt-6 text-center">
                            {selectedRole === 'collector' && mode === 'signup' ? (
                                <button
                                    onClick={() => setSelectedRole(null)}
                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors"
                                >
                                    ← Back to role selection
                                </button>
                            ) : (
                                <a
                                    href="/"
                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors"
                                >
                                    ← Back to home
                                </a>
                            )}
                        </div>
                    </Card>
                </motion.div >
            </div >
        );
    }

    // Collector onboarding steps
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg"
            >
                <Card variant="elevated" padding="lg">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Complete Your Profile
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Step {onboardingStep} of 4
                        </p>
                    </div>

                    <OnboardingSteps currentStep={onboardingStep} totalSteps={4} />

                    <AnimatePresence mode="wait">
                        {/* Step 1: Name & Profile Picture */}
                        {onboardingStep === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Your Profile
                                </h2>

                                {/* Profile Picture */}
                                <div className="flex flex-col items-center">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden hover:ring-4 hover:ring-emerald-500/50 transition-all"
                                    >
                                        {profileImage ? (
                                            <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera className="w-8 h-8 text-gray-400" />
                                        )}
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    <p className="text-sm text-gray-500 mt-2">
                                        Click to upload photo (optional)
                                    </p>
                                </div>

                                {/* Full Name */}
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Full Name *
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Amadou Bah"
                                            required
                                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Phone & Car Size */}
                        {onboardingStep === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Contact & Vehicle
                                </h2>

                                {/* Phone Number */}
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Phone Number *
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="+220 123 4567"
                                            required
                                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Car Size */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Vehicle Type *
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {CAR_SIZES.map((size) => (
                                            <motion.button
                                                key={size.id}
                                                type="button"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setCarSize(size.id)}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${carSize === size.id
                                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                    }`}
                                            >
                                                <span className="text-2xl">{size.icon}</span>
                                                <h3 className="font-semibold text-sm text-gray-900 dark:text-white mt-1">
                                                    {size.name}
                                                </h3>
                                                <Badge variant="secondary" className="mt-1">{size.capacity}</Badge>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Waste Types */}
                        {onboardingStep === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Waste Types You'll Collect
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Select all types of waste you're willing to collect
                                </p>

                                <div className="grid grid-cols-2 gap-3">
                                    {WASTE_TYPES.map((type) => (
                                        <motion.button
                                            key={type.id}
                                            type="button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => toggleWasteType(type.id)}
                                            className={`p-4 rounded-xl border-2 text-center transition-all ${selectedWasteTypes.includes(type.id)
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            <span className="text-2xl">{type.icon}</span>
                                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mt-1">
                                                {type.name}
                                            </h3>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Max Capacity */}
                        {onboardingStep === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Maximum Capacity
                                </h2>
                                <p className="text-sm text-gray-500">
                                    What's the maximum weight you can carry per trip?
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-center gap-4">
                                        <Scale className="w-8 h-8 text-emerald-500" />
                                        <div className="text-center">
                                            <span className="text-4xl font-bold text-gray-900 dark:text-white">
                                                {maxCapacity}
                                            </span>
                                            <span className="text-xl text-gray-500 ml-1">kg</span>
                                        </div>
                                    </div>

                                    <input
                                        type="range"
                                        min="10"
                                        max="2000"
                                        step="10"
                                        value={maxCapacity}
                                        onChange={(e) => setMaxCapacity(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />

                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>10 kg</span>
                                        <span>2000 kg</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="mt-8 flex justify-between gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => setOnboardingStep(prev => prev - 1)}
                            leftIcon={<ArrowLeft size={18} />}
                        >
                            Back
                        </Button>

                        {onboardingStep < 4 ? (
                            <Button
                                variant="primary"
                                disabled={!canProceedOnboarding()}
                                onClick={() => setOnboardingStep(prev => prev + 1)}
                                rightIcon={<ArrowRight size={18} />}
                            >
                                Continue
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                disabled={!canProceedOnboarding() || isLoading}
                                isLoading={isLoading}
                                onClick={handleOnboardingComplete}
                                rightIcon={<Check size={18} />}
                            >
                                Complete Setup
                            </Button>
                        )}
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
