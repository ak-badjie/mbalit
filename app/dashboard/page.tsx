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
import { WASTE_TYPES, WASTE_SIZES, calculatePrice, formatPrice } from '@/lib/waste-config';
import { WasteType, WasteSize, GeoLocation, AccountType } from '@/types';

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
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i + 1 <= currentStep ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                        }`}
                >
                    {i + 1 < currentStep ? <Check size={14} /> : i + 1}
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
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700'
            }`}
    >
        <div className={`p-3 rounded-xl ${variant === 'primary'
            ? 'bg-white/20'
            : 'bg-gray-100 dark:bg-gray-700'
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
        className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-left"
    >
        <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {icon}
        </div>
        <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white">{label}</h3>
            {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
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
    const [selectedWasteType, setSelectedWasteType] = useState<WasteType | null>(null);
    const [selectedSize, setSelectedSize] = useState<WasteSize | null>(null);
    const [location, setLocation] = useState<GeoLocation | null>(null);
    const [plusCode, setPlusCode] = useState('');
    const [isGeocodingPlusCode, setIsGeocodingPlusCode] = useState(false);
    const [plusCodeError, setPlusCodeError] = useState<string | null>(null);
    const [manualAddress, setManualAddress] = useState('');
    const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Payment modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState<string>('');
    const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

    // User profile info
    const accountInfo = getAccountTypeDisplay((user as any)?.accountType);

    // Handle URL param for booking
    useEffect(() => {
        if (shouldStartBooking && step === 0) {
            setStep(1);
        }
    }, [shouldStartBooking, step]);

    // Recalculate price when selections change
    useEffect(() => {
        if (selectedWasteType && selectedSize) {
            const estimatedDistance = 3 + Math.random() * 7;
            const price = calculatePrice(selectedWasteType, selectedSize, estimatedDistance);
            setEstimatedPrice(price);
        }
    }, [selectedWasteType, selectedSize]);

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
        if (step === 1 && selectedWasteType) setStep(2);
        else if (step === 2 && selectedSize) setStep(3);
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
        if (!selectedWasteType || !selectedSize || !user) return;
        if (!estimatedPrice || !location) return;

        setIsSubmitting(true);

        try {
            const paymentResult: PaymentIntentResult = await initializePayment(estimatedPrice, 'GMD', {
                name: user.name || 'Customer',
                email: user.email,
                phone: user.phone,
                wasteType: selectedWasteType,
                wasteSize: selectedSize,
            });

            const paymentIntentId = paymentResult.id || `mbalit_${Date.now()}`;
            const jobId = await createJob({
                customerId: user.id,
                customerEmail: user.email,
                customerPhone: user.phone,
                wasteType: selectedWasteType,
                wasteSize: selectedSize,
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

    const selectedWasteInfo = selectedWasteType
        ? WASTE_TYPES.find((t) => t.id === selectedWasteType)
        : null;
    const selectedSizeInfo = selectedSize
        ? WASTE_SIZES.find((s) => s.id === selectedSize)
        : null;

    // Dashboard View (step 0)
    if (step === 0) {
        return (
            <div className="px-4 pt-4 pb-6">
                {/* Mobile Header */}
                <div className="flex items-center justify-between mb-6 md:hidden">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Good morning,</p>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {user?.name?.split(' ')[0] || 'User'}
                        </h1>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="relative p-3 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                >
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        Quick Actions
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                        <QuickActionButton
                            icon={<Plus className="w-6 h-6" />}
                            label="New Pickup"
                            onClick={() => setStep(1)}
                            variant="primary"
                        />
                        <QuickActionButton
                            icon={<History className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
                            label="History"
                            onClick={() => { }}
                        />
                        <QuickActionButton
                            icon={<MapPin className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
                            label="Locations"
                            onClick={() => { }}
                        />
                        <QuickActionButton
                            icon={<Settings className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
                            label="Settings"
                            onClick={() => { }}
                        />
                    </div>
                </motion.div>

                {/* Menu Items */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-3"
                >
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        Account
                    </h3>

                    <MenuItem
                        icon={<Package className="w-5 h-5" />}
                        label="Schedule Pickup"
                        description="Request a waste collection"
                        onClick={() => setStep(1)}
                    />

                    <MenuItem
                        icon={<Clock className="w-5 h-5" />}
                        label="Order History"
                        description="View past pickups"
                        onClick={() => window.location.href = '/dashboard/orders'}
                    />

                    <MenuItem
                        icon={<Recycle className="w-5 h-5" />}
                        label="Recycling Tips"
                        description="Learn best practices"
                        onClick={() => window.location.href = '/dashboard/recycling-tips'}
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
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            What type of waste?
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            Select the type of waste for pickup
                        </p>
                    </div>

                    <StepIndicator currentStep={1} totalSteps={3} />

                    <div className="space-y-3">
                        {WASTE_TYPES.map((type, index) => (
                            <motion.button
                                key={type.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedWasteType(type.id)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${selectedWasteType === type.id
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'
                                    }`}
                            >
                                <span className="text-3xl">{type.icon}</span>
                                <div className="flex-1 text-left">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {type.name}
                                    </h3>
                                </div>
                                {selectedWasteType === type.id && (
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </motion.button>
                        ))}
                    </div>

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
                            disabled={!selectedWasteType}
                            onClick={handleNextStep}
                            rightIcon={<ArrowRight size={18} />}
                            className="flex-1"
                        >
                            Continue
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Step 2: Size Selection */}
            {step === 2 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{selectedWasteInfo?.icon}</span>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                How much?
                            </h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            Select the approximate size
                        </p>
                    </div>

                    <StepIndicator currentStep={2} totalSteps={3} />

                    <div className="space-y-3">
                        {WASTE_SIZES.map((size, index) => (
                            <motion.button
                                key={size.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedSize(size.id)}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedSize === size.id
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">
                                            {size.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {size.description}
                                        </p>
                                    </div>
                                    <Badge variant="secondary">{size.estimatedWeight}</Badge>
                                </div>
                            </motion.button>
                        ))}
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
                            disabled={!selectedSize}
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
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Pickup Location
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            Where should we collect?
                        </p>
                    </div>

                    <StepIndicator currentStep={3} totalSteps={3} />

                    <div className="space-y-4">
                        {/* Plus Code Instructions */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                📍 How to find your Plus Code
                            </h3>
                            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-4">
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
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Look for something like this on your wall:</p>
                                <img
                                    src="/google_plus_code_sample.webp"
                                    alt="Google Plus Code sign example on a wall or fence"
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600"
                                />
                            </div>
                        </div>

                        {/* Plus Code Input */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                        className={`w-full px-4 py-3 rounded-xl border ${plusCodeError ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
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
                        <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
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
                                className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <MapPin className="w-4 h-4 text-emerald-600" />
                                    <span className="font-medium text-emerald-800 dark:text-emerald-300 text-sm">Location Set</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {location.formattedAddress || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}
                                </p>
                            </motion.div>
                        )}

                        {/* Order Summary */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                                Summary
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Type</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {selectedWasteInfo?.icon} {selectedWasteInfo?.name}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Size</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {selectedSizeInfo?.name}
                                    </span>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-gray-900 dark:text-white">Total</span>
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
                            disabled={!isFormValid() || isSubmitting}
                            isLoading={isSubmitting}
                            onClick={handleSubmitRequest}
                            className="flex-1"
                        >
                            {!location ? 'Set Location' : `Pay ${estimatedPrice ? formatPrice(estimatedPrice) : ''}`}
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
