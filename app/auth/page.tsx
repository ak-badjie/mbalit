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
    const { login, completeProfile, createAccount, checkPhoneExists, checkOrgCode, requestPinReset, lookupRecoveryEmailForPhone, sendPinResetEmail, isLoading, user } = useAuth();

    // Map any auth error (Firebase or otherwise) to a friendly, actionable message.
    const friendlyAuthError = (err: unknown): string => {
        const anyErr = err as { code?: string; message?: string } | null;
        const code = anyErr?.code || '';
        const msg = anyErr?.message || (typeof err === 'string' ? err : '');
        const haystack = `${code} ${msg}`;
        if (haystack.includes('operation-not-allowed')) {
            return 'Sign-in is currently disabled for this account type. Please contact support.';
        }
        if (haystack.includes('network-request-failed')) {
            return 'Network error — check your connection and try again.';
        }
        if (haystack.includes('too-many-requests')) {
            return 'Too many attempts. Please wait a minute and try again.';
        }
        if (haystack.includes('user-not-found') || haystack.includes('wrong-password') || haystack.includes('invalid-credential')) {
            return 'Invalid phone number or PIN.';
        }
        if (haystack.includes('email-already-in-use')) {
            return 'This phone number is already registered.';
        }
        if (haystack.includes('weak-password')) {
            return 'PIN is too weak. Please choose a different 6-digit PIN.';
        }
        return msg || 'Something went wrong. Please try again.';
    };

    // Flow state
    const [mode, setMode] = useState<'login' | 'signup'>(isSignupMode ? 'signup' : 'login');
    const [step, setStep] = useState(0); // 0 = role select, 1 = phone, 3 = profile, 4 = vehicle, 5 = waste types, 6 = pin
    const [registrationType, setRegistrationType] = useState<RegistrationType>(
        isCollectorMode ? 'collector' : null
    );

    // Login state
    const [loginPin, setLoginPin] = useState('');
    const [loginStep, setLoginStep] = useState(0); // 0 = phone, 1 = pin entry, 2 = forgot pin recovery
    const [error, setError] = useState<string | null>(null);

    // Forgot-PIN recovery state
    const [isSubmittingReset, setIsSubmittingReset] = useState(false);
    const [resetReference, setResetReference] = useState<string | null>(null);
    // Self-service email reset (when user has a verified recovery email).
    const [recoveryEmailOnFile, setRecoveryEmailOnFile] = useState<{ email: string; verified: boolean } | null>(null);
    const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
    const [resetEmailSentTo, setResetEmailSentTo] = useState<string | null>(null);
    const [isCheckingRecovery, setIsCheckingRecovery] = useState(false);

    // Registration shared state
    const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
    const [fullName, setFullName] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [createdUid, setCreatedUid] = useState<string | null>(null);


    // Organization state
    const [orgName, setOrgName] = useState('');
    const [joinOrgCode, setJoinOrgCode] = useState('');
    const [isJoiningOrg, setIsJoiningOrg] = useState(false);
    const [showOrgDetails, setShowOrgDetails] = useState(false);
    // Public-authority flag (KMC, BCC, etc.) — only meaningful when registering
    // a new organization. Drives access to the community Reports inbox.
    const [isAuthority, setIsAuthority] = useState(false);

    // Success State
    const [isSignupSuccess, setIsSignupSuccess] = useState(false);

    // Collector state
    const [vehicleType, setVehicleType] = useState<string | null>(null);
    const [selectedWasteTypes, setSelectedWasteTypes] = useState<WasteType[]>([]);

        const fileInputRef = useRef<HTMLInputElement>(null);

    const [isCreatingAccount, setIsCreatingAccount] = useState(false);
    const [isCheckingPhone, setIsCheckingPhone] = useState(false);
    const [noAccountFound, setNoAccountFound] = useState(false);

    // Reset all transient PIN/error state — used when switching mode or recovering.
    const resetTransientAuthState = () => {
        setPin('');
        setConfirmPin('');
        setPinStep('create');
        setLoginPin('');
        setError(null);
        setCreatedUid(null);
        setNoAccountFound(false);
        setIsCheckingPhone(false);
        setIsCreatingAccount(false);
        setRecoveryEmailOnFile(null);
        setResetEmailSentTo(null);
    };

    // When the user enters the Forgot PIN view, look up whether the account
    // has a verified recovery email so we can offer self-service reset.
    useEffect(() => {
        if (loginStep !== 2) return;
        let cancelled = false;
        const fullPhone = `${country.dialCode} ${formatPhone(phoneNumber)}`;
        if (!phoneNumber) return;
        setIsCheckingRecovery(true);
        setRecoveryEmailOnFile(null);
        lookupRecoveryEmailForPhone(fullPhone)
            .then((res) => {
                if (cancelled) return;
                setRecoveryEmailOnFile(res);
            })
            .finally(() => {
                if (!cancelled) setIsCheckingRecovery(false);
            });
        return () => { cancelled = true; };
    }, [loginStep, phoneNumber, country.dialCode, lookupRecoveryEmailForPhone]);

    // Auto-resume onboarding for any authenticated user with an incomplete profile,
    // or redirect to the appropriate dashboard if onboarding is already complete.
    useEffect(() => {
        if (!user) return;
        if (user.onboardingComplete === false) {
            // Only intervene when registrationType is null, which means this is
            // a fresh page load with no active signup session in progress.
            //
            // Firestore's onSnapshot fires TWICE for every write: once from the
            // local cache immediately, then again from the server once
            // serverTimestamp fields resolve. If we called setMode/setStep
            // unconditionally here, both fires would reset the user back to step
            // 3 (profile/picture) even while they are advancing through the
            // org/collector-specific steps (vehicle type → waste types). Moving
            // setMode/setStep INSIDE this guard means subsequent snapshot
            // re-fires during an active signup are no-ops and cannot interrupt
            // the user's progress.
            if (registrationType === null) {
                if (user.role === 'collector') {
                    if ('collectorType' in user && user.collectorType === 'organization') {
                        setRegistrationType('organization');
                        if ('organizationName' in user && typeof user.organizationName === 'string') {
                            setOrgName(user.organizationName);
                        }
                    } else {
                        setRegistrationType('collector');
                    }
                } else {
                    setRegistrationType('waste_owner');
                }
                // Resume at the profile step. submitCreateAccount also schedules
                // this via setTimeout so both paths converge correctly.
                setMode('signup');
                setStep(3);
                if (user.name) setFullName(user.name);
                if (user.profileImage) setProfileImage(user.profileImage);
            }
        } else if (user.onboardingComplete === true) {
            // Already onboarded — don't keep them stuck on /auth.
            // Use Next.js client-side navigation (router.replace) instead of
            // window.location.href so the AuthProvider stays mounted and keeps
            // its live user state. A hard navigation re-mounts AuthProvider on
            // the destination, where Firestore's onSnapshot fires from the
            // local cache FIRST with stale data — which made the dashboard
            // layout's onboardingComplete gate bounce back to /auth and trap
            // users in a loop on the profile-picture step.
            const isOrg = user.role === 'collector' && 'collectorType' in user && user.collectorType === 'organization';
            if (isOrg) {
                router.replace('/organization/dashboard');
            } else if (user.role === 'collector') {
                router.replace('/collector/dashboard');
            } else {
                router.replace('/dashboard');
            }
        }
    }, [user]);

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
            // Phone + PIN login - use the selected country's dial code (must match signup)
            const fullPhone = `${country.dialCode} ${formatPhone(phoneNumber)}`;
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
                    router.replace('/organization/dashboard');
                } else if (userData.role === 'collector') {
                    router.replace('/collector/dashboard');
                } else {
                    router.replace('/dashboard');
                }
            } else {
                router.replace('/dashboard');
            }
        } catch (err: unknown) {
            setError(friendlyAuthError(err));
            // Only clear the PIN when the credential itself was wrong.
            // For transient/config errors (network, operation-not-allowed,
            // too-many-requests, etc.) the PIN is fine — let the user retry
            // without retyping it.
            const code = (err as { code?: string; message?: string })?.code || '';
            const msg = (err as { message?: string })?.message || '';
            const haystack = `${code} ${msg}`;
            const isCredentialError =
                haystack.includes('user-not-found') ||
                haystack.includes('wrong-password') ||
                haystack.includes('invalid-credential');
            if (isCredentialError) {
                setLoginPin('');
            }
        }
    };

    // Run the create-account request. Extracted so the PIN-confirm dial pad
    // and the "Try again" recovery button can both invoke it without making
    // the user re-enter their 6-digit PIN.
    const submitCreateAccount = async () => {
        if (pin.length !== 6 || confirmPin.length !== 6 || pin !== confirmPin) return;
        const fullPhone = `${country.dialCode} ${formatPhone(phoneNumber)}`;
        setIsCreatingAccount(true);
        setError(null);
        try {
            const newUid = await createAccount(fullPhone, pin);
            setCreatedUid(newUid);
            setTimeout(() => setStep(3), 300);
        } catch (err: unknown) {
            const code = (err as { code?: string; message?: string })?.code || '';
            const msg = (err as { message?: string })?.message || '';
            const haystack = `${code} ${msg}`;
            const isDup = haystack.includes('email-already-in-use');

            if (isDup) {
                // Silent recovery: maybe an abandoned previous signup.
                // Try to sign in with the same PIN before bothering the user.
                try {
                    const uid = await login(fullPhone, pin);
                    setCreatedUid(uid);
                    const usersRef = collection(db, 'users');
                    const lookupSnap = await getDocs(query(usersRef, where('phone', '==', fullPhone)));
                    const docData = lookupSnap.empty ? null : lookupSnap.docs[0].data();
                    if (docData && docData.onboardingComplete === true) {
                        if (docData.role === 'collector' && docData.collectorType === 'organization') {
                            router.replace('/organization/dashboard');
                        } else if (docData.role === 'collector') {
                            router.replace('/collector/dashboard');
                        } else {
                            router.replace('/dashboard');
                        }
                        return;
                    }
                    // Account exists but onboarding incomplete → resume at profile step.
                    setTimeout(() => setStep(3), 300);
                    return;
                } catch {
                    // Sign-in with same PIN also failed — they have an account but a different PIN.
                    resetTransientAuthState();
                    setMode('login');
                    setLoginStep(1);
                    setError('This phone is already registered. Please enter your existing PIN.');
                    return;
                }
            }

            // Wrong-PIN-style errors don't apply to account creation, so any
            // remaining error is transient/config (network, operation-not-allowed,
            // too-many-requests, weak-password). Keep BOTH pins intact so the
            // user only re-creates them once — never asked for the PIN more
            // than twice. The "Try again" button below will re-run this.
            setError(friendlyAuthError(err));
        } finally {
            setIsCreatingAccount(false);
        }
    };

    // Handle signup completion
    const handleCompleteSignup = async () => {
        setError(null);
        const fullPhone = `${country.dialCode} ${formatPhone(phoneNumber)}`;

        try {
            let userId = user?.id || createdUid;

            if (!userId) {
                setError('No user account found. Please try again.');
                return;
            }

            if (registrationType === 'waste_owner') {
                await completeProfile(userId, fullPhone, pin, {
                    name: fullName,
                    profileImage: profileImage || '',
                    role: 'user',
                });
                setIsSignupSuccess(true);
                // Navigate immediately via Next.js router so AuthProvider stays
                // mounted with the freshly merged onboardingComplete=true user
                // state. A hard window.location navigation re-mounts the
                // provider and Firestore's cache-first snapshot delivers stale
                // data, which the dashboard layout interprets as
                // "still onboarding" and bounces back to /auth — looping the
                // user on the profile step. The success animation can play
                // briefly before the route transition completes.
                setTimeout(() => {
                    router.replace('/dashboard');
                }, 600);
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
                    collectorData.isAuthority = isAuthority;
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
                        isAuthority,
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
                        router.replace('/organization/dashboard');
                    } else {
                        router.replace('/collector/dashboard');
                    }
                }, 600);
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
                    setStep(1); // Go back to phone
                }
                return;
            }
            if (step === 3) {
                // Profile step - cannot go back since the account is already created
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
        if (registrationType === 'waste_owner') return 3; // phone, pin, profile
        return 6; // org, phone, pin, profile, vehicle, waste types
    };

    const getCurrentDisplayStep = () => {
        // Map internal step numbers (0,1,3,4,5,6) to sequential display positions
        if (registrationType === 'waste_owner') {
            // 1=phone, 6=pin, 3=profile
            if (step === 1) return 1;
            if (step === 6) return 2;
            if (step === 3) return 3;
            return step;
        }
        // collector/organization: 1A=org, 1B=phone, 6=pin, 3=profile, 4=vehicle, 5=waste
        if (step === 1 && showOrgDetails) return 1;
        if (step === 1 && !showOrgDetails) return 2;
        if (step === 6) return 3;
        if (step === 3) return 4;
        if (step === 4) return 5;
        if (step === 5) return 6;
        return step;
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
                        
                        <div className="mt-8 text-center">
                            {isLoading && <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-900" />}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setError(null);
                                setLoginPin('');
                                setResetReference(null);
                                setLoginStep(2);
                            }}
                            className="mt-4 text-sm font-medium text-gray-700 underline underline-offset-4"
                        >
                            Forgot PIN?
                        </button>
                    </div>
                </div>
            );
        }

        // Step 2: Forgot-PIN recovery flow
        if (loginStep === 2) {
            const fullPhone = `${country.dialCode} ${formatPhone(phoneNumber)}`;
            const obscureEmail = (e: string) => {
                const [user, domain] = e.split('@');
                if (!user || !domain) return e;
                const head = user.length <= 2 ? user[0] || '' : user.slice(0, 2);
                return `${head}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`;
            };
            return (
                <div className="h-[100dvh] overflow-hidden bg-white flex flex-col">
                    <div className="flex items-center pt-16 px-6 mb-8">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                setLoginStep(1);
                                setError(null);
                                setResetReference(null);
                            }}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-900" />
                        </motion.button>
                        <div className="flex-1 text-center font-semibold text-gray-900 pr-8">
                            Reset PIN
                        </div>
                    </div>

                    <div className="flex-1 px-6 flex flex-col items-center pb-safe overflow-y-auto">
                        {resetEmailSentTo ? (
                            <div className="w-full max-w-sm mt-6">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                                    <Check className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                                    Check your email
                                </h1>
                                <p className="text-gray-500 text-center mb-6">
                                    We sent a reset link to{' '}
                                    <span className="font-medium text-gray-900">{resetEmailSentTo}</span>.
                                    Open it from this device and you&apos;ll be able to set a new 6-digit PIN.
                                </p>
                                <p className="text-xs text-gray-500 text-center mb-6">
                                    The link expires in about an hour. Check your spam folder if you don&apos;t see it.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setResetEmailSentTo(null);
                                        setError(null);
                                        setLoginStep(0);
                                        setPhoneNumber('');
                                    }}
                                    className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl"
                                >
                                    Back to sign in
                                </button>
                            </div>
                        ) : resetReference ? (
                            <div className="w-full max-w-sm mt-6">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                                    <Check className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                                    Request received
                                </h1>
                                <p className="text-gray-500 text-center mb-6">
                                    Our support team will contact you on{' '}
                                    <span className="font-medium text-gray-900">{fullPhone}</span>{' '}
                                    within 24 hours to verify your identity. Once verified you&apos;ll be issued a temporary PIN that you can change after signing in.
                                </p>
                                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl mb-6">
                                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Reference</p>
                                    <p className="font-mono font-semibold text-gray-900 text-lg">{resetReference}</p>
                                    <p className="text-xs text-gray-500 mt-2">Quote this code when our team calls you.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setResetReference(null);
                                        setError(null);
                                        setLoginStep(0);
                                        setPhoneNumber('');
                                    }}
                                    className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl"
                                >
                                    Back to sign in
                                </button>
                            </div>
                        ) : (
                            <div className="w-full max-w-sm mt-6">
                                <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                                    Forgot your PIN?
                                </h1>
                                <p className="text-gray-500 text-center mb-6">
                                    For your security we don&apos;t reset PINs based on a phone number alone. Submit a reset request and our support team will verify your identity before issuing a temporary PIN.
                                </p>

                                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl mb-6">
                                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Account phone</p>
                                    <p className="font-semibold text-gray-900">{fullPhone}</p>
                                </div>

                                {error && (
                                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl">
                                        <p className="text-sm text-red-600 text-center">{error}</p>
                                    </div>
                                )}

                                {/* Self-service: only shown when the account has a verified
                                    recovery email on file. */}
                                {recoveryEmailOnFile && recoveryEmailOnFile.verified && (
                                    <div className="mb-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                        <p className="text-sm text-emerald-800">
                                            A recovery email is on file:{' '}
                                            <span className="font-medium">{obscureEmail(recoveryEmailOnFile.email)}</span>
                                        </p>
                                    </div>
                                )}

                                {recoveryEmailOnFile && recoveryEmailOnFile.verified && (
                                    <button
                                        type="button"
                                        disabled={isSendingResetEmail}
                                        onClick={async () => {
                                            setError(null);
                                            setIsSendingResetEmail(true);
                                            try {
                                                const { email } = await sendPinResetEmail(fullPhone);
                                                setResetEmailSentTo(email);
                                            } catch (err: unknown) {
                                                const msg = err instanceof Error ? err.message : friendlyAuthError(err);
                                                setError(msg);
                                            } finally {
                                                setIsSendingResetEmail(false);
                                            }
                                        }}
                                        className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-50 flex items-center justify-center mb-3"
                                    >
                                        {isSendingResetEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Email me a reset link'}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    disabled={isSubmittingReset}
                                    onClick={async () => {
                                        setError(null);
                                        setIsSubmittingReset(true);
                                        try {
                                            const result = await requestPinReset(fullPhone);
                                            setResetReference(result.referenceCode);
                                        } catch (err: unknown) {
                                            const msg = err instanceof Error ? err.message : friendlyAuthError(err);
                                            setError(msg);
                                        } finally {
                                            setIsSubmittingReset(false);
                                        }
                                    }}
                                    className={`w-full py-4 font-semibold rounded-2xl disabled:opacity-50 flex items-center justify-center ${
                                        recoveryEmailOnFile && recoveryEmailOnFile.verified
                                            ? 'bg-white border-2 border-gray-900 text-gray-900'
                                            : 'bg-gray-900 text-white'
                                    }`}
                                >
                                    {isSubmittingReset
                                        ? <Loader2 className="w-5 h-5 animate-spin" />
                                        : recoveryEmailOnFile && recoveryEmailOnFile.verified
                                            ? 'Use support-assisted reset instead'
                                            : 'Submit reset request'}
                                </button>

                                {isCheckingRecovery && (
                                    <p className="text-xs text-center text-gray-400 mt-3">
                                        Checking for a recovery email…
                                    </p>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setError(null);
                                        setResetReference(null);
                                        setLoginStep(1);
                                    }}
                                    className="w-full py-3 mt-3 text-sm text-gray-500"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
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

                    {/* Continue button — checks if account exists before asking for PIN */}
                    <button
                        type="button"
                        onClick={async () => {
                            setError(null);
                            setNoAccountFound(false);
                            const fullPhone = `${country.dialCode} ${formatPhone(phoneNumber)}`;
                            setIsCheckingPhone(true);
                            try {
                                const exists = await checkPhoneExists(fullPhone);
                                if (!exists) {
                                    setNoAccountFound(true);
                                    setError('No account found for this number.');
                                    return;
                                }
                                setLoginStep(1);
                            } catch (err: unknown) {
                                setError(friendlyAuthError(err));
                            } finally {
                                setIsCheckingPhone(false);
                            }
                        }}
                        disabled={phoneNumber.length < 7 || isCheckingPhone}
                        className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity mt-8 flex items-center justify-center"
                    >
                        {isCheckingPhone ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                    </button>

                    {/* "No account found" recovery: one-tap switch to signup with phone preserved */}
                    {noAccountFound && (
                        <button
                            type="button"
                            onClick={() => {
                                resetTransientAuthState();
                                setMode('signup');
                                setStep(0);
                                // phoneNumber + country are preserved across mode switch
                            }}
                            className="w-full py-3 mt-3 border-2 border-gray-900 text-gray-900 font-semibold rounded-2xl"
                        >
                            Sign up with this number
                        </button>
                    )}

                    {/* Switch to signup */}
                    <div className="mt-8 text-center pb-6">
                        <button
                            type="button"
                            onClick={() => {
                                resetTransientAuthState();
                                setMode('signup');
                                setStep(0);
                            }}
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
                            onClick={() => {
                                resetTransientAuthState();
                                setMode('login');
                                setLoginStep(0);
                            }}
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
                {step === 3 || step === 4 || step === 5 ? (
                    <div className="w-9" />
                ) : (
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleBack}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </motion.button>
                )}

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
                        <p className="text-gray-500 text-sm mb-6">We&apos;ll use this as your account ID</p>

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
                                setIsCheckingPhone(true);
                                try {
                                    const fullPhone = `${country.dialCode} ${formatPhone(phoneNumber)}`;
                                    if (mode === 'signup') {
                                        const exists = await checkPhoneExists(fullPhone);
                                        if (exists) {
                                            // Auto-switch to login mode preserving phone — no dead end.
                                            resetTransientAuthState();
                                            setMode('login');
                                            setLoginStep(1);
                                            setError('This phone is already registered. Please enter your existing PIN.');
                                            return;
                                        }
                                    }
                                    setStep(6);
                                } catch (err: unknown) {
                                    setError(friendlyAuthError(err));
                                } finally {
                                    setIsCheckingPhone(false);
                                }
                            }}
                            disabled={phoneNumber.length < 7 || isCheckingPhone}
                            className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-opacity mt-4"
                        >
                            Continue
                        </button>
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

                        {/* Dial pad — replaced with loader during account creation,
                            or with a "Try again" button after a transient failure
                            so the user never has to re-enter their PIN. */}
                        <div className="flex-1 flex items-center">
                            {isCreatingAccount ? (
                                <div className="w-full flex flex-col items-center justify-center gap-4 py-12">
                                    <Loader2 className="w-10 h-10 animate-spin text-gray-900" />
                                    <p className="text-gray-600 font-medium">Creating your account…</p>
                                </div>
                            ) : pinStep === 'confirm' && pin.length === 6 && confirmPin.length === 6 && error ? (
                                <div className="w-full flex flex-col items-center justify-center gap-4 py-8">
                                    <button
                                        type="button"
                                        onClick={submitCreateAccount}
                                        className="w-full max-w-sm py-4 bg-gray-900 text-white font-semibold rounded-2xl"
                                    >
                                        Try again
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError(null);
                                            setPin('');
                                            setConfirmPin('');
                                            setPinStep('create');
                                        }}
                                        className="text-sm text-gray-500 underline"
                                    >
                                        Choose a different PIN
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full flex flex-col">
                                    <DialPad
                                        value={pinStep === 'create' ? pin : confirmPin}
                                        onChange={(val) => {
                                            if (isCreatingAccount) return; // ignore key presses mid-request
                                            if (pinStep === 'create') {
                                                setPin(val);
                                                if (val.length === 6) {
                                                    setTimeout(() => setPinStep('confirm'), 300);
                                                }
                                            } else {
                                                setConfirmPin(val);
                                                // Detect mismatch as soon as the 6th digit is entered,
                                                // but do NOT auto-submit on match — wait for the
                                                // explicit Continue tap below.
                                                if (val.length === 6 && val !== pin) {
                                                    setError('PINs do not match. Please try again.');
                                                    setConfirmPin('');
                                                    setPinStep('create');
                                                    setPin('');
                                                }
                                            }
                                        }}
                                        maxLength={6}
                                        showLetters={false}
                                    />

                                    {/* Explicit Continue button on the confirm step so the user
                                        sees a clear next action after entering their PIN twice. */}
                                    {pinStep === 'confirm' && (
                                        <button
                                            type="button"
                                            onClick={submitCreateAccount}
                                            disabled={confirmPin.length !== 6 || confirmPin !== pin}
                                            className="w-full py-4 mt-6 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                                        >
                                            Continue
                                        </button>
                                    )}
                                </div>
                            )}
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

                        {/* Authority toggle (organizations only) */}
                        {registrationType === 'organization' && (
                            <button
                                type="button"
                                onClick={() => setIsAuthority((v) => !v)}
                                className={`mb-6 w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                                    isAuthority ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isAuthority ? 'bg-gray-900' : 'bg-white border-2 border-gray-300'
                                }`}>
                                    {isAuthority && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900 text-sm">We are a public authority</p>
                                    <p className="text-xs text-gray-500 mt-1 leading-snug">
                                        Authorities (KMC, BCC, etc.) receive environmental hazard reports from the community and can act on them.
                                    </p>
                                </div>
                            </button>
                        )}

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
