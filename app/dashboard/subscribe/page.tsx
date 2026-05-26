'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Search,
    Star,
    Truck,
    User,
    Check,
    ChevronRight,
    Package,
    Loader2,
    X,
    Calendar,
    Minus,
    Plus,
    Building2,
    Pause,
    Play,
    XCircle,
    Settings,
    CreditCard,
    Clock,
    AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getAllCollectors, CollectorListItem } from '@/lib/firestore';
import {
    createSubscription,
    getCustomerSubscription,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    updateSubscriptionPlan,
    getSubscriptionSummary,
} from '@/lib/subscriptions';
import { calculateSubscriptionPrice, formatPrice, SUBSCRIPTION_PLANS, WASTE_TYPES } from '@/lib/waste-config';
import { Subscription, SubscriptionPlan } from '@/types';
import { initializePayment, PaymentIntentResult } from '@/lib/payment';
import { PaymentModal } from '@/components/ui/payment-modal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Active Subscription Management Card ────────────────────────────────────

function ActiveSubscriptionCard({
    subscription,
    onModify,
    onRefresh,
}: {
    subscription: Subscription;
    onModify: () => void;
    onRefresh: () => void;
}) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [collectorName, setCollectorName] = useState<string>('');
    const summary = getSubscriptionSummary(subscription);

    // Fetch collector name
    useEffect(() => {
        if (!subscription.collectorId) return;
        getDoc(doc(db, 'users', subscription.collectorId)).then(snap => {
            if (snap.exists()) {
                const data = snap.data();
                setCollectorName(data.name || data.displayName || 'Collector');
            }
        });
    }, [subscription.collectorId]);

    const handlePause = async () => {
        setActionLoading('pause');
        try {
            await pauseSubscription(subscription.id);
            onRefresh();
        } catch (err) {
            console.error('Failed to pause:', err);
            alert('Failed to pause subscription');
        } finally {
            setActionLoading(null);
        }
    };

    const handleResume = async () => {
        setActionLoading('resume');
        try {
            await resumeSubscription(subscription.id);
            onRefresh();
        } catch (err) {
            console.error('Failed to resume:', err);
            alert('Failed to resume subscription');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = async () => {
        setActionLoading('cancel');
        try {
            await cancelSubscription(subscription.id);
            onRefresh();
        } catch (err) {
            console.error('Failed to cancel:', err);
            alert('Failed to cancel subscription');
        } finally {
            setActionLoading(null);
            setShowCancelConfirm(false);
        }
    };

    const statusConfig = {
        active: { label: 'Active', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
        paused: { label: 'Paused', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
        cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
        expired: { label: 'Expired', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
    };

    const status = statusConfig[subscription.status] || statusConfig.active;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
        >
            {/* Header bar */}
            <div className="px-5 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #0E7A3B08 0%, #0E7A3B15 100%)' }}>
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-900 text-lg">My Subscription</h3>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                    </span>
                </div>
                {collectorName && (
                    <p className="text-sm text-gray-500">with <span className="font-medium text-gray-700">{collectorName}</span></p>
                )}
            </div>

            {/* Details */}
            <div className="px-5 py-4 space-y-3">
                {/* Plan & Containers row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Plan</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{summary.planName}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Containers</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{summary.containerSummary}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Per pickup</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{summary.pricePerPickup}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Monthly total</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#0E7A3B' }}>{summary.monthlyPrice}</span>
                </div>

                {/* Next pickup */}
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 mt-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#0E7A3B15' }}>
                        <Clock className="w-5 h-5" style={{ color: '#0E7A3B' }} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Next Pickup</p>
                        <p className="text-sm font-semibold text-gray-900">{summary.nextPickup}</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            {subscription.status !== 'cancelled' && (
                <div className="px-5 pb-5 pt-1 flex gap-2">
                    {subscription.status === 'active' ? (
                        <>
                            <button
                                onClick={handlePause}
                                disabled={!!actionLoading}
                                className="flex-1 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-amber-100 transition-colors disabled:opacity-40"
                            >
                                {actionLoading === 'pause' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                                Pause
                            </button>
                            <button
                                onClick={onModify}
                                disabled={!!actionLoading}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 text-white"
                                style={{ backgroundColor: '#0E7A3B' }}
                            >
                                <Settings className="w-4 h-4" />
                                Modify
                            </button>
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                disabled={!!actionLoading}
                                className="py-2.5 px-4 rounded-xl bg-red-50 text-red-600 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-red-100 transition-colors disabled:opacity-40"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </>
                    ) : subscription.status === 'paused' ? (
                        <>
                            <button
                                onClick={handleResume}
                                disabled={!!actionLoading}
                                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                                style={{ backgroundColor: '#0E7A3B' }}
                            >
                                {actionLoading === 'resume' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                Resume
                            </button>
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                disabled={!!actionLoading}
                                className="py-2.5 px-4 rounded-xl bg-red-50 text-red-600 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-red-100 transition-colors disabled:opacity-40"
                            >
                                <XCircle className="w-4 h-4" />
                                Cancel
                            </button>
                        </>
                    ) : null}
                </div>
            )}

            {/* Cancel confirmation overlay */}
            <AnimatePresence>
                {showCancelConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center px-6"
                        onClick={() => setShowCancelConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Cancel Subscription?</h3>
                                    <p className="text-xs text-gray-500">This cannot be undone</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-6">
                                Your upcoming pickups will be cancelled. You can always subscribe again later.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm"
                                >
                                    Keep It
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={!!actionLoading}
                                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
                                >
                                    {actionLoading === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Cancel It
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Modify Subscription Modal ──────────────────────────────────────────────

function ModifySubscriptionModal({
    subscription,
    isOpen,
    onClose,
    onSaved,
}: {
    subscription: Subscription;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [plan, setPlan] = useState<SubscriptionPlan>(subscription.plan);
    const [bucketCount, setBucketCount] = useState(subscription.bucketCount);
    const [largeBinCount, setLargeBinCount] = useState(subscription.largeBinCount);
    const [isSaving, setIsSaving] = useState(false);

    const pricing = useMemo(() => {
        return calculateSubscriptionPrice(bucketCount, 0, largeBinCount, plan);
    }, [bucketCount, largeBinCount, plan]);

    const hasChanges = plan !== subscription.plan ||
        bucketCount !== subscription.bucketCount ||
        largeBinCount !== subscription.largeBinCount;

    const handleSave = async () => {
        if (!hasChanges) return;
        setIsSaving(true);
        try {
            await updateSubscriptionPlan(subscription.id, plan, bucketCount, largeBinCount);
            onSaved();
            onClose();
        } catch (err) {
            console.error('Failed to update subscription:', err);
            alert('Failed to update. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-6">
                        {/* Handle */}
                        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

                        <h2 className="text-lg font-bold text-gray-900 mb-1">Modify Subscription</h2>
                        <p className="text-sm text-gray-500 mb-6">Update your plan, containers, or frequency.</p>

                        {/* Frequency */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Pickup Frequency</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlan[]).map(p => (
                                    <motion.button
                                        key={p}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setPlan(p)}
                                        className={`py-3 rounded-xl text-sm font-medium transition-all ${
                                            plan === p
                                                ? 'text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                        style={plan === p ? { backgroundColor: '#0E7A3B' } : {}}
                                    >
                                        {SUBSCRIPTION_PLANS[p].name}
                                    </motion.button>
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-gray-400">{SUBSCRIPTION_PLANS[plan].description}</p>
                        </div>

                        {/* Containers */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Waste Amount</h3>

                            {/* Buckets */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900 text-sm">🪣 Buckets</h4>
                                        <p className="text-xs text-gray-400">D25 each</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setBucketCount(Math.max(0, bucketCount - 1))}
                                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center"
                                        >
                                            <Minus className="w-3 h-3 text-gray-600" />
                                        </motion.button>
                                        <span className="w-6 text-center font-bold text-gray-900">{bucketCount}</span>
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setBucketCount(bucketCount + 1)}
                                            className="w-8 h-8 rounded-lg text-white flex items-center justify-center"
                                            style={{ backgroundColor: '#0E7A3B' }}
                                        >
                                            <Plus className="w-3 h-3" />
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                            {/* Large Bins */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900 text-sm">🗑️ Large Bins</h4>
                                        <p className="text-xs text-gray-400">D500 each</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setLargeBinCount(Math.max(0, largeBinCount - 1))}
                                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center"
                                        >
                                            <Minus className="w-3 h-3 text-gray-600" />
                                        </motion.button>
                                        <span className="w-6 text-center font-bold text-gray-900">{largeBinCount}</span>
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setLargeBinCount(largeBinCount + 1)}
                                            className="w-8 h-8 rounded-lg text-white flex items-center justify-center"
                                            style={{ backgroundColor: '#0E7A3B' }}
                                        >
                                            <Plus className="w-3 h-3" />
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Price Summary */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-500">Per pickup</span>
                                <span className="font-medium text-gray-900">{formatPrice(pricing.pricePerPickup)}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-500">Pickups/month</span>
                                <span className="font-medium text-gray-900">{SUBSCRIPTION_PLANS[plan].pickupsPerMonth}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-2 mt-2">
                                <div className="flex justify-between">
                                    <span className="font-bold text-gray-900">Monthly total</span>
                                    <span className="text-xl font-bold text-gray-900">{formatPrice(pricing.totalMonthlyPrice)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving || (bucketCount === 0 && largeBinCount === 0)}
                            className="w-full py-4 text-white font-semibold rounded-2xl disabled:opacity-30 transition-opacity flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#0E7A3B' }}
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>Save Changes · {formatPrice(pricing.totalMonthlyPrice)}/mo</>
                            )}
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-3 mt-2 text-gray-500 text-sm font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Main Subscribe Page ────────────────────────────────────────────────────

export default function SubscribePage() {
    const router = useRouter();
    const { user } = useAuth();

    // Active subscription
    const [activeSub, setActiveSub] = useState<Subscription | null>(null);
    const [subLoading, setSubLoading] = useState(true);
    const [showModifyModal, setShowModifyModal] = useState(false);

    // Browse state
    const [collectors, setCollectors] = useState<CollectorListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Subscription setup state
    const [selectedCollector, setSelectedCollector] = useState<CollectorListItem | null>(null);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [plan, setPlan] = useState<SubscriptionPlan>('weekly');
    const [bucketCount, setBucketCount] = useState(1);
    const [largeBinCount, setLargeBinCount] = useState(0);
    const [preferredDay, setPreferredDay] = useState('monday');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Payment state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentResult, setPaymentResult] = useState<PaymentIntentResult | null>(null);

    // Load active subscription
    const loadSubscription = useCallback(async () => {
        if (!user) return;
        setSubLoading(true);
        try {
            const sub = await getCustomerSubscription(user.id);
            setActiveSub(sub);
        } catch (err) {
            console.error('Failed to load subscription:', err);
        } finally {
            setSubLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadSubscription();
    }, [loadSubscription]);

    // Load collectors
    useEffect(() => {
        const load = async () => {
            try {
                const data = await getAllCollectors();
                setCollectors(data);
            } catch (err) {
                console.error('Failed to load collectors:', err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    // Filter collectors
    const filteredCollectors = useMemo(() => {
        if (!searchQuery.trim()) return collectors;
        const term = searchQuery.toLowerCase();
        return collectors.filter(c =>
            c.displayName.toLowerCase().includes(term) ||
            c.bio?.toLowerCase().includes(term) ||
            c.wasteTypesHandled.some(w => w.toLowerCase().includes(term))
        );
    }, [collectors, searchQuery]);

    // Price calculation
    const pricing = useMemo(() => {
        return calculateSubscriptionPrice(bucketCount, 0, largeBinCount, plan);
    }, [bucketCount, largeBinCount, plan]);

    // Step 1: User clicks Subscribe → initialize ModemPay payment
    const handleSubscribe = async () => {
        if (!user || !selectedCollector) return;
        if (bucketCount === 0 && largeBinCount === 0) return;

        setIsSubmitting(true);
        try {
            // Initialize payment with ModemPay for the first month
            const result = await initializePayment(
                pricing.totalMonthlyPrice,
                'GMD',
                {
                    email: user.email,
                    phone: user.phone,
                    name: user.name,
                    type: 'subscription',
                    plan,
                    collectorId: selectedCollector.id,
                    collectorName: selectedCollector.displayName,
                }
            );

            setPaymentResult(result);
            setShowSetupModal(false);
            setShowPaymentModal(true);
        } catch (err) {
            console.error('Payment initialization failed:', err);
            alert('Failed to initialize payment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Step 2: Payment confirmed → create the subscription in Firestore
    const handlePaymentSuccess = useCallback(async (orderId: string) => {
        if (!user || !selectedCollector) return;

        try {
            await createSubscription(
                user.id,
                plan,
                bucketCount,
                largeBinCount,
                selectedCollector.id,
                undefined,
                preferredDay,
                undefined
            );
            setShowPaymentModal(false);
            setSuccess(true);
            setShowSetupModal(true); // Re-show modal with success state
            // Refresh subscription data
            await loadSubscription();
            setTimeout(() => {
                setShowSetupModal(false);
                setSuccess(false);
            }, 2000);
        } catch (err) {
            console.error('Subscription creation failed after payment:', err);
            setShowPaymentModal(false);
            setSuccess(true);
            setShowSetupModal(true);
            await loadSubscription();
            setTimeout(() => {
                setShowSetupModal(false);
                setSuccess(false);
            }, 2000);
        }
    }, [user, selectedCollector, plan, bucketCount, largeBinCount, preferredDay, loadSubscription]);

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    if (isLoading && subLoading) {
        return (
            <div className="min-h-full bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100 sticky top-0 z-30">
                <div className="flex items-center gap-3 mb-4">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </motion.button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Subscribe</h1>
                        <p className="text-xs text-gray-500">
                            {activeSub && activeSub.status !== 'cancelled'
                                ? 'Manage your subscription'
                                : 'Find a collector for regular pickups'
                            }
                        </p>
                    </div>
                </div>

                {/* Only show search when browsing collectors (no active sub) */}
                {(!activeSub || activeSub.status === 'cancelled') && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search collectors..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#0E7A3B] focus:bg-white border-0 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200"
                            >
                                <X className="w-3 h-3 text-gray-400" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="px-5 py-4 space-y-4 pb-24">
                {/* Active Subscription Card */}
                {activeSub && activeSub.status !== 'cancelled' && (
                    <>
                        <ActiveSubscriptionCard
                            subscription={activeSub}
                            onModify={() => setShowModifyModal(true)}
                            onRefresh={loadSubscription}
                        />

                        {/* Divider to browse more collectors */}
                        <div className="flex items-center gap-3 pt-2">
                            <div className="h-px bg-gray-200 flex-1" />
                            <span className="text-xs text-gray-400 font-medium">Switch Collector</span>
                            <div className="h-px bg-gray-200 flex-1" />
                        </div>
                    </>
                )}

                {/* Collectors List */}
                {filteredCollectors.length === 0 ? (
                    <div className="text-center py-16">
                        <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">
                            {searchQuery ? 'No collectors found' : 'No collectors available yet'}
                        </p>
                    </div>
                ) : (
                    filteredCollectors.map((collector, index) => (
                        <motion.button
                            key={collector.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                setSelectedCollector(collector);
                                setShowSetupModal(true);
                            }}
                            className="w-full bg-white rounded-2xl p-4 border border-gray-100 text-left hover:shadow-md transition-all"
                        >
                            <div className="flex items-center gap-4">
                                {/* Profile Image */}
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 overflow-hidden">
                                    {collector.profileImage ? (
                                        <img
                                            src={collector.profileImage}
                                            alt={collector.displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        collector.collectorType === 'organization' ? <Building2 className="w-8 h-8 text-white opacity-80" /> : collector.displayName.charAt(0).toUpperCase()
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="font-semibold text-gray-900 truncate">{collector.displayName}</h3>
                                        {collector.collectorType === 'organization' && (
                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded-full">ORG</span>
                                        )}
                                    </div>

                                    {/* Rating */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex items-center gap-0.5">
                                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                            <span className="text-xs font-medium text-gray-700">{collector.rating.toFixed(1)}</span>
                                        </div>
                                        <span className="text-gray-300">·</span>
                                        <span className="text-xs text-gray-500">{collector.totalReviews} reviews</span>
                                        <span className="text-gray-300">·</span>
                                        <span className="text-xs text-gray-500">{collector.totalPickups} pickups</span>
                                    </div>

                                    {/* Waste types */}
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {collector.wasteTypesHandled.slice(0, 3).map(wt => {
                                            const info = WASTE_TYPES.find(t => t.id === wt);
                                            return info ? (
                                                <span key={wt} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                                                    {info.icon} {info.name.split(' ')[0]}
                                                </span>
                                            ) : null;
                                        })}
                                        {collector.wasteTypesHandled.length > 3 && (
                                            <span className="text-xs text-gray-400">+{collector.wasteTypesHandled.length - 3}</span>
                                        )}
                                    </div>
                                </div>

                                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                            </div>
                        </motion.button>
                    ))
                )}
            </div>

            {/* Modify Subscription Modal */}
            {activeSub && activeSub.status !== 'cancelled' && (
                <ModifySubscriptionModal
                    subscription={activeSub}
                    isOpen={showModifyModal}
                    onClose={() => setShowModifyModal(false)}
                    onSaved={loadSubscription}
                />
            )}

            {/* Subscription Setup Modal (new subscription) */}
            <AnimatePresence>
                {showSetupModal && selectedCollector && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
                        onClick={() => !isSubmitting && setShowSetupModal(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {success ? (
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                        <Check className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">Subscribed!</h2>
                                    <p className="text-gray-500 text-sm">Your subscription with {selectedCollector.displayName} is active.</p>
                                </div>
                            ) : (
                                <div className="p-6">
                                    {/* Handle */}
                                    <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

                                    {/* Collector Info */}
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold overflow-hidden">
                                            {selectedCollector.profileImage ? (
                                                <img src={selectedCollector.profileImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                selectedCollector.collectorType === 'organization' ? <Building2 className="w-7 h-7 text-white opacity-80" /> : selectedCollector.displayName.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-gray-900">{selectedCollector.displayName}</h2>
                                            <div className="flex items-center gap-1">
                                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                <span className="text-xs text-gray-500">{selectedCollector.rating.toFixed(1)} · {selectedCollector.totalReviews} reviews</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Frequency */}
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Pickup Frequency</h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlan[]).map(p => (
                                                <motion.button
                                                    key={p}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setPlan(p)}
                                                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                                                        plan === p
                                                            ? 'bg-[#0E7A3B] text-white'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {SUBSCRIPTION_PLANS[p].name}
                                                </motion.button>
                                            ))}
                                        </div>
                                        <p className="mt-2 text-xs text-gray-400">{SUBSCRIPTION_PLANS[plan].description}</p>
                                    </div>

                                    {/* Waste Amount */}
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Waste Amount</h3>

                                        {/* Buckets */}
                                        <div className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-medium text-gray-900 text-sm">🪣 Buckets</h4>
                                                    <p className="text-xs text-gray-400">D25 each</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <motion.button
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setBucketCount(Math.max(0, bucketCount - 1))}
                                                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center"
                                                    >
                                                        <Minus className="w-3 h-3 text-gray-600" />
                                                    </motion.button>
                                                    <span className="w-6 text-center font-bold text-gray-900">{bucketCount}</span>
                                                    <motion.button
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setBucketCount(bucketCount + 1)}
                                                        className="w-8 h-8 rounded-lg bg-[#0E7A3B] text-white flex items-center justify-center"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Large Bins */}
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-medium text-gray-900 text-sm">🗑️ Large Bins</h4>
                                                    <p className="text-xs text-gray-400">D500 each</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <motion.button
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setLargeBinCount(Math.max(0, largeBinCount - 1))}
                                                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center"
                                                    >
                                                        <Minus className="w-3 h-3 text-gray-600" />
                                                    </motion.button>
                                                    <span className="w-6 text-center font-bold text-gray-900">{largeBinCount}</span>
                                                    <motion.button
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setLargeBinCount(largeBinCount + 1)}
                                                        className="w-8 h-8 rounded-lg bg-[#0E7A3B] text-white flex items-center justify-center"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preferred Day */}
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Preferred Pickup Day</h3>
                                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                                            {days.map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => setPreferredDay(d)}
                                                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                                                        preferredDay === d
                                                            ? 'bg-[#0E7A3B] text-white'
                                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {d.charAt(0).toUpperCase() + d.slice(1, 3)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Price Summary */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-500">Per pickup</span>
                                            <span className="font-medium text-gray-900">{formatPrice(pricing.pricePerPickup)}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-500">Pickups/month</span>
                                            <span className="font-medium text-gray-900">{SUBSCRIPTION_PLANS[plan].pickupsPerMonth}</span>
                                        </div>
                                        <div className="border-t border-gray-200 pt-2 mt-2">
                                            <div className="flex justify-between">
                                                <span className="font-bold text-gray-900">Monthly total</span>
                                                <span className="text-xl font-bold text-gray-900">{formatPrice(pricing.totalMonthlyPrice)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subscribe Button */}
                                    <button
                                        onClick={handleSubscribe}
                                        disabled={isSubmitting || (bucketCount === 0 && largeBinCount === 0)}
                                        className="w-full py-4 bg-[#0E7A3B] text-white font-semibold rounded-2xl disabled:opacity-30 transition-opacity flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>Subscribe · {formatPrice(pricing.totalMonthlyPrice)}/mo</>
                                        )}
                                    </button>

                                    <p className="text-center text-xs text-gray-400 mt-3">
                                        Payment collected when collector arrives. You can cancel anytime.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Payment Modal */}
            {paymentResult && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={(orderId) => handlePaymentSuccess(orderId)}
                    paymentUrl={paymentResult.paymentUrl}
                    orderId={paymentResult.id}
                    amount={paymentResult.amount}
                    currency={paymentResult.currency}
                />
            )}
        </div>
    );
}
