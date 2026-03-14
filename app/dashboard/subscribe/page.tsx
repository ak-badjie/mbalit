'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getAllCollectors, CollectorListItem } from '@/lib/firestore';
import { createSubscription } from '@/lib/subscriptions';
import { calculateSubscriptionPrice, formatPrice, SUBSCRIPTION_PLANS, WASTE_TYPES } from '@/lib/waste-config';
import { SubscriptionPlan } from '@/types';

export default function SubscribePage() {
    const router = useRouter();
    const { user } = useAuth();

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

    const handleSubscribe = async () => {
        if (!user || !selectedCollector) return;
        setIsSubmitting(true);
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
            setSuccess(true);
            setTimeout(() => {
                setShowSetupModal(false);
                router.push('/dashboard');
            }, 2000);
        } catch (err) {
            console.error('Subscription failed:', err);
            alert('Failed to create subscription. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
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
                        <p className="text-xs text-gray-500">Find a collector for regular pickups</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search collectors..."
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:bg-white border-0 transition-all"
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
            </div>

            {/* Collectors List */}
            <div className="px-5 py-4 space-y-3 pb-24">
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

            {/* Subscription Setup Modal */}
            <AnimatePresence>
                {showSetupModal && selectedCollector && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
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
                                                            ? 'bg-gray-900 text-white'
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
                                                        className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center"
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
                                                        className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center"
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
                                                            ? 'bg-gray-900 text-white'
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
                                        className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-30 transition-opacity flex items-center justify-center gap-2"
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
        </div>
    );
}
