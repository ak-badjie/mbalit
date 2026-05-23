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
    User as UserIcon,
    Shield,
    ChevronRight,
    ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TruckLogo from '@/components/ui/truck-logo';
import { DialPad } from '@/components/ui/dial-pad';
import { CountrySelector, DEFAULT_COUNTRY } from '@/components/ui/country-selector';
import type { Country } from '@/components/ui/country-selector';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { WASTE_TYPES } from '@/lib/waste-config';
import { WasteType, CollectorType } from '@/types';
import { compressImage } from '@/lib/image-utils';
import { RoleCard } from '@/components/ui/role-card';
import { MbButton } from '@/components/ui/mb-button';

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
            <div className="min-h-[100dvh] flex items-center justify-center bg-white">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                </div>
            </div>
        }>
            <AuthPage />
        </Suspense>
    );
}

type RegistrationType = 'waste_owner' | 'collector' | 'organization' | 'government' | null;

type SignupSubRole = 'resident' | 'business_waste' | 'collection_business' | 'driver' | 'government';

// Step 0a: high-level track picker
function TrackPicker({
    onPickHave,
    onPickCollect,
}: {
    onPickHave: () => void;
    onPickCollect: () => void;
}) {
    return (
        <>
            <h1 className="text-[24px] font-extrabold text-[#0F1A14] leading-tight mb-1">
                What brings you to MBalit?
            </h1>
            <p className="text-sm text-gray-500 mb-4 leading-snug">
                Pick the option that best describes you — you can change this later.
            </p>
            <div className="space-y-3">
                <RoleCard
                    icon={<Trash2 className="w-6 h-6" strokeWidth={2} />}
                    title="I want my waste collected"
                    description="Residents, businesses, or anyone who needs their waste picked up."
                    badge="Most Popular"
                    onClick={onPickHave}
                />
                <RoleCard
                    icon={<Truck className="w-6 h-6" strokeWidth={2} />}
                    title="I collect waste"
                    description="Waste-collection businesses, drivers, or municipalities."
                    onClick={onPickCollect}
                />
            </div>
        </>
    );
}

// Step 0b1: sub-picker when the user wants waste collected
function HaveWasteSubPicker({
    picked,
    onPick,
}: {
    picked: SignupSubRole | null;
    onPick: (r: SignupSubRole) => void;
}) {
    return (
        <>
            <h1 className="text-[24px] font-extrabold text-[#0F1A14] leading-tight mb-1">
                Tell us a bit more
            </h1>
            <p className="text-sm text-gray-500 mb-4 leading-snug">
                Are you signing up as an individual or a business?
            </p>
            <div className="space-y-3">
                <RoleCard
                    icon={<UserIcon className="w-6 h-6" strokeWidth={2} />}
                    title="Resident"
                    description="Schedule pickups for your home and stay updated on waste collection."
                    badge="Most Popular"
                    selected={picked === 'resident'}
                    onClick={() => onPick('resident')}
                />
                <RoleCard
                    icon={<Building2 className="w-6 h-6" strokeWidth={2} />}
                    title="Business / Organization"
                    description="A company, school or office that needs regular waste pickups."
                    selected={picked === 'business_waste'}
                    onClick={() => onPick('business_waste')}
                />
            </div>
        </>
    );
}

// Step 0b2: sub-picker when the user collects waste
function CollectWasteSubPicker({
    picked,
    onPick,
}: {
    picked: SignupSubRole | null;
    onPick: (r: SignupSubRole) => void;
}) {
    return (
        <>
            <h1 className="text-[24px] font-extrabold text-[#0F1A14] leading-tight mb-1">
                How do you collect?
            </h1>
            <p className="text-sm text-gray-500 mb-4 leading-snug">
                Pick the option that matches your role.
            </p>
            <div className="space-y-3">
                <RoleCard
                    icon={<Building2 className="w-6 h-6" strokeWidth={2} />}
                    title="Waste-collection business"
                    description="Run your own collection company with drivers under you."
                    selected={picked === 'collection_business'}
                    onClick={() => onPick('collection_business')}
                />
                <RoleCard
                    icon={<Truck className="w-6 h-6" strokeWidth={2} />}
                    title="Driver under an organization"
                    description="You'll need the organization code from your employer."
                    selected={picked === 'driver'}
                    onClick={() => onPick('driver')}
                />
                <RoleCard
                    icon={<Shield className="w-6 h-6" strokeWidth={2} />}
                    title="Government / Municipality"
                    description="Track reports, oversee operations, and make data-driven decisions."
                    selected={picked === 'government'}
                    onClick={() => onPick('government')}
                />
            </div>
        </>
    );
}

function AuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isSignupMode = searchParams.get('signup') === 'true';
    const isCollectorMode = searchParams.get('role') === 'collector';
    const { login, completeProfile, createAccount, checkPhoneExists, checkOrgCode, requestPinReset, isLoading, user } = useAuth();

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

    // Forgot-PIN recovery state (support-assisted only)
    const [isSubmittingReset, setIsSubmittingReset] = useState(false);
    const [resetReference, setResetReference] = useState<string | null>(null);

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
    // Two-step picker on step 0: first the user picks the high-level track
    // ("having waste collected" vs "collecting waste"); then a sub-role
    // within that track. We translate the sub-role to the existing
    // RegistrationType when the user taps Continue.
    type SignupTrack = 'have' | 'collect' | null;
    type SubRole = 'resident' | 'business_waste' | 'collection_business' | 'driver' | 'government' | null;
    const [signupTrack, setSignupTrack] = useState<SignupTrack>(null);
    const [pickedSubRole, setPickedSubRole] = useState<SubRole>(null);
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
    };

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
        // When the user resumes onboarding after being bounced from the dashboard
        // (e.g. the dashboard layout detected onboardingComplete:false and sent
        // them back to /auth?continue=onboarding), phoneNumber state is empty
        // because they never went through step 1 in this page-load. Fall back to
        // the phone already stored on their Firestore document so completeProfile
        // never overwrites the correct phone with a blank/malformed value.
        const fullPhone = user?.phone || `${country.dialCode} ${formatPhone(phoneNumber)}`;

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
            <div className="min-h-[100dvh] bg-white flex items-center justify-center flex-col pb-16">
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
        // Step 1: Full screen PIN entry for phone login (Mockup 1 style)
        if (loginStep === 1) {
            const cursor = loginPin.length;
            return (
                <div className="min-h-[100dvh] bg-white flex flex-col">
                    <div className="flex items-center px-5 pt-12 pb-2">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setLoginStep(0); setLoginPin(''); setError(null); }}
                            className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full hover:bg-gray-50 text-[#0E7A3B]"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </motion.button>
                    </div>

                    <div className="flex-1 px-5 pb-6">
                        {/* Heading row + verify illustration */}
                        <div className="relative flex items-start justify-between gap-3 mb-5">
                            <div className="flex-1 pt-1 z-10">
                                <h1 className="text-[28px] font-extrabold text-[#0F1A14] leading-tight">Log In</h1>
                                <p className="text-sm text-gray-500 mt-2 max-w-[14rem] leading-snug">
                                    Enter your 6-digit PIN to access your MBalit account.
                                </p>
                                <div className="mt-4 flex items-center gap-2">
                                    <span className="w-6 h-6 inline-flex">{country.flag}</span>
                                    <span className="text-sm font-semibold text-[#0F1A14]">
                                        {country.dialCode} {formatPhone(phoneNumber)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { setLoginStep(0); setLoginPin(''); setError(null); }}
                                        className="text-sm font-bold text-[#0E7A3B] ml-2 hover:underline"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>
                            <img
                                src="/illustrations/verify-phone.svg"
                                alt=""
                                className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 -mt-2"
                            />
                        </div>

                        <label className="block text-sm font-bold text-[#0F1A14] mb-2">
                            Enter 6-digit PIN
                        </label>
                        <div className="flex gap-2.5 justify-start mb-3">
                            {[0, 1, 2, 3, 4, 5].map((i) => {
                                const filled = !!loginPin[i];
                                const isActive = i === cursor;
                                return (
                                    <div
                                        key={i}
                                        className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center transition-all text-xl font-bold
                                            ${error
                                                ? 'border-red-400 bg-red-50 text-red-600'
                                                : isActive && !filled
                                                    ? 'border-[#0E7A3B] bg-white text-[#0E7A3B]'
                                                    : filled
                                                        ? 'border-[#0E7A3B] bg-white text-[#0F1A14]'
                                                        : 'border-gray-200 bg-white text-gray-300'}
                                        `}
                                    >
                                        {filled ? '•' : isActive ? (
                                            <span className="w-px h-6 bg-[#0E7A3B] animate-pulse" />
                                        ) : ''}
                                    </div>
                                );
                            })}
                        </div>

                        {error && (
                            <div className="mt-3 mb-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-sm text-red-600 text-center">{error}</p>
                            </div>
                        )}

                        <div className="mt-4 flex items-start gap-2">
                            <Shield className="w-4 h-4 text-[#0E7A3B] mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-gray-500">
                                Never share your PIN with anyone — not even MBalit support.
                            </p>
                        </div>

                        <div className="mt-6">
                            <DialPad
                                value={loginPin}
                                onChange={(val) => {
                                    setLoginPin(val);
                                    setError(null);
                                    if (val.length === 6) {
                                        handleLogin(undefined, val);
                                    }
                                }}
                                maxLength={6}
                                showLetters={true}
                            />
                        </div>

                        <div className="mt-4 text-center">
                            {isLoading && <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0E7A3B]" />}
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

        // Step 2: Forgot-PIN recovery flow (support-assisted only)
        if (loginStep === 2) {
            const fullPhone = `${country.dialCode} ${formatPhone(phoneNumber)}`;
            return (
                <div className="min-h-[100dvh] bg-white flex flex-col">
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
                        {resetReference ? (
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
                                    className="w-full py-4 bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-bold rounded-2xl"
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
                                    className="w-full py-4 font-bold rounded-2xl disabled:opacity-50 flex items-center justify-center bg-[#0E7A3B] hover:bg-[#0a6230] text-white"
                                >
                                    {isSubmittingReset
                                        ? <Loader2 className="w-5 h-5 animate-spin" />
                                        : 'Submit reset request'}
                                </button>

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
            <div className="min-h-[100dvh] bg-white flex flex-col">
                {/* Header */}
                <div className="relative flex items-center justify-center pt-12 pb-6 px-6">
                    <button
                        onClick={() => router.push('/')}
                        className="absolute left-5 top-12 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 text-[#0E7A3B]"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <TruckLogo size="lg" showText={true} />
                </div>

                <div className="flex-1 px-6 pb-6 flex flex-col">
                    <h1 className="text-[28px] font-extrabold text-[#0F1A14] leading-tight mb-1">Log In</h1>
                    <p className="text-gray-500 mb-6">Enter your phone number to continue.</p>

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
                        className="w-full py-4 bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-bold rounded-2xl shadow-[0_10px_25px_rgba(14,122,59,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-8 flex items-center justify-center"
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
    // SIGNUP: STEP 0 — Two-step picker
    //   0a: high-level track (have waste vs collect waste)
    //   0b: sub-role within that track
    // ==========================================
    if (mode === 'signup' && step === 0) {
        const onBack = () => {
            if (signupTrack) {
                // Second screen — go back to the track picker
                setSignupTrack(null);
                setPickedSubRole(null);
            } else {
                router.push('/');
            }
        };

        const advance = () => {
            if (!pickedSubRole) return;
            if (pickedSubRole === 'resident' || pickedSubRole === 'business_waste') {
                handleRoleSelect('waste_owner');
            } else if (pickedSubRole === 'collection_business') {
                setIsJoiningOrg(false);
                handleRoleSelect('organization');
            } else if (pickedSubRole === 'driver') {
                // Driver under an existing org — show the org-code entry first.
                setIsJoiningOrg(true);
                setRegistrationType('collector');
                setShowOrgDetails(true);
                setStep(1);
            } else if (pickedSubRole === 'government') {
                setIsAuthority(true);
                handleRoleSelect('organization');
            }
        };

        return (
            <div className="min-h-[100dvh] bg-white flex flex-col">
                <div className="flex items-center px-5 pt-12 pb-2">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full hover:bg-gray-50 text-[#0E7A3B]"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 pb-6">
                    <img
                        src="/illustrations/role-hero.jpg"
                        alt="MBalit — Sign Up"
                        className="block w-full h-auto mb-5"
                    />

                    <div className="px-5">
                        {!signupTrack ? (
                            <TrackPicker
                                onPickHave={() => setSignupTrack('have')}
                                onPickCollect={() => setSignupTrack('collect')}
                            />
                        ) : signupTrack === 'have' ? (
                            <HaveWasteSubPicker
                                picked={pickedSubRole}
                                onPick={(r) => setPickedSubRole(r)}
                            />
                        ) : (
                            <CollectWasteSubPicker
                                picked={pickedSubRole}
                                onPick={(r) => setPickedSubRole(r)}
                            />
                        )}

                        {/* Reassurance pill */}
                        <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-[#E8F6EE] border border-[#D2F4E1]">
                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                                <Shield className="w-5 h-5 text-[#0E7A3B]" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[#0F1A14] text-sm">Don&apos;t worry!</h4>
                                <p className="text-xs text-gray-600 leading-snug">
                                    You can switch roles later from settings.
                                </p>
                            </div>
                        </div>

                        {signupTrack && (
                            <div className="mt-6">
                                <MbButton
                                    size="lg"
                                    disabled={!pickedSubRole}
                                    rightIcon={<ArrowRight className="w-5 h-5" />}
                                    onClick={advance}
                                >
                                    Continue
                                </MbButton>
                            </div>
                        )}

                        <div className="mt-5 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    resetTransientAuthState();
                                    setSignupTrack(null);
                                    setPickedSubRole(null);
                                    setMode('login');
                                    setLoginStep(0);
                                }}
                                className="text-sm text-gray-500"
                            >
                                Already have an account? <span className="font-semibold text-[#0E7A3B]">Log In</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // SIGNUP STEPS (Full-screen)
    // ==========================================
    return (
        <div className="min-h-[100dvh] bg-white flex flex-col">
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
                                i + 1 <= getCurrentDisplayStep() ? 'w-6 bg-[#0E7A3B]' : 'w-1.5 bg-gray-200'
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
                            className="w-full py-4 bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-bold rounded-2xl shadow-[0_10px_25px_rgba(14,122,59,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-4"
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
                            className="w-full py-4 bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-bold rounded-2xl shadow-[0_10px_25px_rgba(14,122,59,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-4"
                        >
                            Continue
                        </button>
                    </motion.div>
                )}

                {/* ==========================================
                    STEP 6: PIN Creation (Mockup 1 style)
                ========================================== */}
                {step === 6 && (
                    <motion.div
                        key="pin"
                        variants={pageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'tween', duration: 0.25 }}
                        className="flex-1 flex flex-col px-5 pb-6"
                    >
                        <div className="relative flex items-start justify-between gap-3 mb-5">
                            <div className="flex-1 pt-1 z-10">
                                <h2 className="text-[26px] font-extrabold text-[#0F1A14] leading-tight">
                                    {pinStep === 'create' ? 'Create Your PIN' : 'Confirm Your PIN'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-2 max-w-[15rem] leading-snug">
                                    {pinStep === 'create'
                                        ? 'Choose a 6-digit PIN for quick sign in.'
                                        : 'Enter your PIN again to confirm.'}
                                </p>
                            </div>
                            <img
                                src="/illustrations/verify-phone.svg"
                                alt=""
                                className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 -mt-2"
                            />
                        </div>

                        <label className="block text-sm font-bold text-[#0F1A14] mb-2">
                            Enter 6-digit PIN
                        </label>
                        <div className="flex gap-2.5 justify-start mb-3">
                            {[0, 1, 2, 3, 4, 5].map((i) => {
                                const currentPin = pinStep === 'create' ? pin : confirmPin;
                                const filled = !!currentPin[i];
                                const isActive = i === currentPin.length;
                                return (
                                    <div
                                        key={i}
                                        className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center transition-all text-xl font-bold
                                            ${error
                                                ? 'border-red-400 bg-red-50 text-red-600'
                                                : isActive && !filled
                                                    ? 'border-[#0E7A3B] bg-white text-[#0E7A3B]'
                                                    : filled
                                                        ? 'border-[#0E7A3B] bg-white text-[#0F1A14]'
                                                        : 'border-gray-200 bg-white text-gray-300'}
                                        `}
                                    >
                                        {filled ? '•' : isActive ? (
                                            <span className="w-px h-6 bg-[#0E7A3B] animate-pulse" />
                                        ) : ''}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-3 flex items-start gap-2">
                            <Shield className="w-4 h-4 text-[#0E7A3B] mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-gray-500">
                                Never share your PIN with anyone — not even MBalit support.
                            </p>
                        </div>

                        {/* Dial pad — replaced with loader during account creation,
                            or with a "Try again" button after a transient failure
                            so the user never has to re-enter their PIN. */}
                        <div className="mt-5">
                            {isCreatingAccount ? (
                                <div className="w-full flex flex-col items-center justify-center gap-4 py-12">
                                    <Loader2 className="w-10 h-10 animate-spin text-[#0E7A3B]" />
                                    <p className="text-gray-600 font-medium">Creating your account…</p>
                                </div>
                            ) : pinStep === 'confirm' && pin.length === 6 && confirmPin.length === 6 && error ? (
                                <div className="w-full flex flex-col items-center justify-center gap-4 py-4">
                                    <button
                                        type="button"
                                        onClick={submitCreateAccount}
                                        className="w-full max-w-sm py-4 bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-bold rounded-2xl"
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
                                            if (isCreatingAccount) return;
                                            if (pinStep === 'create') {
                                                setPin(val);
                                                if (val.length === 6) {
                                                    setTimeout(() => setPinStep('confirm'), 300);
                                                }
                                            } else {
                                                setConfirmPin(val);
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

                                    {pinStep === 'confirm' && (
                                        <button
                                            type="button"
                                            onClick={submitCreateAccount}
                                            disabled={confirmPin.length !== 6 || confirmPin !== pin}
                                            className="w-full py-4 mt-6 bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-bold rounded-2xl shadow-[0_10px_25px_rgba(14,122,59,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                                    isAuthority ? 'bg-[#0E7A3B]' : 'bg-white border-2 border-gray-300'
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
                            className="w-full py-4 bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-bold rounded-2xl shadow-[0_10px_25px_rgba(14,122,59,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                                        vehicleType === vehicle.id ? 'bg-[#0E7A3B] text-white' : 'bg-[#E8F6EE] text-[#0E7A3B]'
                                    }`}>
                                        {vehicle.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
                                        <p className="text-sm text-gray-500">Up to {vehicle.capacity}</p>
                                    </div>
                                    {vehicleType === vehicle.id && (
                                        <div className="w-6 h-6 rounded-full bg-[#0E7A3B] flex items-center justify-center">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </motion.button>
                            ))}
                        </div>

                        <div className="flex-1" />

                        <button
                            type="button"
                            onClick={() => setStep(5)}
                            disabled={!vehicleType}
                            className="w-full py-4 bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-bold rounded-2xl shadow-[0_10px_25px_rgba(14,122,59,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-4"
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
                                            <div className="mt-1 mx-auto w-5 h-5 rounded-full bg-[#0E7A3B] flex items-center justify-center">
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
                            className="w-full py-4 bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-bold rounded-2xl shadow-[0_10px_25px_rgba(14,122,59,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-4"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Complete Setup'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
