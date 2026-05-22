'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    Phone,
    Clock,
    Package,
    Truck,
    CheckCircle,
    Star,
    ArrowLeft,
    Navigation,
    MessageCircle,
    AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TruckLogo from '@/components/ui/truck-logo';
import { MapView } from '@/components/maps/map-view';
import { subscribeToJob, subscribeToCollectorLocation, RealtimeJob } from '@/lib/realtime';
import { formatPrice, WASTE_TYPES } from '@/lib/waste-config';
import { GeoLocation } from '@/types';
import Link from 'next/link';
import { CustomerPaymentModal } from '@/components/ui/payment-offer-modal';
import { PaymentModal } from '@/components/ui/payment-modal';
import { initializePayment } from '@/lib/payment';

type OrderStatus = 'pending' | 'assigned' | 'en_route' | 'arrived' | 'completed' | 'cancelled';

// Map every possible job.status value (including the ones used internally
// by the collector dashboard) onto the customer-facing OrderStatus, so that
// the tracking page never crashes on an unknown status.
function normalizeStatus(raw: string | undefined): OrderStatus {
    switch (raw) {
        case 'accepted':
            return 'assigned';
        case 'in_progress':
        case 'awaiting_payment':
            return 'arrived';
        case 'pending':
        case 'assigned':
        case 'en_route':
        case 'arrived':
        case 'completed':
        case 'cancelled':
            return raw;
        default:
            return 'pending';
    }
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode; description: string }> = {
    pending: {
        label: 'Finding Collector',
        color: 'bg-amber-500',
        icon: <Clock className="w-5 h-5" />,
        description: 'Looking for an available collector near you...',
    },
    assigned: {
        label: 'Collector Assigned',
        color: 'bg-blue-500',
        icon: <Truck className="w-5 h-5" />,
        description: 'A collector has accepted your request!',
    },
    en_route: {
        label: 'On The Way',
        color: 'bg-emerald-500',
        icon: <Navigation className="w-5 h-5" />,
        description: 'Your collector is heading to your location.',
    },
    arrived: {
        label: 'Collector Arrived',
        color: 'bg-purple-500',
        icon: <MapPin className="w-5 h-5" />,
        description: 'The collector has arrived at your location!',
    },
    completed: {
        label: 'Completed',
        color: 'bg-emerald-600',
        icon: <CheckCircle className="w-5 h-5" />,
        description: 'Your pickup has been completed successfully.',
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-red-500',
        icon: <AlertCircle className="w-5 h-5" />,
        description: 'This pickup was cancelled.',
    },
};

export default function TrackingPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.orderId as string;

    const [job, setJob] = useState<RealtimeJob | null>(null);
    const [collectorLocation, setCollectorLocation] = useState<GeoLocation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Payment states
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState('');
    const [isInitializingPayment, setIsInitializingPayment] = useState(false);

    // Subscribe to job updates
    useEffect(() => {
        if (!orderId) return;

        const unsubscribe = subscribeToJob(orderId, (jobData) => {
            if (jobData) {
                setJob(jobData);
                setIsLoading(false);
                
                // Auto-open offer modal when arrived
                if (jobData.status === 'arrived' && jobData.paymentStatus === 'pending' && !showPaymentModal && !paymentUrl) {
                    // Could auto-open, but we'll let user click the button to be safe
                }
            } else {
                setError('Order not found');
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, [orderId, showPaymentModal, paymentUrl]);

    // Subscribe to collector location when assigned
    useEffect(() => {
        if (!job?.collectorId) return;

        const unsubscribe = subscribeToCollectorLocation(job.collectorId, (location) => {
            if (location) {
                setCollectorLocation(location);
            }
        });

        return () => unsubscribe();
    }, [job?.collectorId]);

    const handleAcceptOffer = async (totalAmount: number) => {
        setIsInitializingPayment(true);
        try {
            const paymentResult = await initializePayment(totalAmount, 'GMD', {
                name: job?.customerName || 'Customer',
                email: job?.customerEmail || 'customer@example.com',
                phone: job?.customerPhone || '',
                wasteTypes: job?.wasteTypes || [],
            });

            if (paymentResult.paymentUrl) {
                setPaymentUrl(paymentResult.paymentUrl);
                setShowOfferModal(false);
                setShowPaymentModal(true);
            } else {
                throw new Error('No payment URL returned');
            }
        } catch (error) {
            console.error('Failed to initialize Modem Pay:', error);
            alert('Failed to initialize payment. Please try again.');
        } finally {
            setIsInitializingPayment(false);
        }
    };

    const wasteType = job?.wasteType ? WASTE_TYPES.find(t => t.id === job.wasteType) : null;
    const currentStatus = normalizeStatus(job?.status);
    const statusInfo = statusConfig[currentStatus];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50    flex items-center justify-center">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                        <TruckLogo size="lg" showText={false} />
                    </motion.div>
                    <p className="mt-4 text-gray-500">Loading order details...</p>
                </div>
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50    flex items-center justify-center">
                <Card variant="elevated" padding="lg" className="text-center max-w-md mx-4">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-gray-900  mb-2">
                        Order Not Found
                    </h1>
                    <p className="text-gray-500 mb-6">
                        We couldn&#39;t find the order you&#39;re looking for.
                    </p>
                    <Link href="/">
                        <Button variant="primary">Go Home</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50   ">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-40">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400" />
                <div className="bg-white/80  backdrop-blur-xl border-b border-gray-200/50 ">
                    <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/">
                                <button className="p-2 rounded-full hover:bg-gray-100  transition-colors">
                                    <ArrowLeft className="w-5 h-5 text-gray-600 " />
                                </button>
                            </Link>
                            <div>
                                <h1 className="font-semibold text-gray-900 ">
                                    Track Your Pickup
                                </h1>
                                <p className="text-xs text-gray-500">
                                    Order #{orderId.slice(-8).toUpperCase()}
                                </p>
                            </div>
                        </div>
                        <TruckLogo size="sm" showText={false} />
                    </div>
                </div>
            </header>

            <main className="pt-20 pb-8 max-w-4xl mx-auto px-4">
                {/* Status Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card variant="elevated" padding="none" className="overflow-hidden mb-6">
                        {/* Status Header */}
                        <div className={`${statusInfo.color} p-6 text-white`}>
                            <div className="flex items-center gap-4">
                                <motion.div
                                    animate={currentStatus === 'en_route' ? { x: [0, 10, 0] } : {}}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
                                >
                                    {statusInfo.icon}
                                </motion.div>
                                <div>
                                    <h2 className="text-xl font-bold">{statusInfo.label}</h2>
                                    <p className="text-sm opacity-90">{statusInfo.description}</p>
                                </div>
                            </div>
                        </div>

                        {/* Progress Steps */}
                        <div className="p-4 bg-white ">
                            <div className="flex items-center justify-between relative">
                                {/* Progress Line */}
                                <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200  -translate-y-1/2 z-0" />
                                <motion.div
                                    className="absolute left-0 top-1/2 h-1 bg-emerald-500 -translate-y-1/2 z-0"
                                    initial={{ width: '0%' }}
                                    animate={{
                                        width: currentStatus === 'pending' ? '0%' :
                                            currentStatus === 'assigned' ? '25%' :
                                                currentStatus === 'en_route' ? '50%' :
                                                    currentStatus === 'arrived' ? '75%' :
                                                        currentStatus === 'completed' ? '100%' : '0%'
                                    }}
                                />

                                {['pending', 'assigned', 'en_route', 'arrived', 'completed'].map((status, index) => {
                                    const isActive = ['pending', 'assigned', 'en_route', 'arrived', 'completed'].indexOf(currentStatus) >= index;
                                    const isCurrent = currentStatus === status;
                                    return (
                                        <div key={status} className="relative z-10 flex flex-col items-center">
                                            <motion.div
                                                animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                                                transition={{ duration: 1, repeat: Infinity }}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-200  text-gray-500'
                                                    }`}
                                            >
                                                {index + 1}
                                            </motion.div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Map */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card variant="elevated" padding="none" className="overflow-hidden mb-6">
                        <MapView
                            center={job.pickupLocation}
                            customerLocation={job.pickupLocation}
                            collectorLocation={collectorLocation || undefined}
                            height="300px"
                        />
                    </Card>
                </motion.div>

                {/* Review & Pay Button (When Arrived) */}
                <AnimatePresence>
                    {currentStatus === 'arrived' && job.paymentStatus !== 'paid' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mb-6"
                        >
                            <Card variant="elevated" padding="lg" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-center">
                                <h3 className="text-xl font-bold mb-2">Driver has arrived!</h3>
                                <p className="text-emerald-50 mb-6">Review the pickup details and confirm payment with the driver.</p>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                    onClick={() => setShowOfferModal(true)}
                                    className="bg-white text-emerald-600 hover:bg-emerald-50"
                                >
                                    Review & Pay {formatPrice(job.amount)}
                                </Button>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Order Details */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card variant="elevated" padding="md">
                            <h3 className="font-semibold text-gray-900  mb-4 flex items-center gap-2">
                                <Package className="w-5 h-5 text-emerald-500" />
                                Order Details
                            </h3>

                            <div className="space-y-4">
                                {/* Waste Type */}
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-100  flex items-center justify-center text-2xl">
                                        {wasteType?.icon || '📦'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 ">
                                            {wasteType?.name || job.wasteType}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Size: {job.wasteSize}
                                        </p>
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="flex items-start gap-3 text-gray-600 ">
                                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm">{job.pickupLocation.formattedAddress}</span>
                                </div>

                                {/* Price */}
                                <div className="pt-3 border-t border-gray-100 ">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Total Amount</span>
                                        <span className="text-xl font-bold text-emerald-600">
                                            {formatPrice(job.amount)}
                                        </span>
                                    </div>
                                    {job.paymentStatus === 'paid' ? (
                                        <Badge variant="success" className="mt-2">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Payment Confirmed
                                        </Badge>
                                    ) : (
                                        <Badge variant="warning" className="mt-2 bg-amber-100 text-amber-800 border-none">
                                            <Clock className="w-3 h-3 mr-1" />
                                            To be paid on arrival
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Collector Info (when assigned) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card variant="elevated" padding="md">
                            <h3 className="font-semibold text-gray-900  mb-4 flex items-center gap-2">
                                <Truck className="w-5 h-5 text-emerald-500" />
                                {job.collectorId ? 'Your Collector' : 'Waiting for Collector'}
                            </h3>

                            {job.collectorId ? (
                                <div className="space-y-4">
                                    {/* Collector Avatar & Name */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl font-bold">
                                            {job.collectorName?.charAt(0) || 'C'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 ">
                                                {job.collectorName || 'Collector'}
                                            </p>
                                            <div className="flex items-center gap-1 text-amber-500">
                                                <Star className="w-4 h-4 fill-amber-400" />
                                                <span className="text-sm font-medium">4.8</span>
                                                <span className="text-xs text-gray-400">(127 pickups)</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ETA */}
                                    {currentStatus === 'en_route' && (
                                        <div className="bg-emerald-50  rounded-xl p-4">
                                            <div className="flex items-center gap-2 text-emerald-700 ">
                                                <Clock className="w-5 h-5" />
                                                <span className="font-medium">Estimated arrival:</span>
                                                <span className="font-bold">5-10 mins</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Contact Buttons */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="secondary"
                                            leftIcon={<Phone className="w-4 h-4" />}
                                            onClick={() => window.open(`tel:${job.collectorPhone || ''}`)}
                                        >
                                            Call
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            leftIcon={<MessageCircle className="w-4 h-4" />}
                                        >
                                            Message
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                        className="w-16 h-16 mx-auto mb-4"
                                    >
                                        <div className="w-full h-full rounded-full border-4 border-emerald-200  border-t-emerald-500" />
                                    </motion.div>
                                    <p className="text-gray-500">
                                        Finding a collector near you...
                                    </p>
                                </div>
                            )}
                        </Card>
                    </motion.div>
                </div>

                {/* Completed State - Rate Collector */}
                <AnimatePresence>
                    {currentStatus === 'completed' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mt-6"
                        >
                            <Card variant="elevated" padding="lg" className="text-center">
                                <div className="w-20 h-20 rounded-full bg-emerald-100  flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900  mb-2">
                                    Pickup Completed! 🎉
                                </h2>
                                <p className="text-gray-500 mb-6">
                                    Thank you for using Mbalit. How was your experience?
                                </p>
                                <div className="flex justify-center gap-2 mb-6">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} className="p-1 hover:scale-110 transition-transform">
                                            <Star className="w-8 h-8 text-gray-300 hover:text-amber-400 hover:fill-amber-400 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                                <Link href="/">
                                    <Button variant="primary" size="lg">
                                        Book Another Pickup
                                    </Button>
                                </Link>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modals */}
                {job && (
                    <CustomerPaymentModal
                        isOpen={showOfferModal}
                        onClose={() => setShowOfferModal(false)}
                        onAccept={handleAcceptOffer}
                        requestId={job.id}
                        collectorId={job.collectorId || ''}
                        customerId={job.customerId}
                        baseAmount={job.amount}
                    />
                )}

                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={(orderId) => {
                        setShowPaymentModal(false);
                        // The webhook or Realtime DB will update status to 'paid', 
                        // triggering the UI update automatically.
                    }}
                    paymentUrl={paymentUrl}
                    orderId={orderId}
                    amount={job?.amount || 0}
                />
            </main>
        </div>
    );
}
