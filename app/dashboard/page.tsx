'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    ArrowRight,
    ArrowLeft,
    Loader2,
    Package,
    Clock,
    Check,
    Phone,
    Mail,
    User,
    Building2,
    Calendar,
    ChevronRight,
    CreditCard,
    History,
    Settings,
    Bell,
    Sparkles,
    Plus,
    Recycle,
    Truck,
    Star,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProfileLocationMap } from '@/components/maps/profile-location-map';
import { geocodePlusCode } from '@/lib/maps';
import { initializePayment, PaymentIntentResult } from '@/lib/payment';
import { createJob } from '@/lib/realtime';
import { PaymentModal } from '@/components/ui/payment-modal';
import { WASTE_TYPES, CONTAINER_TYPES, calculatePrice, formatPrice } from '@/lib/waste-config';
import { WasteType, GeoLocation, AccountType } from '@/types';
import { getUserPreferredAgencies, getAgenciesByIds, AgencyListing } from '@/lib/user-agencies';

// Credit Card Pattern SVG
const CardPattern = () => (
    <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 400 200">
        <defs>
            <pattern id="cardPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1.5" fill="currentColor" />
            </pattern>
            <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                <stop offset="50%" stopColor="white" stopOpacity="0.1" />
                <stop offset="100%" stopColor="white" stopOpacity="0.2" />
            </linearGradient>
        </defs>
        <rect width="400" height="200" fill="url(#cardPattern)" />
        <ellipse cx="350" cy="30" rx="80" ry="80" fill="url(#fadeGradient)" />
        <ellipse cx="50" cy="180" rx="60" ry="60" fill="url(#fadeGradient)" />
    </svg>
);

// Step indicator component
const StepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({
    currentStep,
    totalSteps,
}) => (
    <div className="flex items-center gap-2 mb-6">
        {Array.from({ length: totalSteps }, (_, i) => (
            <React.Fragment key={i}>
                <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{
                        scale: currentStep === i + 1 ? 1.1 : 1,
                        backgroundColor: i + 1 <= currentStep ? '#10b981' : '#e5e7eb',
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i + 1 <= currentStep ? 'text-white' : 'text-gray-500 '
                        }`}
                >
                    {i + 1 < currentStep ? <Check size={14} /> : i + 1}
                </motion.div>
                {i < totalSteps - 1 && (
                    <div
                        className={`flex-1 h-1 rounded-full transition-colors ${i + 1 < currentStep ? 'bg-emerald-500' : 'bg-gray-200 '
                            }`}
                    />
                )}
            </React.Fragment>
        ))}
    </div>
);

// Get account type display name
const getAccountTypeDisplay = (accountType: AccountType | undefined) => {
    switch (accountType) {
        case 'individual':
            return { icon: <User className="w-4 h-4" />, label: 'Individual' };
        case 'business':
            return { icon: <Building2 className="w-4 h-4" />, label: 'Business' };
        case 'corporate':
            return { icon: <Building2 className="w-4 h-4" />, label: 'Corporate' };
        default:
            return { icon: <User className="w-4 h-4" />, label: 'User' };
    }
};

// Quick Action Button Component
const QuickActionButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary';
}> = ({ icon, label, onClick, variant = 'secondary' }) => (
    <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${variant === 'primary'
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
            : 'bg-white  text-gray-700  shadow-sm border border-gray-100 '
            }`}
    >
        <div className={`p-3 rounded-xl ${variant === 'primary'
            ? 'bg-white/20'
            : 'bg-gray-100 '
            }`}>
            {icon}
        </div>
        <span className="text-xs font-medium">{label}</span>
    </motion.button>
);

// Menu Item Component
const MenuItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    description?: string;
    onClick?: () => void;
    badge?: string;
}> = ({ icon, label, description, onClick, badge }) => (
    <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="w-full flex items-center gap-4 p-4 bg-white  rounded-2xl shadow-sm border border-gray-100  text-left"
    >
        <div className="p-3 rounded-xl bg-gray-100  text-gray-600 ">
            {icon}
        </div>
        <div className="flex-1">
            <h3 className="font-medium text-gray-900 ">{label}</h3>
            {description && (
                <p className="text-sm text-gray-500 ">{description}</p>
            )}
        </div>
        {badge && (
            <Badge variant="secondary" className="mr-2">{badge}</Badge>
        )}
        <ChevronRight className="w-5 h-5 text-gray-400" />
    </motion.button>
);

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    // Check if we should start booking flow
    const actionParam = searchParams.get('action');
    const shouldStartBooking = actionParam === 'book';

    // Booking flow state
    const [step, setStep] = useState(shouldStartBooking ? 1 : 0);
    const [selectedWasteTypes, setSelectedWasteTypes] = useState<WasteType[]>([]);
    const [bucketCount, setBucketCount] = useState(0);
    const [trashBagCount, setTrashBagCount] = useState(0);
    const [largeBinCount, setLargeBinCount] = useState(0);
    const [location, setLocation] = useState<GeoLocation | null>(null);
    const [plusCode, setPlusCode] = useState('');
    const [isGeocodingPlusCode, setIsGeocodingPlusCode] = useState(false);
    const [plusCodeError, setPlusCodeError] = useState<string | null>(null);
    const [manualAddress, setManualAddress] = useState('');
    const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Agency selection state
    const [preferredAgencies, setPreferredAgencies] = useState<AgencyListing[]>([]);
    const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null); // null = any collector

    // Payment modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState<string>('');
    const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

    // User profile info
    const accountInfo = getAccountTypeDisplay((user as any)?.accountType);

    // Load user's preferred agencies
    useEffect(() => {
        const loadPreferredAgencies = async () => {
            if (user?.id) {
                try {
                    const agencyIds = await getUserPreferredAgencies(user.id);
                    if (agencyIds.length > 0) {
                        const agencies = await getAgenciesByIds(agencyIds);
                        setPreferredAgencies(agencies);
                    }
                } catch (error) {
                    console.error('Failed to load preferred agencies:', error);
                }
            }
        };
        loadPreferredAgencies();
    }, [user?.id]);

    // Handle URL param for booking
    useEffect(() => {
        if (shouldStartBooking && step === 0) {
            setStep(1);
        }
    }, [shouldStartBooking, step]);

    // Recalculate price when container counts change
    useEffect(() => {
        if (bucketCount > 0 || trashBagCount > 0 || largeBinCount > 0) {
            const priceEstimate = calculatePrice(bucketCount, trashBagCount, largeBinCount);
            setEstimatedPrice(priceEstimate.totalPrice);
        } else {
            setEstimatedPrice(null);
        }
    }, [bucketCount, trashBagCount, largeBinCount]);

    // Geocode Plus Code when entered
    const handlePlusCodeBlur = useCallback(async () => {
        if (!plusCode.trim()) return;

        setIsGeocodingPlusCode(true);
        setPlusCodeError(null);

        const result = await geocodePlusCode(plusCode);

        if (result) {
            setLocation(result);
            setPlusCodeError(null);
        } else {
            setPlusCodeError('Could not find location for this Plus Code');
        }

        setIsGeocodingPlusCode(false);
    }, [plusCode]);

    const handleNextStep = () => {
        if (step === 1 && selectedWasteTypes.length > 0) setStep(2);
        else if (step === 2 && (bucketCount > 0 || trashBagCount > 0 || largeBinCount > 0)) setStep(3);
        else if (step === 3 && location) setStep(4); // New: agency selection step
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrevStep = () => {
        if (step > 1) setStep(step - 1);
        else {
            setStep(0);
            // Remove action param from URL
            router.replace('/dashboard');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const isFormValid = (): boolean => {
        return !!location;
    };

    const handleSubmitRequest = async () => {
        if (selectedWasteTypes.length === 0 || (bucketCount === 0 && largeBinCount === 0) || !user) return;
        if (!estimatedPrice || !location) return;

        setIsSubmitting(true);

        try {
            const paymentResult: PaymentIntentResult = await initializePayment(estimatedPrice, 'GMD', {
                name: user.name || 'Customer',
                email: user.email,
                phone: user.phone,
                wasteTypes: selectedWasteTypes,
                bucketCount,
                largeBinCount,
            });

            const paymentIntentId = paymentResult.id || `mbalit_${Date.now()}`;
            const jobId = await createJob({
                customerId: user.id,
                customerEmail: user.email,
                customerPhone: user.phone,
                wasteTypes: selectedWasteTypes,
                bucketCount,
                largeBinCount,
                pickupLocation: location,
                plusCode: plusCode || '',
                manualAddress: manualAddress || '',
                amount: estimatedPrice,
                paymentStatus: 'pending',
                paymentIntentId: paymentIntentId,
                status: 'pending',
            });

            if (paymentResult.paymentUrl) {
                setPaymentUrl(paymentResult.paymentUrl);
                setPendingOrderId(jobId);
                setShowPaymentModal(true);
                setIsSubmitting(false);
            } else {
                router.push(`/track/${jobId}`);
            }
        } catch (error) {
            console.error('Payment/Job creation failed:', error);
            setIsSubmitting(false);
            alert('Payment failed. Please try again.');
        }
    };

    // Get first selected waste type info for display
    const selectedWasteInfo = selectedWasteTypes.length > 0
        ? WASTE_TYPES.find((t) => t.id === selectedWasteTypes[0])
        : null;

    // Dashboard View (step 0)
    if (step === 0) {
        return (
            <div className="px-4 pt-4 pb-6">
                {/* Mobile Header */}
                <div className="flex items-center justify-between mb-6 md:hidden">
                    <div>
                        <p className="text-sm text-gray-500 ">Good morning,</p>
                        <h1 className="text-xl font-bold text-gray-900 ">
                            {user?.name?.split(' ')[0] || 'User'}
                        </h1>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="relative p-3 rounded-full bg-white  shadow-sm border border-gray-100 "
                    >
                        <Bell className="w-5 h-5 text-gray-600 " />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full" />
                    </motion.button>
                </div>

                {/* Credit Card Style Profile */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 mb-6 shadow-xl shadow-emerald-500/20"
                >
                    <CardPattern />

                    {/* Card Content */}
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <p className="text-emerald-100 text-sm mb-1">Welcome back</p>
                                <h2 className="text-white text-xl font-bold">{user?.name || 'User'}</h2>
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                                {accountInfo.icon}
                                <span className="text-white text-xs font-medium">{accountInfo.label}</span>
                            </div>
                        </div>

                        {/* Stats/Info */}
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-emerald-100 text-xs mb-1">Total Pickups</p>
                                <p className="text-white text-3xl font-bold">0</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Organization Name (if applicable) */}
                        {(user as any)?.organizationName && (
                            <div className="mt-4 pt-4 border-t border-white/20">
                                <p className="text-emerald-100 text-xs">Organization</p>
                                <p className="text-white font-medium">{(user as any).organizationName}</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Quick Actions Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                >
                    <h3 className="text-sm font-semibold text-gray-500  uppercase tracking-wider mb-3">
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        <QuickActionButton
                            icon={<Plus className="w-6 h-6" />}
                            label="New Pickup"
                            onClick={() => setStep(1)}
                            variant="primary"
                        />
                        <QuickActionButton
                            icon={<Building2 className="w-6 h-6 text-gray-600 " />}
                            label="Agencies"
                            onClick={() => router.push('/dashboard/agencies')}
                        />
                        <QuickActionButton
                            icon={<History className="w-6 h-6 text-gray-600 " />}
                            label="History"
                            onClick={() => router.push('/dashboard/orders')}
                        />
                        <QuickActionButton
                            icon={<MapPin className="w-6 h-6 text-gray-600 " />}
                            label="Locations"
                            onClick={() => { }}
                        />
                        <QuickActionButton
                            icon={<Recycle className="w-6 h-6 text-gray-600 " />}
                            label="Tips"
                            onClick={() => router.push('/dashboard/recycling-tips')}
                        />
                        <QuickActionButton
                            icon={<Settings className="w-6 h-6 text-gray-600 " />}
                            label="Settings"
                            onClick={() => { }}
                        />
                    </div>
                </motion.div>

                {/* Menu Items Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h3 className="text-sm font-semibold text-gray-500  uppercase tracking-wider mb-3">
                        Account
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <MenuItem
                            icon={<Package className="w-5 h-5" />}
                            label="Schedule Pickup"
                            description="Request a waste collection"
                            onClick={() => setStep(1)}
                        />

                        <MenuItem
                            icon={<Building2 className="w-5 h-5" />}
                            label="My Agencies"
                            description="Manage preferred agencies"
                            onClick={() => router.push('/dashboard/agencies')}
                        />

                        <MenuItem
                            icon={<Clock className="w-5 h-5" />}
                            label="Order History"
                            description="View past pickups"
                            onClick={() => router.push('/dashboard/orders')}
                        />

                        <MenuItem
                            icon={<Recycle className="w-5 h-5" />}
                            label="Recycling Tips"
                            description="Learn best practices"
                            onClick={() => router.push('/dashboard/recycling-tips')}
                        />

                        <MenuItem
                            icon={<Mail className="w-5 h-5" />}
                            label="Contact Info"
                            description={user?.email || 'Not set'}
                        />

                        <MenuItem
                            icon={<Phone className="w-5 h-5" />}
                            label="Phone Number"
                            description={user?.phone || 'Not set'}
                        />
                    </div>
                </motion.div>

                {/* Payment Modal */}
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setPendingOrderId(null);
                    }}
                    onSuccess={(orderId) => {
                        setShowPaymentModal(false);
                        router.push(`/track/${orderId}`);
                    }}
                    paymentUrl={paymentUrl}
                    orderId={pendingOrderId || ''}
                    amount={estimatedPrice || 0}
                />
            </div>
        );
    }

    // Booking Flow Steps
    return (
        <div className="px-4 pt-4 pb-6 max-w-xl mx-auto">
            {/* Step 1: Waste Type Selection */}
            {step === 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900  mb-2">
                            What type of waste?
                        </h1>
                        <p className="text-gray-500 ">
                            Select all types of waste for pickup (you can select multiple)
                        </p>
                    </div>

                    <StepIndicator currentStep={1} totalSteps={3} />

                    <div className="grid grid-cols-2 gap-3">
                        {WASTE_TYPES.map((type, index) => {
                            const isSelected = selectedWasteTypes.includes(type.id);
                            return (
                                <motion.button
                                    key={type.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedWasteTypes(prev => prev.filter(t => t !== type.id));
                                        } else {
                                            setSelectedWasteTypes(prev => [...prev, type.id]);
                                        }
                                    }}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${isSelected
                                        ? 'border-emerald-500 bg-emerald-50 '
                                        : 'border-gray-100  bg-white  hover:border-emerald-200'
                                        }`}
                                >
                                    <span className="text-3xl">{type.icon}</span>
                                    <h3 className="font-medium text-gray-900  text-sm text-center">
                                        {type.name}
                                    </h3>
                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Selected count */}
                    {selectedWasteTypes.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 p-3 bg-emerald-50  rounded-xl border border-emerald-200 "
                        >
                            <p className="text-sm text-emerald-700  font-medium">
                                {selectedWasteTypes.length} type{selectedWasteTypes.length > 1 ? 's' : ''} selected
                            </p>
                        </motion.div>
                    )}

                    <div className="mt-6 flex gap-3">
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={handlePrevStep}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="lg"
                            disabled={selectedWasteTypes.length === 0}
                            onClick={handleNextStep}
                            rightIcon={<ArrowRight size={18} />}
                            className="flex-1"
                        >
                            Continue
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Step 2: Container Quantity Selection */}
            {step === 2 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{selectedWasteInfo?.icon}</span>
                            <h1 className="text-2xl font-bold text-gray-900 ">
                                How much waste?
                            </h1>
                        </div>
                        <p className="text-gray-500 ">
                            Select the number of containers
                        </p>
                    </div>

                    <StepIndicator currentStep={2} totalSteps={4} />

                    <div className="space-y-4">
                        {/* Small Bucket Selector */}
                        <div className="bg-white  rounded-2xl p-5 border-2 border-gray-100 ">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">🪣</span>
                                    <div>
                                        <h3 className="font-bold text-gray-900 ">
                                            Small Bucket
                                        </h3>
                                        <p className="text-sm text-gray-500 ">
                                            ~10 liters capacity
                                        </p>
                                    </div>
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-700  ">
                                    D25 each
                                </Badge>
                            </div>
                            <div className="flex items-center justify-center gap-4">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setBucketCount(Math.max(0, bucketCount - 1))}
                                    disabled={bucketCount === 0}
                                    className="w-12 h-12 rounded-full bg-gray-100  flex items-center justify-center text-xl font-bold text-gray-600  disabled:opacity-40"
                                >
                                    −
                                </motion.button>
                                <span className="text-3xl font-bold text-gray-900  w-16 text-center">
                                    {bucketCount}
                                </span>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setBucketCount(Math.min(50, bucketCount + 1))}
                                    className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-xl font-bold text-white"
                                >
                                    +
                                </motion.button>
                            </div>
                            {bucketCount > 0 && (
                                <p className="text-center text-sm text-gray-500 mt-2">
                                    = {formatPrice(bucketCount * 25)}
                                </p>
                            )}
                        </div>

                        {/* Trash Bag Selector */}
                        <div className="bg-white  rounded-2xl p-5 border-2 border-gray-100 ">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {/* Custom Sack/Bag Icon */}
                                    <svg className="w-10 h-10" viewBox="0 0 390.33 390.33" fill="currentColor">
                                        <path className="text-gray-700" d="M340.157,202.992c-13.912-23.443-33.248-47.698-57.471-72.09c-12.744-12.833-25.424-24.293-36.9-34.034c14.727-1.369,26.295-13.791,26.295-28.87c0-15.991-13.01-29-29-29c-4.84,0-11.945,2.41-19.377,5.69l24.994-31.738c1.895-2.408,2.25-5.686,0.912-8.443C248.272,1.751,245.476,0,242.413,0h-94.497c-3.064,0-5.859,1.75-7.197,4.507c-1.338,2.757-0.983,6.035,0.912,8.443l24.994,31.738c-7.432-3.281-14.537-5.69-19.378-5.69c-15.991,0-29,13.009-29,29c0,14.311,10.422,26.226,24.074,28.573c-10.865,8.886-22.705,19.258-34.6,30.913c-24.269,23.778-43.641,47.934-57.578,71.798c-17.696,30.301-26.668,60.261-26.668,89.048c0,23.358,11.106,49.089,29.709,68.831c20.156,21.39,45.829,33.169,72.291,33.169h139.379c26.873,0,52.516-11.148,72.203-31.391c18.938-19.47,29.797-45.205,29.797-70.609C366.854,261.555,357.872,232.843,340.157,202.992z M256.081,67.999c0,7.168-5.83,13-13,13c-4.385,0-17.26-5.955-30.047-13.001c12.783-7.046,25.654-12.999,30.047-12.999C250.251,54.999,256.081,60.831,256.081,67.999z M225.931,16.002l-30.766,39.066l-30.765-39.066H225.931z M134.248,67.999c0-7.168,5.832-13,13-13c4.386,0,17.26,5.955,30.048,13.001c-12.784,7.046-25.656,12.999-30.048,12.999C140.08,80.999,134.248,75.167,134.248,67.999z M264.854,374.33H125.476c-47.639,0-86-47.047-86-86c0-59.073,43.08-113.74,79.22-149.198c23.553-23.108,47.312-41.287,62.884-52.34l-19.199,68.375c-1.194,4.254,1.285,8.67,5.54,9.865c0.723,0.203,1.451,0.3,2.167,0.3c3.495,0,6.707-2.309,7.698-5.839l17.381-61.9l17.381,61.9c0.99,3.531,4.203,5.839,7.697,5.839c0.717,0,1.443-0.097,2.168-0.3c4.254-1.194,6.732-5.611,5.539-9.865L209.093,88c42.07,32.022,141.764,116.732,141.764,200.329C350.854,334.144,310.667,374.33,264.854,374.33z" />
                                    </svg>
                                    <div>
                                        <h3 className="font-bold text-gray-900 ">
                                            Trash Bag
                                        </h3>
                                        <p className="text-sm text-gray-500 ">
                                            50 liters capacity
                                        </p>
                                    </div>
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-700  ">
                                    D75 each
                                </Badge>
                            </div>
                            <div className="flex items-center justify-center gap-4">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setTrashBagCount(Math.max(0, trashBagCount - 1))}
                                    disabled={trashBagCount === 0}
                                    className="w-12 h-12 rounded-full bg-gray-100  flex items-center justify-center text-xl font-bold text-gray-600  disabled:opacity-40"
                                >
                                    −
                                </motion.button>
                                <span className="text-3xl font-bold text-gray-900  w-16 text-center">
                                    {trashBagCount}
                                </span>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setTrashBagCount(Math.min(100, trashBagCount + 1))}
                                    className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-xl font-bold text-white"
                                >
                                    +
                                </motion.button>
                            </div>
                            {trashBagCount > 0 && (
                                <p className="text-center text-sm text-gray-500 mt-2">
                                    = {formatPrice(trashBagCount * 75)}
                                </p>
                            )}
                        </div>

                        {/* Large Trash Bin Selector */}
                        <div className="bg-white  rounded-2xl p-5 border-2 border-gray-100 ">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {/* Custom Garbage Bin Icon */}
                                    <svg className="w-10 h-10" viewBox="0 0 73 73" fill="none">
                                        <g transform="translate(20, 12)">
                                            <path d="M32.2071538,12.7803077 L0.366384615,8.305 L0.771692308,5.41961538 C0.938384615,4.23669231 2.03161538,3.41169231 3.21538462,3.57838462 L30.7712308,7.45123077 C31.9541538,7.61792308 32.7791538,8.71115385 32.6124615,9.89492308 L32.2071538,12.7803077 Z" fill="#556080" />
                                            <path d="M11.9654615,4.80869231 L12.4367692,1.45707692 C12.5662308,0.535615385 13.4267692,-0.112538462 14.3482308,0.0169230769 L21.0514615,0.958692308 C21.9729231,1.08815385 22.6210769,1.94869231 22.4916154,2.87015385 L22.0203077,6.22176923 L11.9654615,4.80869231 Z" stroke="#7383BF" strokeWidth="2" fill="#FFFFFF" strokeLinecap="round" />
                                            <path d="M2.19746154,16.0769231 L11.1895385,16.0769231 L11.4797692,15.7866923 L6.69307692,11 L2.123,15.5700769 C2.00369231,15.6893846 2.00369231,15.8831538 2.123,16.0024615 L2.19746154,16.0769231 Z" fill="#EBBA16" />
                                            <rect fill="#DD352E" x="12.3259231" y="13.5384615" width="6.76923077" height="2.53846154" />
                                            <rect fill="#694F87" x="21.6336154" y="13.5384615" width="4.23076923" height="2.53846154" />
                                            <path d="M27.786,49.0769231 L3.63592308,49.0769231 C2.36076923,49.0769231 1.32676923,48.0429231 1.32676923,46.7677692 L1.32676923,16.0769231 L30.096,16.0769231 L30.096,46.7677692 C30.0951538,48.0429231 29.0611538,49.0769231 27.786,49.0769231 Z" fill="#556080" />
                                            <g transform="translate(4.230769, 19.461538)" fill="#7383BF">
                                                <circle cx="6.40284615" cy="3.38461538" r="1.5" />
                                                <circle cx="16.5566923" cy="3.38461538" r="1.5" />
                                                <circle cx="6.40284615" cy="13.5384615" r="1.5" />
                                                <circle cx="16.5566923" cy="13.5384615" r="1.5" />
                                                <circle cx="6.40284615" cy="23.6923077" r="1.5" />
                                                <circle cx="16.5566923" cy="23.6923077" r="1.5" />
                                            </g>
                                        </g>
                                    </svg>
                                    <div>
                                        <h3 className="font-bold text-gray-900 ">
                                            Large Trash Bin
                                        </h3>
                                        <p className="text-sm text-gray-500 ">
                                            ~200 liters capacity
                                        </p>
                                    </div>
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-700  ">
                                    D500 each
                                </Badge>
                            </div>
                            <div className="flex items-center justify-center gap-4">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setLargeBinCount(Math.max(0, largeBinCount - 1))}
                                    disabled={largeBinCount === 0}
                                    className="w-12 h-12 rounded-full bg-gray-100  flex items-center justify-center text-xl font-bold text-gray-600  disabled:opacity-40"
                                >
                                    −
                                </motion.button>
                                <span className="text-3xl font-bold text-gray-900  w-16 text-center">
                                    {largeBinCount}
                                </span>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setLargeBinCount(Math.min(20, largeBinCount + 1))}
                                    className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-xl font-bold text-white"
                                >
                                    +
                                </motion.button>
                            </div>
                            {largeBinCount > 0 && (
                                <p className="text-center text-sm text-gray-500 mt-2">
                                    = {formatPrice(largeBinCount * 500)}
                                </p>
                            )}
                        </div>

                        {/* Live Price Total */}
                        {(bucketCount > 0 || trashBagCount > 0 || largeBinCount > 0) && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-emerald-100 text-sm">Estimated Total</p>
                                        <p className="text-3xl font-bold">
                                            {estimatedPrice ? formatPrice(estimatedPrice) : 'D0'}
                                        </p>
                                    </div>
                                    <div className="text-right text-sm text-emerald-100">
                                        {bucketCount > 0 && <p>{bucketCount} bucket{bucketCount > 1 ? 's' : ''}</p>}
                                        {trashBagCount > 0 && <p>{trashBagCount} bag{trashBagCount > 1 ? 's' : ''}</p>}
                                        {largeBinCount > 0 && <p>{largeBinCount} large bin{largeBinCount > 1 ? 's' : ''}</p>}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div className="mt-6 flex gap-3">
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={handlePrevStep}
                            leftIcon={<ArrowLeft size={18} />}
                            className="flex-1"
                        >
                            Back
                        </Button>
                        <Button
                            variant="primary"
                            size="lg"
                            disabled={bucketCount === 0 && trashBagCount === 0 && largeBinCount === 0}
                            onClick={handleNextStep}
                            rightIcon={<ArrowRight size={18} />}
                            className="flex-1"
                        >
                            Continue
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Step 3: Location & Checkout */}
            {step === 3 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900  mb-2">
                            Pickup Location
                        </h1>
                        <p className="text-gray-500 ">
                            Where should we collect?
                        </p>
                    </div>

                    <StepIndicator currentStep={3} totalSteps={4} />

                    <div className="space-y-4">
                        {/* Plus Code Instructions */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50   rounded-2xl p-4 border border-blue-100 ">
                            <h3 className="font-bold text-gray-900  mb-2 flex items-center gap-2">
                                📍 How to find your Plus Code
                            </h3>
                            <ol className="text-sm text-gray-600  space-y-2 mb-4">
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">1</span>
                                    <span>Go to the <strong>front of your gate</strong> or entrance</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                                    <span>Look on your <strong>wall or fence</strong> for the Plus Code sign</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">3</span>
                                    <span>Enter the code that looks like <strong className="font-mono text-blue-600">4HMQ+3C Banjul</strong></span>
                                </li>
                            </ol>

                            {/* Plus Code Example Image */}
                            <div className="bg-white  rounded-xl p-3 border border-gray-200 ">
                                <p className="text-xs text-gray-500  mb-2 font-medium">Look for something like this on your wall:</p>
                                <img
                                    src="/google_plus_code_sample.webp"
                                    alt="Google Plus Code sign example on a wall or fence"
                                    className="w-full rounded-lg border border-gray-200 "
                                />
                            </div>
                        </div>

                        {/* Plus Code Input */}
                        <div className="bg-white  rounded-2xl p-4 border border-gray-100 ">
                            <label className="block text-sm font-medium text-gray-700  mb-2">
                                Enter your Google Plus Code
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={plusCode}
                                        onChange={(e) => setPlusCode(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && plusCode.trim()) {
                                                handlePlusCodeBlur();
                                            }
                                        }}
                                        placeholder="e.g., 4HMQ+3C Banjul"
                                        className={`w-full px-4 py-3 rounded-xl border ${plusCodeError ? 'border-red-500' : 'border-gray-200 '} bg-gray-50  text-gray-900  placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                                    />
                                    {isGeocodingPlusCode && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={handlePlusCodeBlur}
                                    disabled={!plusCode.trim() || isGeocodingPlusCode}
                                    className="px-4"
                                >
                                    {isGeocodingPlusCode ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <ArrowRight className="w-5 h-5" />
                                    )}
                                </Button>
                            </div>
                            {plusCodeError && (
                                <p className="mt-2 text-sm text-red-500">{plusCodeError}</p>
                            )}
                        </div>

                        {/* Map */}
                        <div className="rounded-2xl overflow-hidden border border-gray-100 ">
                            <ProfileLocationMap
                                location={location || undefined}
                                onLocationChange={(loc) => setLocation(loc)}
                                enableLiveTracking={!plusCode.trim()}
                                height="200px"
                            />
                        </div>

                        {/* Location Confirmed */}
                        {location && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-emerald-50  rounded-2xl p-4 border border-emerald-200 "
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <MapPin className="w-4 h-4 text-emerald-600" />
                                    <span className="font-medium text-emerald-800  text-sm">Location Set</span>
                                </div>
                                <p className="text-xs text-gray-600 ">
                                    {location.formattedAddress || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}
                                </p>
                            </motion.div>
                        )}

                        {/* Order Summary */}
                        <div className="bg-gray-50  rounded-2xl p-4">
                            <h3 className="font-bold text-gray-900  mb-3">
                                Summary
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Type</span>
                                    <span className="font-medium text-gray-900 ">
                                        {selectedWasteInfo?.icon} {selectedWasteInfo?.name}
                                    </span>
                                </div>
                                {bucketCount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Buckets</span>
                                        <span className="font-medium text-gray-900 ">
                                            {bucketCount} × D25 = {formatPrice(bucketCount * 25)}
                                        </span>
                                    </div>
                                )}
                                {trashBagCount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Trash Bags</span>
                                        <span className="font-medium text-gray-900 ">
                                            {trashBagCount} × D75 = {formatPrice(trashBagCount * 75)}
                                        </span>
                                    </div>
                                )}
                                {largeBinCount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Large Bins</span>
                                        <span className="font-medium text-gray-900 ">
                                            {largeBinCount} × D500 = {formatPrice(largeBinCount * 500)}
                                        </span>
                                    </div>
                                )}
                                <div className="border-t border-gray-200  pt-2 mt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-gray-900 ">Total</span>
                                        <span className="text-xl font-bold text-emerald-600">
                                            {estimatedPrice ? formatPrice(estimatedPrice) : '---'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex gap-3">
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={handlePrevStep}
                            leftIcon={<ArrowLeft size={18} />}
                            className="flex-1"
                        >
                            Back
                        </Button>
                        <Button
                            variant="primary"
                            size="lg"
                            disabled={!location}
                            onClick={handleNextStep}
                            rightIcon={<ArrowRight size={18} />}
                            className="flex-1"
                        >
                            Next
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Step 4: Select Agency/Collector */}
            {step === 4 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900  mb-2">
                            Choose Collector
                        </h1>
                        <p className="text-gray-500 ">
                            Select who should handle your pickup
                        </p>
                    </div>

                    <StepIndicator currentStep={4} totalSteps={4} />

                    <div className="space-y-3">
                        {/* Any Available Collector Option */}
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedAgencyId(null)}
                            className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${selectedAgencyId === null
                                ? 'border-emerald-500 bg-emerald-50 '
                                : 'border-gray-200  bg-white  hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${selectedAgencyId === null ? 'bg-emerald-100' : 'bg-gray-100 '
                                    }`}>
                                    <Truck className={`w-6 h-6 ${selectedAgencyId === null ? 'text-emerald-600' : 'text-gray-500'
                                        }`} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 ">Any Available Collector</h3>
                                    <p className="text-sm text-gray-500 ">Fastest option - nearest collector responds</p>
                                </div>
                                {selectedAgencyId === null && (
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                        </motion.button>

                        {/* Preferred Agencies */}
                        {preferredAgencies.length > 0 && (
                            <>
                                <div className="pt-2">
                                    <p className="text-sm font-medium text-gray-500  uppercase tracking-wider">
                                        My Preferred Agencies
                                    </p>
                                </div>
                                {preferredAgencies.map((agency) => (
                                    <motion.button
                                        key={agency.id}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedAgencyId(agency.id)}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${selectedAgencyId === agency.id
                                            ? 'border-emerald-500 bg-emerald-50 '
                                            : 'border-gray-200  bg-white  hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${selectedAgencyId === agency.id ? 'bg-emerald-100' : 'bg-gray-100 '
                                                }`}>
                                                <Building2 className={`w-6 h-6 ${selectedAgencyId === agency.id ? 'text-emerald-600' : 'text-gray-500'
                                                    }`} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 ">{agency.name}</h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 ">
                                                    <span className="flex items-center gap-1">
                                                        <Star className="w-3 h-3 text-amber-400" />
                                                        {agency.rating.toFixed(1)}
                                                    </span>
                                                    <span>{agency.driversCount} drivers</span>
                                                </div>
                                            </div>
                                            {selectedAgencyId === agency.id && (
                                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </motion.button>
                                ))}
                            </>
                        )}

                        {/* Browse More Agencies Link */}
                        <button
                            onClick={() => router.push('/dashboard/agencies')}
                            className="w-full p-3 text-center text-emerald-600 font-medium hover:bg-emerald-50  rounded-xl transition-colors"
                        >
                            + Browse More Agencies
                        </button>

                        {/* Order Summary */}
                        <div className="bg-gray-50  rounded-2xl p-4 mt-4">
                            <h3 className="font-bold text-gray-900  mb-3">Order Summary</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Waste Types</span>
                                    <span className="font-medium text-gray-900 ">
                                        {selectedWasteTypes.length} selected
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Containers</span>
                                    <span className="font-medium text-gray-900 ">
                                        {[
                                            bucketCount > 0 && `${bucketCount} bucket${bucketCount > 1 ? 's' : ''}`,
                                            trashBagCount > 0 && `${trashBagCount} bag${trashBagCount > 1 ? 's' : ''}`,
                                            largeBinCount > 0 && `${largeBinCount} bin${largeBinCount > 1 ? 's' : ''}`
                                        ].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Location</span>
                                    <span className="font-medium text-gray-900  truncate max-w-[180px]">
                                        {location?.formattedAddress || 'Set'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Collector</span>
                                    <span className="font-medium text-gray-900 ">
                                        {selectedAgencyId
                                            ? preferredAgencies.find(a => a.id === selectedAgencyId)?.name
                                            : 'Any Available'}
                                    </span>
                                </div>
                                <div className="border-t border-gray-200  pt-2 mt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-gray-900 ">Total</span>
                                        <span className="text-xl font-bold text-emerald-600">
                                            {estimatedPrice ? formatPrice(estimatedPrice) : '---'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex gap-3">
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={handlePrevStep}
                            leftIcon={<ArrowLeft size={18} />}
                            className="flex-1"
                        >
                            Back
                        </Button>
                        <Button
                            variant="primary"
                            size="lg"
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                            onClick={handleSubmitRequest}
                            className="flex-1"
                        >
                            Pay {estimatedPrice ? formatPrice(estimatedPrice) : ''}
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => {
                    setShowPaymentModal(false);
                    setPendingOrderId(null);
                }}
                onSuccess={(orderId) => {
                    setShowPaymentModal(false);
                    router.push(`/track/${orderId}`);
                }}
                paymentUrl={paymentUrl}
                orderId={pendingOrderId || ''}
                amount={estimatedPrice || 0}
            />
        </div>
    );
}

// Wrap with Suspense for useSearchParams
import { Suspense } from 'react';

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
