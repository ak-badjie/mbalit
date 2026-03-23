'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Loader2,
    Camera,
    Check,
    Trash2,
    Truck,
    Building2,
    User,
    ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TruckLogo from '@/components/ui/truck-logo';
import { DialPad } from '@/components/ui/dial-pad';
import { JigsawBlock } from '@/components/ui/jigsaw-block';
import { CountrySelector, DEFAULT_COUNTRY } from '@/components/ui/country-selector';
import type { Country } from '@/components/ui/country-selector';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { WASTE_TYPES } from '@/lib/waste-config';
import { WasteType, CollectorType } from '@/types';
import { compressImage } from '@/lib/image-utils';

// Vehicle sizes (Lucide icons, no emojis)
const VEHICLE_TYPES = [
    { id: 'motorcycle', name: 'Motorcycle', capacity: '50 kg', icon: <Truck className="w-6 h-6" /> },
    { id: 'tricycle', name: 'Tricycle', capacity: '200 kg', icon: <Truck className="w-6 h-6" /> },
    { id: 'pickup', name: 'Pickup Truck', capacity: '500 kg', icon: <Truck className="w-7 h-7" /> },
    { id: 'truck', name: 'Large Truck', capacity: '2000 kg', icon: <Truck className="w-8 h-8" /> },
];

// Page transition animation
const pageVariants = {
    enter: { opacity: 0, x: 60 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
};

// Wrapper with Suspense
export default function AuthPageWrapper() {
    return (
        <Suspense fallback={
            <div className="h-[100dvh] overflow-hidden flex items-center justify-center bg-white">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                </div>
            </div>
        }>
            <AuthPage />
        </Suspense>
    );
}

type RegistrationType = 'waste_owner' | 'collector' | 'organization' | null;

function AuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isSignupMode = searchParams.get('signup') === 'true';
    const isCollectorMode = searchParams.get('role') === 'collector';
    const continueOnboarding = searchParams.get('continue') === 'onboarding';
    const { login, verifySmsCode, completeProfile, checkPhoneExists, checkOrgCode, sendSmsVerification, resetPinWithSms, isLoading, user } = useAuth();

    // Flow state
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot_pin'>(isSignupMode ? 'signup' : 'login');
    const [step, setStep] = useState(0); // 0 = role select, 1 = phone, 2 = pin, 3 = profile, 4 = vehicle (collectors), 5 = waste types (collectors)
    const [registrationType, setRegistrationType] = useState<RegistrationType>(
        isCollectorMode ? 'collector' : null
    );

    // Login state
    const [loginPin, setLoginPin] = useState('');
    const [loginStep, setLoginStep] = useState(0); // 0 = phone, 1 = pin entry
    const [error, setError] = useState<string | null>(null);

    // Registration shared state
    const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
    const [fullName, setFullName] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [verifiedUid, setVerifiedUid] = useState<string | null>(null); // Temp ID after SMS verify


    // Organization state
    const [orgName, setOrgName] = useState('');
    const [joinOrgCode, setJoinOrgCode] = useState('');
    const [isJoiningOrg, setIsJoiningOrg] = useState(false);
    const [showOrgDetails, setShowOrgDetails] = useState(false);

    // Success State
    const [isSignupSuccess, setIsSignupSuccess] = useState(false);

    // Collector state
    const [vehicleType, setVehicleType] = useState<string | null>(null);
    const [selectedWasteTypes, setSelectedWasteTypes] = useState<WasteType[]>([]);

        const fileInputRef = useRef<HTMLInputElement>(null);

    // SMS Verification State
    const [smsCode, setSmsCode] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [isSendingSms, setIsSendingSms] = useState(false);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    // Auto-continue onboarding for existing users
    useEffect(() => {
        if (continueOnboarding && user && user.onboardingComplete === false) {
            if (user.role === 'collector') {
                if ('collectorType' in user && user.collectorType === 'organization') {
                    setRegistrationType('organization');
                    if ('organizationName' in user && typeof user.organizationName === 'string') {
                        setOrgName(user.organizationName);
                    }
                } else {
                    setRegistrationType('collector');
                }
                setStep(1);
            } else {
                setRegistrationType('waste_owner');
                setStep(1);
            }
            if (user.name) setFullName(user.name);
            if (user.profileImage) setProfileImage(user.profileImage);
        }
    }, [continueOnboarding, user]);

    // Format phone display
    const formatPhone = (num: string) => {
        if (num.length <= 3) return num;
        if (num.length <= 5) return `${num.slice(0, 3)} ${num.slice(3)}`;
        return `${num.slice(0, 3)} ${num.slice(3, 5)} ${num.slice(5)}`;
    };

    // Handle role selection
    const handleRoleSelect = (type: RegistrationType) => {
        setRegistrationType(type);
        // Only show Step 1A (Join details) if they are joining a team
        if (type === 'collector' && isJoiningOrg) {
            setShowOrgDetails(true);
        } else {
            setShowOrgDetails(false);
        }
        setStep(1);
    };

    // Handle login
    const handleLogin = async (e?: React.FormEvent, pinOverride?: string) => {
        e?.preventDefault();
        setError(null);
        try {
            // Phone + PIN login
            const fullPhone = `+220 ${formatPhone(phoneNumber)}`; // Always Gambia for phone+pin now
            const pinToUse = pinOverride || loginPin;
            if (pinToUse.length !== 6) return;
            
            await login(fullPhone, pinToUse);
            // Check user role and collector type for redirect
            const usersRef = collection(db, 'users');
            const loginQuery = query(usersRef, where('phone', '==', fullPhone));
            const loginSnap = await getDocs(loginQuery);
            if (!loginSnap.empty) {
                const userData = loginSnap.docs[0].data();
                if (userData.role === 'collector' && userData.collectorType === 'organization') {
                    window.location.href = '/organization/dashboard';
                } else if (userData.role === 'collector') {
                    window.location.href = '/collector/dashboard';
                } else {
                    window.location.href = '/dashboard';
                }
            } else {
                window.location.href = '/dashboard';
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Login failed';
            if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
                setError('Invalid phone number or PIN');
            } else {
                setError(msg);
            }
            setLoginPin(''); // Clear pin on error
        }
    };

    // Handle signup completion
    const handleCompleteSignup = async () => {
        setError(null);
        const fullPhone = `${country.dialCode} ${formatPhone(phoneNumber)}`;

        try {
            let userId = user?.id || verifiedUid;

            if (!userId) {
                setError('No user found or SMS verification missing. Please try again.');
                return;
            }

            if (registrationType === 'waste_owner') {
                await completeProfile(userId, fullPhone, pin, {
                    name: fullName,
                    profileImage: profileImage || '',
                    role: 'user',
                });
                setIsSignupSuccess(true);
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 3500);
            } else if (registrationType === 'collector' || registrationType === 'organization') {
                const collectorData: Record<string, unknown> = {
                    name: registrationType === 'organization' ? orgName : fullName,
                    profileImage: profileImage || '',
                    role: 'collector',
                    vehicleType,
                    wasteTypesHandled: selectedWasteTypes,
                    isAvailable: false,
                    rating: 0,
                    totalPickups: 0,
                    earnings: 0,
                };

                // The rest is essentially identical to the old setDoc logic
                if (registrationType === 'organization') {
                    collectorData.collectorType = 'organization';
                    collectorData.organizationName = orgName;
                    const orgCode = orgName.toLowerCase().replace(/\s+/g, '-').slice(0, 12) + '-' + Math.random().toString(36).slice(2, 6);
                    collectorData.orgCode = orgCode;

                    await setDoc(doc(db, 'organizations', orgCode), {
                        name: orgName,
                        ownerId: userId,
                        orgCode,
                        members: [userId],
                        pendingMembers: [],
                        totalEarnings: 0,
                        walletBalance: 0,
                        isActive: true,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                } else if (isJoiningOrg) {
                    const orgExists = await checkOrgCode(joinOrgCode);
                    if (!orgExists) {
                        setError('Invalid organization code. Please check and try again.');
                        return;
                    }
                    collectorData.collectorType = 'organization_member';
                    collectorData.organizationId = joinOrgCode;
                    collectorData.isApproved = false;
                } else {
                    collectorData.collectorType = 'individual';
                }

                await completeProfile(userId, fullPhone, pin, collectorData);

                await setDoc(doc(db, 'collectorProfiles', userId), {
                    displayName: registrationType === 'organization' ? orgName : fullName,
                    bio: '',
                    profileImage: profileImage || '',
                    phone: fullPhone,
                    email: `${phoneNumber}@mbalit.app`,
                    vehicleType,
                    wasteTypesHandled: selectedWasteTypes,
                    collectorType: registrationType === 'organization' ? 'organization' : isJoiningOrg ? 'organization_member' : 'individual',
                    isVerified: false,
                    documentsSubmitted: false,
                    joinedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }, { merge: true });

                setIsSignupSuccess(true);
                setTimeout(() => {
                    if (registrationType === 'organization') {
                        window.location.href = '/organization/dashboard';
                    } else {
                        window.location.href = '/collector/dashboard';
                    }
                }, 3500);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to complete signup');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                const compressed = await compressImage(base64);
                setProfileImage(compressed);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBack = () => {
        setError(null);
        if (step > 0) {
            if (step === 6) {
                if (pinStep === 'confirm') {
                    setPinStep('create');
                    setConfirmPin('');
                } else {
                    setStep(2); // Go back to SMS
                }
                return;
            }
            if (step === 3) {
                setStep(6);
                return;
            }
            if (step === 1) {
                 if (!showOrgDetails && isJoiningOrg) {
                      setShowOrgDetails(true);
                      return;
                 } else {
                      setStep(0);
                      setRegistrationType(null);
                      setIsJoiningOrg(false);
                      setShowOrgDetails(false);
                      return;
                 }
            }
            setStep(step - 1);
        } else if (mode === 'signup') {
            setRegistrationType(null);
            setIsJoiningOrg(false);
            setShowOrgDetails(false);
        }
    };

    const getTotalDisplaySteps = () => {
        if (mode === 'forgot_pin') return 3; // phone, sms, pin
        if (registrationType === 'waste_owner') return 4; // phone, sms, pin, profile
        return 7; // org, phone, sms, pin, profile, vehicle, waste types
    };

    const getCurrentDisplayStep = () => {
        if (mode === 'forgot_pin') return step;
        if (registrationType === 'waste_owner') return step;
        if (step === 1 && showOrgDetails) return 1;
        if (step === 1 && !showOrgDetails) return 2;
        return step + 1;
    };

    // ==========================================
    // SUCCESS VIEW
    // ==========================================
    if (isSignupSuccess) {
        return (
            <div className="h-[100dvh] overflow-hidden bg-white flex items-center justify-center flex-col pb-16">
                <div className="w-80 h-80">
                    <DotLottieReact
                        src="/account_created.lottie"
                        autoplay
                        loop={false}
                    />
                </div>
            </div>
        );
    }

    // ==========================================
    // LOGIN VIEW
    // ==========================================
    if (mode === 'login') {
        // Step 1: Full screen PIN entry for phone login
        if (loginStep === 1) {
            return (
                <div className="h-[100dvh] overflow-hidden bg-white flex flex-col">
                    <div className="flex items-center pt-16 px-6 mb-8">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setLoginStep(0); setLoginPin(''); setError(null); }}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-900" />
                        </motion.button>
                        <div className="flex-1 text-center font-semibold text-gray-900 pr-8">
                            Enter PIN
                        </div>
                    </div>

                    <div className="flex-1 px-6 flex flex-col items-center justify-center pb-safe">
                        <div className="text-center mb-12">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                            <p className="text-gray-500">
                                Enter your PIN for {formatPhone(phoneNumber)}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl w-full max-w-sm">
                                <p className="text-sm text-red-600 text-center">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-4 justify-center mb-12">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${
                                        loginPin[i] 
                                            ? 'border-gray-900 bg-gray-900' 
                                            : error 
                                                ? 'border-red-300 bg-red-50'
                                                : 'border-gray-200 bg-gray-50'
                                    }`}
                                >
                                    {loginPin[i] ? (
                                        <div className="w-3 h-3 rounded-full bg-white" />
                                    ) : null}
                                </div>
                            ))}
                        </div>

                        <div className="w-full max-w-sm mx-auto">
                            <DialPad
                                value={loginPin}
                                onChange={(val) => {
                                    setLoginPin(val);
                                    setError(null);
                                    if (val.length === 6) {
                                        handleLogin(undefined, val); // auto-submit when 6 digits
                                    }
                                }}
                                maxLength={6}
                                showLetters={true}
                            />
                        </div>
                        
                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('forgot_pin');
                                    setStep(1);
                                    setLoginStep(0);
                                    setLoginPin('');
                                    setPhoneNumber('');
                                }}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                Forgot PIN?
                            </button>
                        </div>
                        <div className="mt-8 text-center">
                            {isLoading && <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-900" />}
                        </div>
                    </div>
                </div>
            );
        }

        // Step 0: Phone Number Entry (Full Screen Dial Pad)
        return (
            <div className="h-[100dvh] overflow-hidden bg-white flex flex-col">
                {/* Header */}
                <div className="relative flex items-center justify-center pt-16 pb-8 px-6">
                    <button
                        onClick={() => router.push('/')}
                        className="absolute left-6 top-16 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <TruckLogo size="lg" showText={true} />
                </div>

                <div className="flex-1 px-6 pb-safe flex flex-col">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
                    <p className="text-gray-500 mb-8">Sign in to your account</p>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl">
                            <p className="text-sm text-red-600 text-center">{error}</p>
                        </div>
                    )}

                    {/* Country + Number display */}
                    <div className="flex items-center gap-3 mb-6">
                        <CountrySelector selectedCountry={country} onSelect={setCountry} />
                        <div className="flex-1 text-center">
                            <span className="text-3xl font-bold text-gray-900 tracking-wider">
                                {phoneNumber ? formatPhone(phoneNumber) : (
                                    <span className="text-gray-300">000 00 00</span>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Dial pad */}
                    <div className="flex-1 flex items-center">
                        <DialPad
                            value={phoneNumber}
                            onChange={(val) => {
                                setPhoneNumber(val);
                                if (error) setError(null);
                            }}
                            maxLength={7}
                        />
                    </div>

                    {/* Continue button */}
                    <button
                        type="button"
                        onClick={() => { setLoginStep(1); setError(null); }}
                        disabled={phoneNumber.length < 7}
                        className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity mt-8"
                    >
                        Continue
                    </button>

                    {/* Switch to signup */}
                    <div className="mt-8 text-center pb-6">
                        <button
                            type="button"
                            onClick={() => { setMode('signup'); setStep(0); }}
                            className="text-sm text-gray-500"
                        >
                            Don&apos;t have an account? <span className="font-semibold text-gray-900">Sign Up</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // SIGNUP: STEP 0 - Role Selection
    // ==========================================
    if (mode === 'signup' && step === 0) {
        return (
            <div className="h-[100dvh] overflow-hidden bg-white flex flex-col">
                {/* Header with Back Button */}
                <div className="relative flex items-center justify-center pt-16 pb-6 px-6">
                    <button
                        onClick={() => router.push('/')}
                        className="absolute left-6 top-16 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <TruckLogo size="lg" showText={true} />
                </div>

                <div className="flex-1 px-6 pb-safe">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Get started</h1>
                        <p className="text-gray-500">Choose an option below</p>
                    </div>

                    <div className="flex flex-col relative pb-4 w-full">
                        <div className="flex flex-col gap-4 w-full">
                            {/* Waste Owner - Card */}
                            <motion.div 
                                whileTap={{ scale: 0.98 }} 
                                whileHover={{ y: -2 }} 
                                onClick={() => handleRoleSelect('waste_owner')}
                                className="w-full group cursor-pointer block bg-[#F0F7FF] rounded-[22px] drop-shadow-md hover:drop-shadow-lg transition-all border border-white"
                            >
                                <div className="flex flex-row items-center gap-5 py-6 px-6 text-left">
                                    <div className="w-14 h-14 rounded-[16px] bg-blue-100/50 flex flex-shrink-0 items-center justify-center text-blue-600">
                                        <Trash2 className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-blue-900 text-[17px]">I have waste</h3>
                                        <p className="text-sm text-blue-700/70 mt-0.5">Get your waste collected</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-blue-300 transition-transform group-hover:translate-x-1" />
                                </div>
                            </motion.div>

                            {/* Join Team - Card */}
                            <motion.div 
                                whileTap={{ scale: 0.98 }} 
                                whileHover={{ y: -2 }} 
                                onClick={() => {
                                    setIsJoiningOrg(true);
                                    setRegistrationType('collector');
                                    setShowOrgDetails(true);
                                    setStep(1);
                                }}
                                className="w-full group cursor-pointer block bg-[#F0FDF4] rounded-[22px] drop-shadow-md hover:drop-shadow-lg transition-all border border-white"
                            >
                                <div className="flex flex-row items-center gap-5 py-6 px-6 text-left">
                                    <div className="w-14 h-14 rounded-[16px] bg-emerald-100/50 flex flex-shrink-0 items-center justify-center text-emerald-600">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-emerald-900 text-[17px]">Join a team</h3>
                                        <p className="text-sm text-emerald-700/70 mt-0.5">Have an organization code</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-emerald-300 transition-transform group-hover:translate-x-1" />
                                </div>
                            </motion.div>

                            {/* Organization - Card */}
                            <motion.div 
                                whileTap={{ scale: 0.98 }} 
                                whileHover={{ y: -2 }} 
                                onClick={() => handleRoleSelect('organization')}
                                className="w-full group cursor-pointer block bg-[#FFFBEB] rounded-[22px] drop-shadow-md hover:drop-shadow-lg transition-all border border-white"
                            >
                                <div className="flex flex-row items-center gap-5 py-6 px-6 text-left">
                                    <div className="w-14 h-14 rounded-[16px] bg-amber-100/50 flex flex-shrink-0 items-center justify-center text-amber-600">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-amber-900 text-[17px]">Register company</h3>
                                        <p className="text-sm text-amber-700/70 mt-0.5">Waste business</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-amber-300 transition-transform group-hover:translate-x-1" />
                                </div>
                            </motion.div>
                        </div>
                    </div>


                    {/* Switch to login */}
                    <div className="mt-8 text-center">
                        <button
                            type="button"
                            onClick={() => setMode('login')}
                            className="text-sm text-gray-500"
                        >
                            Already have an account? <span className="font-semibold text-gray-900">Sign In</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // SIGNUP STEPS (Full-screen)
    // ==========================================
    return (
        <div className="h-[100dvh] overflow-hidden bg-white flex flex-col">
            {/* Top bar with back button and step dots */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleBack}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </motion.button>

                {/* Step dots */}
                <div className="flex items-center gap-2">
                    {Array.from({ length: getTotalDisplaySteps() }, (_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all ${
                                i + 1 <= getCurrentDisplayStep() ? 'w-6 bg-gray-900' : 'w-1.5 bg-gray-200'
                            }`}
                        />
                    ))}
                </div>

                <div className="w-9" /> {/* Spacer */}
            </div>

            {error && (
                <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            <AnimatePresence mode="wait">
                {/* ==========================================
                    STEP 1A: Org Details
                ========================================== */}
                {step === 1 && showOrgDetails && (
                    <motion.div
                        key="org"
                        variants={pageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'tween', duration: 0.25 }}
                        className="flex-1 flex flex-col px-6 pb-6"
                    >
                        {/* Removed Org Registration from Step 1A - moved to Step 3 */}

                        {isJoiningOrg && (
                            <div className="mb-6 flex-1">
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Organization code</h2>
                                <p className="text-gray-500 text-sm mb-4">Enter the code from your organization</p>
                                <input
                                    type="text"
                                    value={joinOrgCode}
                                    onChange={(e) => setJoinOrgCode(e.target.value)}
                                    placeholder="e.g. clean-gambia-a3f2"
                                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent font-medium"
                                />
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                setError(null);
                                setShowOrgDetails(false);
                            }}
                            disabled={isJoiningOrg && joinOrgCode.length < 3}
                            className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-opacity mt-4"
                        >
                            Continue
                        </button>
                    </motion.div>
                )}

                {/* ==========================================
                    STEP 1B: Phone Number (Dial Pad)
                ========================================== */}
                {step === 1 && !showOrgDetails && (
                    <motion.div
                        key="phone"
                        variants={pageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'tween', duration: 0.25 }}
                        className="flex-1 flex flex-col px-6 pb-6"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Your phone number</h2>
                        <p className="text-gray-500 text-sm mb-6">We&apos;ll use this to verify your account</p>

                        {/* Country + Number display */}
                        <div className="flex items-center gap-3 mb-6">
                            <CountrySelector selectedCountry={country} onSelect={setCountry} />
                            <div className="flex-1 text-center">
                                <span className="text-3xl font-bold text-gray-900 tracking-wider">
                                    {phoneNumber ? formatPhone(phoneNumber) : (
                                        <span className="text-gray-300">000 00 00</span>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Dial pad */}
                        <div className="flex-1 flex items-center">
                            <DialPad
                                value={phoneNumber}
                                onChange={setPhoneNumber}
                                maxLength={7}
                            />
                        </div>

                        {/* Continue button */}
                        <button
                            type="button"
                            onClick={async () => {
                                setError(null);
                                setIsSendingSms(true);
                                try {
                                    const fullPhone = `${country.dialCode} ${formatPhone(phoneNumber)}`;
                                    if (mode === 'signup') {
                                        const exists = await checkPhoneExists(fullPhone);
                                        if (exists) {
                                            setError('This phone number is already registered. Please log in instead.');
                                            setIsSendingSms(false);
                                            return;
                                        }
                                    }
                                    
                                    // Ensure the container exists completely outside of React's lifecycle
                                    let rContainer = document.getElementById('recaptcha-container');
                                    if (!rContainer) {
                                        rContainer = document.createElement('div');
                                        rContainer.id = 'recaptcha-container';
                                        document.body.appendChild(rContainer);
                                    }

                                    // Make sure we have a clean slate on the window object
                                    if (!(window as any).recaptchaVerifier) {
                                        // Explicitly set testing flag right before use (don't rely on module init timing)
                                        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                                            auth.settings.appVerificationDisabledForTesting = true;
                                        }

                                        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                                            size: 'invisible'
                                        });
                                    }
                                    
                                    const verifier = (window as any).recaptchaVerifier;
                                    const result = await sendSmsVerification(fullPhone, verifier);
                                    setConfirmationResult(result);
                                    setStep(2);
                                } catch (err: any) {
                                    console.error(err);
                                    setError(err.message || 'Failed to send SMS');
                                    // Clear the verifier on failure
                                    if ((window as any).recaptchaVerifier) {
                                        try {
                                            (window as any).recaptchaVerifier.clear();
                                        } catch (e) {}
                                        (window as any).recaptchaVerifier = null;
                                    }
                                } finally {
                                    setIsSendingSms(false);
                                }
                            }}
                            disabled={phoneNumber.length < 7 || isSendingSms}
                            className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-opacity mt-4"
                        >
                            {isSendingSms ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Continue'}
                        </button>
                    </motion.div>
                )}

                {/* ==========================================
                    STEP 2: SMS Code Verification
                ========================================== */}
                {step === 2 && (
                    <motion.div
                        key="sms"
                        variants={pageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'tween', duration: 0.25 }}
                        className="flex-1 flex flex-col px-6 pb-6"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Enter Verification Code</h2>
                        <p className="text-gray-500 text-sm mb-6">We sent a 6-digit code to {formatPhone(phoneNumber)}</p>

                        <div className="flex gap-3 justify-center mb-8">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center transition-all text-xl font-bold ${
                                        smsCode[i] 
                                            ? 'border-gray-900 bg-white text-gray-900' 
                                            : error 
                                                ? 'border-red-300 bg-red-50'
                                                : 'border-gray-200 bg-gray-50'
                                    }`}
                                >
                                    {smsCode[i] || ''}
                                </div>
                            ))}
                        </div>

                        <div className="flex-1 flex items-center">
                            <DialPad
                                value={smsCode}
                                onChange={async (val) => {
                                    setSmsCode(val);
                                    setError(null);
                                    if (val.length === 6) {
                                        try {
                                            if (!confirmationResult) throw new Error('No SMS verification found');
                                            const newUid = await verifySmsCode(confirmationResult, val);
                                            setVerifiedUid(newUid);
                                            setStep(6);
                                        } catch (err: any) {
                                            console.error('SMS validation failed', err);
                                            setError(err.message || 'Incorrect verification code');
                                        }
                                    }
                                }}
                                maxLength={6}
                                showLetters={false}
                            />
                        </div>
                    </motion.div>
                )}

                {/* ==========================================
                    STEP 3: PIN Creation (Dial Pad)
                ========================================== */}
                {step === 6 && (
                    <motion.div
                        key="pin"
                        variants={pageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'tween', duration: 0.25 }}
                        className="flex-1 flex flex-col px-6 pb-6"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-1">
                            {pinStep === 'create' ? 'Create your PIN' : 'Confirm your PIN'}
                        </h2>
                        <p className="text-gray-500 text-sm mb-8">
                            {pinStep === 'create'
                                ? 'Choose a 6-digit PIN for quick sign in'
                                : 'Enter your PIN again to confirm'}
                        </p>

                        {/* PIN dots */}
                        <div className="flex gap-4 justify-center mb-8">
                            {[0, 1, 2, 3, 4, 5].map((i) => {
                                const currentPin = pinStep === 'create' ? pin : confirmPin;
                                return (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            scale: currentPin.length === i ? [1, 1.2, 1] : 1,
                                        }}
                                        className={`w-3 h-3 rounded-full transition-colors ${
                                            currentPin[i] ? 'bg-gray-900' : 'bg-gray-200'
                                        }`}
                                    />
                                );
                            })}
                        </div>

                        {/* Dial pad */}
                        <div className="flex-1 flex items-center">
                            <DialPad
                                value={pinStep === 'create' ? pin : confirmPin}
                                onChange={async (val) => {
                                    if (pinStep === 'create') {
                                        setPin(val);
                                        if (val.length === 6) {
                                            setTimeout(() => setPinStep('confirm'), 300);
                                        }
                                    } else {
                                        setConfirmPin(val);
                                        if (val.length === 6) {
                                            if (val === pin) {
                                                if (mode === 'forgot_pin') {
                                                    try {
                                                        if (!confirmationResult) throw new Error('No SMS verification found');
                                                        await resetPinWithSms(pin, confirmationResult, smsCode);
                                                        window.location.href = '/dashboard';
                                                    } catch (err: any) {
                                                        setError(err.message || 'Failed to reset PIN');
                                                    }
                                                } else {
                                                    setTimeout(() => setStep(3), 300);
                                                }
                                            } else {
                                                setError('PINs do not match. Please try again.');
                                                setConfirmPin('');
                                                setPinStep('create');
                                                setPin('');
                                            }
                                        }
                                    }
                                }}
                                maxLength={6}
                                showLetters={false}
                            />
                        </div>
                    </motion.div>
                )}

                {/* ==========================================
                    STEP 3: Profile Details
                ========================================== */}
                {step === 3 && (
                    <motion.div
                        key="profile"
                        variants={pageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'tween', duration: 0.25 }}
                        className="flex-1 flex flex-col px-6 pb-6"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-1">
                            {registrationType === 'organization' ? 'Organization details' : 'Your profile'}
                        </h2>
                        <p className="text-gray-500 text-sm mb-8">
                            {registrationType === 'organization' ? 'Add your organization name and logo' : 'Add your name and photo'}
                        </p>

                        {/* Profile image / Org Logo */}
                        <div className="flex flex-col items-center mb-8">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className={`${registrationType === 'organization' ? 'w-28 h-28 rounded-2xl' : 'w-24 h-24 rounded-full'} bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden border-2 border-dashed border-gray-300`}
                            >
                                {profileImage ? (
                                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    registrationType === 'organization' ? <Building2 className="w-8 h-8 text-gray-400" /> : <Camera className="w-7 h-7 text-gray-400" />
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                            <p className="text-xs text-gray-400 mt-2">
                                {profileImage ? 'Tap to change' : (registrationType === 'organization' ? 'Upload organization logo' : 'Add photo (optional)')}
                            </p>
                        </div>

                        {/* Name input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {registrationType === 'organization' ? 'Organization Name' : 'Full Name'}
                            </label>
                            <div className="relative">
                                {registrationType === 'organization' ? (
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                ) : (
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                )}
                                <input
                                    type="text"
                                    value={registrationType === 'organization' ? orgName : fullName}
                                    onChange={(e) => {
                                        if (registrationType === 'organization') {
                                            setOrgName(e.target.value);
                                            setFullName(e.target.value); // Sync to fullName for processing compatibility
                                        } else {
                                            setFullName(e.target.value);
                                        }
                                    }}
                                    placeholder={registrationType === 'organization' ? "e.g. Clean Gambia Services" : "Your full name"}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex-1" />

                        <button
                            type="button"
                            onClick={() => {
                                if (registrationType === 'waste_owner') {
                                    handleCompleteSignup();
                                } else {
                                    setStep(4);
                                }
                            }}
                            disabled={registrationType === 'organization' ? !orgName.trim() : !fullName.trim()}
                            className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                        >
                            {registrationType === 'waste_owner' ? 'Complete Setup' : 'Continue'}
                        </button>
                    </motion.div>
                )}

                {/* ==========================================
                    STEP 4: Vehicle Type (Collectors only)
                ========================================== */}
                {step === 4 && (
                    <motion.div
                        key="vehicle"
                        variants={pageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'tween', duration: 0.25 }}
                        className="flex-1 flex flex-col px-6 pb-6"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Your vehicle</h2>
                        <p className="text-gray-500 text-sm mb-6">What do you use to collect waste?</p>

                        <div className="space-y-3">
                            {VEHICLE_TYPES.map((vehicle) => (
                                <motion.button
                                    key={vehicle.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setVehicleType(vehicle.id)}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
                                        vehicleType === vehicle.id
                                            ? 'border-gray-900 bg-gray-50'
                                            : 'border-gray-100 hover:border-gray-300'
                                    }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        vehicleType === vehicle.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {vehicle.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
                                        <p className="text-sm text-gray-500">Up to {vehicle.capacity}</p>
                                    </div>
                                    {vehicleType === vehicle.id && (
                                        <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </motion.button>
                            ))}
                        </div>

                        <div className="flex-1" />

                        <button
                            type="button"
                            onClick={() => setStep(6)}
                            disabled={!vehicleType}
                            className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-opacity mt-4"
                        >
                            Continue
                        </button>
                    </motion.div>
                )}

                {/* ==========================================
                    STEP 5: Waste Types (Collectors only)
                ========================================== */}
                {step === 5 && (
                    <motion.div
                        key="waste-types"
                        variants={pageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'tween', duration: 0.25 }}
                        className="flex-1 flex flex-col px-6 pb-6"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Waste types</h2>
                        <p className="text-gray-500 text-sm mb-6">Select the types of waste you handle</p>

                        <div className="grid grid-cols-2 gap-3 flex-1">
                            {WASTE_TYPES.map((type) => {
                                const isSelected = selectedWasteTypes.includes(type.id);
                                return (
                                    <motion.button
                                        key={type.id}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedWasteTypes(prev => prev.filter(t => t !== type.id));
                                            } else {
                                                setSelectedWasteTypes(prev => [...prev, type.id]);
                                            }
                                        }}
                                        className={`p-4 rounded-2xl border-2 transition-all text-center ${
                                            isSelected
                                                ? 'border-gray-900 bg-gray-50'
                                                : 'border-gray-100 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="text-2xl mb-1 block">{type.icon}</span>
                                        <span className="text-sm font-medium text-gray-900">{type.name}</span>
                                        {isSelected && (
                                            <div className="mt-1 mx-auto w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={handleCompleteSignup}
                            disabled={selectedWasteTypes.length === 0 || isLoading}
                            className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-opacity mt-4"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Complete Setup'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
