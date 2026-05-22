'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    MapPin,
    ArrowRight,
    ArrowLeft,
    Loader2,
    Package,
    Clock,
    Check,
    Plus,
    Truck,
    ChevronRight,
    Bell,
    Users,
    AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ProfileLocationMap } from '@/components/maps/profile-location-map';
import { geocodePlusCode } from '@/lib/maps';
import { initializePayment, PaymentIntentResult } from '@/lib/payment';
import { createJob } from '@/lib/realtime';
import { PaymentModal } from '@/components/ui/payment-modal';
import { WASTE_TYPES, calculatePrice, formatPrice } from '@/lib/waste-config';
import { WasteType, GeoLocation } from '@/types';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import PaymentNotification from '@/components/payment-notification';

// Step indicator (minimalist dots)
const StepDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
    <div className="flex items-center gap-2 justify-center mb-6">
        {Array.from({ length: total }, (_, i) => (
            <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                    i + 1 <= current ? 'w-6 bg-[#0E7A3B]' : 'w-1.5 bg-gray-200'
                }`}
            />
        ))}
    </div>
);

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    // Booking flow
    const actionParam = searchParams.get('action');
    const shouldStartBooking = actionParam === 'book';
    const [step, setStep] = useState(shouldStartBooking ? 1 : 0);
    const [selectedWasteTypes, setSelectedWasteTypes] = useState<WasteType[]>([]);
    const [bucketCount, setBucketCount] = useState(0);
    const [trashBagCount, setTrashBagCount] = useState(0);
    const [largeBinCount, setLargeBinCount] = useState(0);
    const [location, setLocation] = useState<GeoLocation | null>(null);
    const [plusCode, setPlusCode] = useState('');
    const [isGeocodingPlusCode, setIsGeocodingPlusCode] = useState(false);
    const [plusCodeError, setPlusCodeError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [manualAddress, setManualAddress] = useState('');
    const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Payment modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState<string>('');
    const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

    // Success state
    const [isOrderSuccess, setIsOrderSuccess] = useState(false);
    const [createdJobId, setCreatedJobId] = useState<string | null>(null);

    useEffect(() => {
        if (shouldStartBooking && step === 0) setStep(1);
    }, [shouldStartBooking, step]);

    useEffect(() => {
        if (bucketCount > 0 || trashBagCount > 0 || largeBinCount > 0) {
            const priceEstimate = calculatePrice(bucketCount, trashBagCount, largeBinCount);
            setEstimatedPrice(priceEstimate.totalPrice);
        } else {
            setEstimatedPrice(null);
        }
    }, [bucketCount, trashBagCount, largeBinCount]);

    const handlePlusCodeBlur = useCallback(async () => {
        if (!plusCode.trim()) return;
        setIsGeocodingPlusCode(true);
        setPlusCodeError(null);
        const result = await geocodePlusCode(plusCode);
        if (result) {
            setLocation(result);
            setPlusCodeError(null);
        } else {
            setPlusCodeError('Could not find this Plus Code');
        }
        setIsGeocodingPlusCode(false);
    }, [plusCode]);

    const handleFindLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setPlusCodeError('Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);
        setPlusCodeError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setIsLocating(false);
            },
            (error) => {
                console.error('Error getting location:', error);
                setPlusCodeError('Unable to retrieve your location. Please check your permissions.');
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, []);

    const handleNextStep = () => {
        if (step === 1 && selectedWasteTypes.length > 0) setStep(2);
        else if (step === 2 && (bucketCount > 0 || trashBagCount > 0 || largeBinCount > 0)) setStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrevStep = () => {
        if (step > 1) setStep(step - 1);
        else {
            setStep(0);
            router.replace('/dashboard');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmitRequest = async () => {
        if (selectedWasteTypes.length === 0 || (bucketCount === 0 && largeBinCount === 0) || !user) return;
        if (!estimatedPrice || !location) return;

        setIsSubmitting(true);
        try {
            const jobId = await createJob({
                customerId: user.id,
                customerEmail: user.email,
                customerPhone: user.phone,
                customerName: user.name || 'Customer',
                customerProfileImage: user.profileImage || '',
                wasteTypes: selectedWasteTypes,
                bucketCount,
                largeBinCount,
                pickupLocation: location,
                plusCode: plusCode || '',
                manualAddress: manualAddress || '',
                amount: estimatedPrice,
                paymentStatus: 'pending',
                status: 'pending',
            });

            setCreatedJobId(jobId);
            setIsOrderSuccess(true);
            setTimeout(() => {
                router.push(`/track/${jobId}`);
            }, 1000);
            
        } catch (error) {
            console.error('Job creation failed:', error);
            setIsSubmitting(false);
            alert('Booking failed. Please try again.');
        }
    };

    const selectedWasteInfo = selectedWasteTypes.length > 0
        ? WASTE_TYPES.find((t) => t.id === selectedWasteTypes[0])
        : null;

    // Get greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    // ==========================================
    // SUCCESS VIEW
    // ==========================================
    if (isOrderSuccess && createdJobId) {
        return (
            <div className="min-h-full bg-gray-50 flex items-center justify-center flex-col pb-16">
                <div className="w-80 h-80">
                    <DotLottieReact
                        src="/success.lottie"
                        autoplay
                        loop={false}
                    />
                </div>
            </div>
        );
    }

    // ==========================================
    // HOME VIEW (step 0) - Minimalistic
    // ==========================================
    if (step === 0) {
        return (
            <div className="min-h-full bg-gray-50">
                {/* Header */}
                <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{getGreeting()},</p>
                            <h1 className="text-xl font-bold text-gray-900">
                                {user?.name?.split(' ')[0] || 'User'}
                            </h1>
                        </div>
                        <button className="relative p-2.5 rounded-full bg-gray-100">
                            <Bell className="w-5 h-5 text-gray-600" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                        </button>
                    </div>
                </div>

                <div className="px-5 py-5 space-y-4">
                    {/* Request Pickup - Main CTA */}
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setStep(1)}
                        className="w-full p-5 rounded-2xl bg-[#0E7A3B] hover:bg-[#0a6230] text-white text-left flex items-center gap-4"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg">Request Pickup</h3>
                            <p className="text-sm text-gray-300">Schedule a waste collection</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    </motion.button>

                    {/* Quick Info Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-2xl p-4 border border-gray-100">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                                <Package className="w-4 h-4 text-gray-600" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">0</p>
                            <p className="text-xs text-gray-500">Pickups</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-gray-100">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                                <Clock className="w-4 h-4 text-gray-600" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">0</p>
                            <p className="text-xs text-gray-500">Active</p>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="mt-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-3">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex flex-col p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl border border-blue-100 text-left transition-colors aspect-[4/3] group"
                            >
                                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-auto group-hover:scale-105 transition-transform">
                                    <Truck className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Schedule</p>
                                    <p className="text-[11px] text-blue-600/80 font-medium mt-0.5 leading-tight">Book a one-time pickup</p>
                                </div>
                            </button>

                            <button
                                onClick={() => router.push('/dashboard/orders')}
                                className="flex flex-col p-4 bg-purple-50 hover:bg-purple-100 rounded-2xl border border-purple-100 text-left transition-colors aspect-[4/3] group"
                            >
                                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-auto group-hover:scale-105 transition-transform">
                                    <Clock className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">History</p>
                                    <p className="text-[11px] text-purple-600/80 font-medium mt-0.5 leading-tight">View past orders</p>
                                </div>
                            </button>

                            <button
                                onClick={() => router.push('/dashboard/subscribe')}
                                className="flex flex-col p-4 bg-emerald-50 hover:bg-emerald-100 rounded-2xl border border-emerald-100 text-left transition-colors aspect-[4/3] group"
                            >
                                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-auto group-hover:scale-105 transition-transform">
                                    <Users className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Subscribe</p>
                                    <p className="text-[11px] text-emerald-600/80 font-medium mt-0.5 leading-tight">Regular scheduled pickups</p>
                                </div>
                            </button>

                            <button
                                onClick={() => router.push('/dashboard/report')}
                                className="flex flex-col p-4 bg-red-50 hover:bg-red-100 rounded-2xl border border-red-100 text-left transition-colors aspect-[4/3] group"
                            >
                                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-auto group-hover:scale-105 transition-transform">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Report</p>
                                    <p className="text-[11px] text-red-600/80 font-medium mt-0.5 leading-tight">Environmental hazard</p>
                                </div>
                            </button>
                        </div>

                        {/* Inline link to the resident's own past hazard reports.
                            Lives under the Quick Actions grid so users notice it
                            right after they tap "Report". */}
                        <button
                            type="button"
                            onClick={() => router.push('/dashboard/report/my')}
                            className="mt-3 w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 transition-colors"
                        >
                            <span className="flex items-center gap-2.5">
                                <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                </span>
                                <span className="text-left">
                                    <span className="block text-sm font-semibold text-gray-900">My reports</span>
                                    <span className="block text-[11px] text-gray-500">Track hazards you&apos;ve submitted</span>
                                </span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Payment Modal */}
                <PaymentNotification />
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => { setShowPaymentModal(false); setPendingOrderId(null); }}
                    onSuccess={(orderId) => {
                        setShowPaymentModal(false);
                        setCreatedJobId(orderId);
                        setIsOrderSuccess(true);
                        setTimeout(() => {
                            router.push(`/track/${orderId}`);
                        }, 3500);
                    }}
                    paymentUrl={paymentUrl}
                    orderId={pendingOrderId || ''}
                    amount={estimatedPrice || 0}
                />
            </div>
        );
    }

    // ==========================================
    // BOOKING FLOW (Steps 1-3)
    // ==========================================
    return (
        <div className="min-h-full bg-white px-5 pt-6 pb-6">
            {/* Back button + Steps */}
            <div className="flex items-center justify-between mb-4">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handlePrevStep}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </motion.button>
                <StepDots current={step} total={3} />
                <div className="w-9" />
            </div>

            {/* Step 1: Waste Type */}
            {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-xl font-bold text-gray-900 mb-1">What type of waste?</h1>
                    <p className="text-gray-500 text-sm mb-6">Select all that apply</p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
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
                                    className={`p-4 rounded-2xl border-2 transition-all ${
                                        isSelected
                                            ? 'border-[#0E7A3B] bg-[#ECFDF3]'
                                            : 'border-gray-100 hover:border-[#A8E7C3]'
                                    }`}
                                >
                                    <span className="text-2xl mb-2 block">{type.icon}</span>
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
                        onClick={handleNextStep}
                        disabled={selectedWasteTypes.length === 0}
                        className="w-full py-4 bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-semibold rounded-2xl disabled:opacity-30 transition-opacity"
                    >
                        Continue
                    </button>
                </motion.div>
            )}

            {/* Step 2: Container Quantities */}
            {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-xl font-bold text-gray-900 mb-1">How much waste?</h1>
                    <p className="text-gray-500 text-sm mb-6">Select container sizes</p>

                    <div className="space-y-4 mb-6">
                        {/* Buckets */}
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Bucket</h3>
                                    <p className="text-sm text-gray-500">D25 each</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setBucketCount(Math.max(0, bucketCount - 1))}
                                        className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold"
                                    >
                                        −
                                    </motion.button>
                                    <span className="w-8 text-center font-bold text-lg text-gray-900">{bucketCount}</span>
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setBucketCount(bucketCount + 1)}
                                        className="w-10 h-10 rounded-xl bg-[#0E7A3B] hover:bg-[#0a6230] text-white flex items-center justify-center font-bold"
                                    >
                                        +
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Trash Bags */}
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Trash Bag</h3>
                                    <p className="text-sm text-gray-500">D75 each</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setTrashBagCount(Math.max(0, trashBagCount - 1))}
                                        className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold"
                                    >
                                        −
                                    </motion.button>
                                    <span className="w-8 text-center font-bold text-lg text-gray-900">{trashBagCount}</span>
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setTrashBagCount(trashBagCount + 1)}
                                        className="w-10 h-10 rounded-xl bg-[#0E7A3B] hover:bg-[#0a6230] text-white flex items-center justify-center font-bold"
                                    >
                                        +
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Large Bins */}
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Large Bin</h3>
                                    <p className="text-sm text-gray-500">D500 each</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setLargeBinCount(Math.max(0, largeBinCount - 1))}
                                        className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold"
                                    >
                                        −
                                    </motion.button>
                                    <span className="w-8 text-center font-bold text-lg text-gray-900">{largeBinCount}</span>
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setLargeBinCount(largeBinCount + 1)}
                                        className="w-10 h-10 rounded-xl bg-[#0E7A3B] hover:bg-[#0a6230] text-white flex items-center justify-center font-bold"
                                    >
                                        +
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Price preview */}
                    {estimatedPrice && (
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Estimated</span>
                                <span className="text-xl font-bold text-gray-900">{formatPrice(estimatedPrice)}</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleNextStep}
                        disabled={bucketCount === 0 && trashBagCount === 0 && largeBinCount === 0}
                        className="w-full py-4 bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-semibold rounded-2xl disabled:opacity-30 transition-opacity"
                    >
                        Continue
                    </button>
                </motion.div>
            )}

            {/* Step 3: Location & Checkout */}
            {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-xl font-bold text-gray-900 mb-1">Pickup location</h1>
                    <p className="text-gray-500 text-sm mb-6">Where should we collect?</p>

                    <div className="space-y-4">
                        {/* Plus Code Input */}
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Google Plus Code</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={plusCode}
                                    onChange={(e) => setPlusCode(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && plusCode.trim()) handlePlusCodeBlur(); }}
                                    placeholder="e.g., 4HMQ+3C Banjul"
                                    className={`flex-1 px-4 py-3 rounded-xl border ${plusCodeError ? 'border-red-400' : 'border-gray-200'} bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#0E7A3B] focus:border-transparent`}
                                />
                                <Button
                                    variant="primary"
                                    onClick={handlePlusCodeBlur}
                                    disabled={!plusCode.trim() || isGeocodingPlusCode}
                                    className="px-4 bg-[#0E7A3B] hover:bg-[#0a6230]"
                                >
                                    {isGeocodingPlusCode ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                                </Button>
                            </div>
                            {plusCodeError && <p className="mt-2 text-sm text-red-500">{plusCodeError}</p>}
                            
                            <div className="mt-4 flex items-center gap-4">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-sm text-gray-400">or</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>

                            {isLocating ? (
                                <div className="mt-4 flex flex-col items-center justify-center py-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="w-24 h-24 mb-2">
                                        <DotLottieReact src="/find_location.lottie" autoplay loop />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500 animate-pulse">Locating you...</p>
                                </div>
                            ) : (
                                <button
                                    onClick={handleFindLocation}
                                    className="mt-4 w-full py-3 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <MapPin className="w-5 h-5" />
                                    Find My Location
                                </button>
                            )}
                        </div>

                        {/* Map */}
                        <div className="rounded-2xl overflow-hidden border border-gray-100">
                            <ProfileLocationMap
                                location={location || undefined}
                                onLocationChange={(loc) => setLocation(loc)}
                                enableLiveTracking={!plusCode.trim()}
                                height="200px"
                            />
                        </div>

                        {/* Location confirmed */}
                        {location && (
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <MapPin className="w-4 h-4 text-gray-600" />
                                    <span className="font-medium text-gray-900 text-sm">Location Set</span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    {location.formattedAddress || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}
                                </p>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Summary</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Waste</span>
                                    <span className="font-medium text-gray-900">{selectedWasteInfo?.name}</span>
                                </div>
                                {bucketCount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Buckets</span>
                                        <span className="font-medium text-gray-900">{bucketCount} × D25 = {formatPrice(bucketCount * 25)}</span>
                                    </div>
                                )}
                                {trashBagCount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Trash Bags</span>
                                        <span className="font-medium text-gray-900">{trashBagCount} × D75 = {formatPrice(trashBagCount * 75)}</span>
                                    </div>
                                )}
                                {largeBinCount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Large Bins</span>
                                        <span className="font-medium text-gray-900">{largeBinCount} × D500 = {formatPrice(largeBinCount * 500)}</span>
                                    </div>
                                )}
                                <div className="border-t border-gray-200 pt-2 mt-2">
                                    <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900">Total</span>
                                            <span className="text-xs text-amber-600 font-medium">Pay on arrival</span>
                                        </div>
                                        <span className="text-xl font-bold text-gray-900">
                                            {estimatedPrice ? formatPrice(estimatedPrice) : '---'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="mt-6">
                        <button
                            onClick={handleSubmitRequest}
                            disabled={!location || isSubmitting}
                            className="w-full py-4 bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-semibold rounded-2xl disabled:opacity-30 transition-opacity flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>Book Pickup</>
                            )}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => { setShowPaymentModal(false); setPendingOrderId(null); }}
                onSuccess={(orderId) => { setShowPaymentModal(false); router.push(`/track/${orderId}`); }}
                paymentUrl={paymentUrl}
                orderId={pendingOrderId || ''}
                amount={estimatedPrice || 0}
            />
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-[100dvh] overflow-hidden">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
