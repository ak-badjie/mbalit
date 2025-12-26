'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Package,
  Clock,
  Shield,
  Sparkles,
  Truck,
  Check,
  CheckCircle,
  Star,
  Phone,
  Mail,
  Info,
  Navigation,
  ChevronRight,
  Smartphone,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapView } from '@/components/maps/map-view';
import { ProfileLocationMap } from '@/components/maps/profile-location-map';
import { geocodePlusCode } from '@/lib/maps';
import { initializePayment, PaymentIntentResult } from '@/lib/payment';
import { createJob, subscribeToJob, subscribeToCollectorLocation, RealtimeJob } from '@/lib/realtime';
import { PaymentModal } from '@/components/ui/payment-modal';
import { TrackOrderModal } from '@/components/ui/track-order-modal';
import { WASTE_TYPES, WASTE_SIZES, calculatePrice, formatPrice } from '@/lib/waste-config';
import { WasteType, WasteSize, GeoLocation } from '@/types';
import {
  DynamicIslandProvider,
  DynamicIsland,
  DynamicContainer,
  DynamicTitle,
  DynamicDescription,
  useDynamicIslandSize,
} from '@/components/ui/dynamic-island';
import { LoadingScreen } from '@/components/ui/truck-logo';

// Local storage key for email
const EMAIL_STORAGE_KEY = 'mbalit_user_email';
const ORDER_STORAGE_KEY = 'mbalit_active_order';

// Step indicator component
const StepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({
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

// Notification Island Content for tracking
const TrackingContent: React.FC<{
  collectorName: string;
  eta: string;
}> = ({ collectorName, eta }) => (
  <DynamicContainer className="flex items-center justify-between h-full w-full px-4">
    <div className="flex items-center gap-3">
      <motion.div
        animate={{ x: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="p-2 rounded-full bg-emerald-500"
      >
        <Truck className="w-5 h-5 text-white" />
      </motion.div>
      <div>
        <DynamicTitle className="text-sm font-bold text-white">
          {collectorName} is on the way
        </DynamicTitle>
        <DynamicDescription className="text-xs text-gray-400">
          ETA: {eta}
        </DynamicDescription>
      </div>
    </div>
  </DynamicContainer>
);

function HomeContent() {
  const router = useRouter();
  const { setSize } = useDynamicIslandSize();
  const [step, setStep] = useState(1);
  const [selectedWasteType, setSelectedWasteType] = useState<WasteType | null>(null);
  const [selectedSize, setSelectedSize] = useState<WasteSize | null>(null);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [plusCode, setPlusCode] = useState('');
  const [isGeocodingPlusCode, setIsGeocodingPlusCode] = useState(false);
  const [plusCodeError, setPlusCodeError] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phone, setPhone] = useState('+220 ');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [collectorLocation, setCollectorLocation] = useState<GeoLocation | null>(null);
  const [showTrackingBanner, setShowTrackingBanner] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  // Track order modal state
  const [showTrackOrderModal, setShowTrackOrderModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  // Validation helpers
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Gambia phone: +220 followed by 7 digits
    const cleanPhone = phone.replace(/\s/g, '');
    const phoneRegex = /^\+220\d{7}$/;
    return phoneRegex.test(cleanPhone);
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits except +
    let cleaned = value.replace(/[^\d+]/g, '');

    // Ensure it starts with +220
    if (!cleaned.startsWith('+220')) {
      cleaned = '+220' + cleaned.replace(/^\+?220?/, '');
    }

    // Limit to +220 + 7 digits
    if (cleaned.length > 11) {
      cleaned = cleaned.substring(0, 11);
    }

    // Format: +220 XXX XXXX
    if (cleaned.length > 4) {
      const prefix = cleaned.substring(0, 4);
      const rest = cleaned.substring(4);
      if (rest.length > 3) {
        return `${prefix} ${rest.substring(0, 3)} ${rest.substring(3)}`;
      }
      return `${prefix} ${rest}`;
    }
    return cleaned;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhone(formatted);

    // Clear error when typing
    if (phoneError) setPhoneError(null);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // Clear error when typing
    if (emailError) setEmailError(null);
  };

  // Check if form is valid for payment
  const isFormValid = (): boolean => {
    if (!location) return false;
    if (!validateEmail(email)) return false;
    if (!validatePhone(phone)) return false;
    return true;
  };

  // Check for saved email and active order on mount
  useEffect(() => {
    const stored = localStorage.getItem(EMAIL_STORAGE_KEY);
    if (stored) {
      setSavedEmail(stored);
    }
    const activeOrder = localStorage.getItem(ORDER_STORAGE_KEY);
    if (activeOrder) {
      try {
        const order = JSON.parse(activeOrder);
        setActiveOrderId(order.id);
        setShowTrackingBanner(true);
      } catch { }
    }
  }, []);

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

  // Note: Location is now handled by ProfileLocationMap with "Get Precise Location" button

  // Simulate collector movement after request submitted
  useEffect(() => {
    if (requestSubmitted && location) {
      const startLat = location.lat + 0.02;
      const startLng = location.lng + 0.015;
      setCollectorLocation({ lat: startLat, lng: startLng });
      // Defer setSize to avoid setState during render
      setTimeout(() => setSize('long'), 0);

      const interval = setInterval(() => {
        setCollectorLocation((prev) => {
          if (!prev || !location) return prev;

          const newLat = prev.lat - (prev.lat - location.lat) * 0.1;
          const newLng = prev.lng - (prev.lng - location.lng) * 0.1;

          if (Math.abs(newLat - location.lat) < 0.001) {
            clearInterval(interval);
            // Defer setSize to avoid setState during render
            setTimeout(() => setSize('large'), 0);
          }

          return { lat: newLat, lng: newLng };
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [requestSubmitted, location, setSize]);

  const handleNextStep = () => {
    if (step === 1 && selectedWasteType) setStep(2);
    else if (step === 2 && selectedSize) setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitRequest = async () => {
    if (!selectedWasteType || !selectedSize || !email || !phone) return;
    if (!estimatedPrice || !location) return;

    setIsSubmitting(true);

    try {
      // Initialize payment with Modem Pay
      const paymentResult: PaymentIntentResult = await initializePayment(estimatedPrice, 'GMD', {
        name: 'Customer',
        email,
        phone: phone.replace(/\s/g, ''), // Remove spaces from phone
        wasteType: selectedWasteType,
        wasteSize: selectedSize,
      });

      console.log('Payment initialized:', paymentResult);

      // Save email to localStorage before redirect
      localStorage.setItem(EMAIL_STORAGE_KEY, email);
      setSavedEmail(email);

      // Create job in Realtime Database (pending payment)
      const paymentIntentId = paymentResult.id || `mbalit_${Date.now()}`;
      const jobId = await createJob({
        customerId: email, // Using email as customer ID
        customerEmail: email,
        customerPhone: phone,
        wasteType: selectedWasteType,
        wasteSize: selectedSize,
        pickupLocation: location,
        plusCode: plusCode || '', // Firebase doesn't accept undefined
        manualAddress: manualAddress || '',
        amount: estimatedPrice,
        paymentStatus: 'pending',
        paymentIntentId: paymentIntentId,
        status: 'pending',
      });

      console.log('Job created:', jobId);

      // Save job ID to localStorage for tracking after payment
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify({
        id: jobId,
        paymentIntentId: paymentIntentId,
        email,
        phone,
        wasteType: selectedWasteType,
        wasteSize: selectedSize,
        createdAt: new Date().toISOString(),
      }));

      // Show payment modal instead of redirecting
      if (paymentResult.paymentUrl) {
        setPaymentUrl(paymentResult.paymentUrl);
        setPendingOrderId(jobId);
        setShowPaymentModal(true);
        setIsSubmitting(false);
      } else {
        // If no URL (payment completed inline), show success
        setActiveOrderId(jobId);
        setIsSubmitting(false);
        setRequestSubmitted(true);
      }
    } catch (error) {
      console.error('Payment/Job creation failed:', error);
      setIsSubmitting(false);
      // Show error to user
      alert('Payment failed. Please try again.');
    }
  };

  const selectedWasteInfo = selectedWasteType
    ? WASTE_TYPES.find((t) => t.id === selectedWasteType)
    : null;
  const selectedSizeInfo = selectedSize
    ? WASTE_SIZES.find((s) => s.id === selectedSize)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
      <Header />

      {/* Track Your Order Banner - Shows if email exists with active order */}
      {showTrackingBanner && savedEmail && !requestSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-16 left-0 right-0 z-40 bg-emerald-600 text-white"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5" />
              <span className="font-medium">You have an active order</span>
            </div>
            <button
              onClick={() => {
                // Redirect to actual tracking page
                if (activeOrderId) {
                  router.push(`/track/${activeOrderId}`);
                }
              }}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            >
              Track Order
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Track Order Button - Shows when NO active order (for returning users) */}
      {!showTrackingBanner && !requestSubmitted && step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-gray-800 to-gray-900 text-white"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-emerald-400" />
              <span className="text-sm">Have an existing order?</span>
            </div>
            <button
              onClick={() => setShowTrackOrderModal(true)}
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            >
              Track Order
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Dynamic Island - Shows during submission/tracking */}
      <AnimatePresence>
        {(isSubmitting || requestSubmitted) && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
          >
            <DynamicIsland>
              {requestSubmitted ? (
                <TrackingContent
                  collectorName="Amadou B."
                  eta="8 min"
                />
              ) : (
                <DynamicContainer className="flex items-center justify-center gap-3 h-full w-full px-4">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  <DynamicTitle className="text-sm font-bold text-white">
                    Finding nearest collector...
                  </DynamicTitle>
                </DynamicContainer>
              )}
            </DynamicIsland>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={`pb-8 ${(showTrackingBanner && savedEmail) || (!showTrackingBanner && step === 1) ? 'pt-32' : 'pt-20'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {!requestSubmitted ? (
            <>
              {/* Step 1: Waste Type Selection */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="text-center mb-8">
                    <motion.h1
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3"
                    >
                      What waste do you want collected?
                    </motion.h1>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      Select the type of waste for pickup
                    </p>
                  </div>

                  <StepIndicator currentStep={1} totalSteps={3} />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {WASTE_TYPES.map((type, index) => (
                      <motion.button
                        key={type.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedWasteType(type.id)}
                        className={`p-6 rounded-2xl border-2 text-center transition-all ${selectedWasteType === type.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-lg shadow-emerald-500/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 hover:shadow-md'
                          }`}
                      >
                        <span className="text-4xl block mb-3">{type.icon}</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {type.name}
                        </h3>
                      </motion.button>
                    ))}
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 flex justify-center"
                  >
                    <Button
                      variant="primary"
                      size="lg"
                      disabled={!selectedWasteType}
                      onClick={handleNextStep}
                      rightIcon={<ArrowRight size={20} />}
                      className="px-12"
                    >
                      Continue
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {/* Step 2: Size Selection */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-3xl">{selectedWasteInfo?.icon}</span>
                      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        How much {selectedWasteInfo?.name.toLowerCase()}?
                      </h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      Select the approximate size
                    </p>
                  </div>

                  <StepIndicator currentStep={2} totalSteps={3} />

                  <div className="space-y-4 max-w-xl mx-auto">
                    {WASTE_SIZES.map((size, index) => (
                      <motion.button
                        key={size.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedSize(size.id)}
                        className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${selectedSize === size.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-lg shadow-emerald-500/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 hover:shadow-md'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                              {size.name}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                              {size.description}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-sm">
                            {size.estimatedWeight}
                          </Badge>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 flex justify-center gap-4"
                  >
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={handlePrevStep}
                      leftIcon={<ArrowLeft size={20} />}
                    >
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      disabled={!selectedSize}
                      onClick={handleNextStep}
                      rightIcon={<ArrowRight size={20} />}
                      className="px-12"
                    >
                      Continue
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {/* Step 3: Checkout - Single Column Form */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-xl mx-auto"
                >
                  <div className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                      Confirm Pickup Details
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      Provide your location and contact details
                    </p>
                  </div>

                  <StepIndicator currentStep={3} totalSteps={3} />

                  <div className="space-y-4">
                    {/* How to Find Plus Code Instructions */}
                    <Card variant="default" padding="md">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            How to find your Plus Code:
                          </p>
                          <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside mb-3">
                            <li>Go to the front of your gate or fence</li>
                            <li>Look on the wall for a small sign with a code</li>
                            <li>It looks like this:</li>
                          </ol>

                          {/* Sample Image */}
                          <div className="rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <motion.img
                              src="/google_plus_code_sample.webp"
                              alt="Google Plus Code example"
                              className="w-full h-auto"
                              animate={{ scale: [1, 1.02, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            👆 Look for this sign on your gate or wall
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Google Plus Code Field */}
                    <Card variant="elevated" padding="md">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                          Google Plus Code
                        </label>
                        <span className="text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                          Preferred
                        </span>
                      </div>
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
                            className={`w-full px-4 py-3 rounded-lg border ${plusCodeError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`}
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
                      <p className="mt-2 text-xs text-gray-500">
                        If you don&apos;t have a Plus Code, use the map below to get your precise location
                      </p>
                    </Card>

                    {/* Map with GPS Button */}
                    <Card variant="elevated" padding="none" className="overflow-hidden">
                      <ProfileLocationMap
                        location={location || undefined}
                        onLocationChange={(loc) => setLocation(loc)}
                        enableLiveTracking={!plusCode.trim()}
                        height="350px"
                      />
                    </Card>

                    {/* Location Details - Shows when location is set */}
                    {location && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card variant="default" padding="md" className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-center gap-2 mb-3">
                            <MapPin className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">Location Confirmed</h3>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Address</span>
                              <span className="font-medium text-gray-900 dark:text-white text-right max-w-[200px] truncate">
                                {location.formattedAddress || 'Address found'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Coordinates</span>
                              <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                              </span>
                            </div>
                            {plusCode && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Plus Code</span>
                                <span className="font-medium text-emerald-600">{plusCode}</span>
                              </div>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    )}

                    {/* No Location Warning */}
                    {!location && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <Info className="w-5 h-5 text-amber-600" />
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Enter a Plus Code or click &quot;Get Precise Location&quot; on the map to continue
                        </p>
                      </div>
                    )}

                    {/* Address Details */}
                    <Card variant="default" padding="md">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Address Details <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        placeholder="Street name, landmarks, building details..."
                        rows={2}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                      />
                    </Card>

                    {/* Email Address */}
                    <Card variant="default" padding="md">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          onBlur={() => {
                            if (email && !validateEmail(email)) {
                              setEmailError('Please enter a valid email address');
                            }
                          }}
                          placeholder="your@email.com"
                          required
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border ${emailError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`}
                        />
                        {email && validateEmail(email) && (
                          <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                      {emailError && (
                        <p className="mt-2 text-sm text-red-500">{emailError}</p>
                      )}
                    </Card>

                    {/* Phone Number */}
                    <Card variant="default" padding="md">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          onBlur={() => {
                            if (phone.replace(/\s/g, '').length > 4 && !validatePhone(phone)) {
                              setPhoneError('Enter a valid Gambia number (+220 XXX XXXX)');
                            }
                          }}
                          placeholder="+220 XXX XXXX"
                          required
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border ${phoneError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`}
                        />
                        {validatePhone(phone) && (
                          <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                      {phoneError && (
                        <p className="mt-2 text-sm text-red-500">{phoneError}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        The collector will call you when arriving
                      </p>
                    </Card>

                    {/* Order Summary */}
                    <Card variant="elevated" padding="md" className="bg-gray-50 dark:bg-gray-800/50">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                        Order Summary
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Waste Type</span>
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
                            <span className="font-bold text-gray-900 dark:text-white">
                              Total
                            </span>
                            <span className="text-2xl font-bold text-emerald-600">
                              {estimatedPrice ? formatPrice(estimatedPrice) : '---'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 flex justify-center gap-4"
                  >
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={handlePrevStep}
                      leftIcon={<ArrowLeft size={20} />}
                    >
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      disabled={!isFormValid() || isSubmitting}
                      isLoading={isSubmitting}
                      onClick={handleSubmitRequest}
                      className="px-12"
                    >
                      {!location ? 'Set Location First' : `Pay ${estimatedPrice ? formatPrice(estimatedPrice) : ''}`}
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </>
          ) : null}

          {/* Trust Indicators */}
          {!requestSubmitted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                <span>Verified Collectors</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-500" />
                <span>Fast Pickup</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <span>Eco-Friendly</span>
              </div>
            </motion.div>
          )}
        </div>
      </main>

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

      {/* Track Order Modal */}
      <TrackOrderModal
        isOpen={showTrackOrderModal}
        onClose={() => setShowTrackOrderModal(false)}
      />
    </div>
  );
}

export default function HomePage() {
  const [isLoading, setIsLoading] = React.useState(true);

  return (
    <>
      <AnimatePresence>
        {isLoading && (
          <LoadingScreen duration={2000} onComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>
      <DynamicIslandProvider initialSize="compact">
        <HomeContent />
      </DynamicIslandProvider>
    </>
  );
}
