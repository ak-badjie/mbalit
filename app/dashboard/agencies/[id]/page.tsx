'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Building2,
    Star,
    Users,
    Truck,
    MapPin,
    ArrowLeft,
    Loader2,
    CreditCard,
    Calendar,
    Package,
    Check,
    Repeat,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAgencyById, AgencyListing } from '@/lib/user-agencies';
import { getAgencyPlans, subscribeToAgencyPlan, getUserSubscriptions } from '@/lib/agency-subscriptions';
import { addAgencyToPreferred, getUserPreferredAgencies } from '@/lib/user-agencies';
import { AgencySubscriptionPlan, UserAgencySubscription } from '@/types';
import { formatPrice } from '@/lib/waste-config';

export default function AgencyDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const agencyId = params.id as string;
    const { user } = useAuth();

    const [agency, setAgency] = useState<AgencyListing | null>(null);
    const [plans, setPlans] = useState<AgencySubscriptionPlan[]>([]);
    const [userSubscriptions, setUserSubscriptions] = useState<UserAgencySubscription[]>([]);
    const [isPreferred, setIsPreferred] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

    useEffect(() => {
        if (agencyId && user) {
            loadData();
        }
    }, [agencyId, user]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [agencyData, plansData, preferredIds, subs] = await Promise.all([
                getAgencyById(agencyId),
                getAgencyPlans(agencyId),
                getUserPreferredAgencies(user!.id),
                getUserSubscriptions(user!.id),
            ]);
            setAgency(agencyData);
            setPlans(plansData.filter(p => p.isActive));
            setIsPreferred(preferredIds.includes(agencyId));
            setUserSubscriptions(subs.filter(s => s.agencyId === agencyId));
        } catch (error) {
            console.error('Failed to load agency:', error);
        }
        setIsLoading(false);
    };

    const handleSubscribe = async (planId: string) => {
        if (!user) return;
        setSubscribingPlanId(planId);
        try {
            const subscription = await subscribeToAgencyPlan(user.id, planId);
            setUserSubscriptions(prev => [...prev, subscription]);

            // Also add to preferred if not already
            if (!isPreferred) {
                await addAgencyToPreferred(user.id, agencyId);
                setIsPreferred(true);
            }
        } catch (error) {
            console.error('Failed to subscribe:', error);
            alert('Failed to subscribe. Please try again.');
        }
        setSubscribingPlanId(null);
    };

    const isSubscribedToPlan = (planId: string) => {
        return userSubscriptions.some(s => s.planId === planId && s.status === 'active');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50  flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
                    <p className="text-gray-500 ">Loading agency...</p>
                </div>
            </div>
        );
    }

    if (!agency) {
        return (
            <div className="min-h-screen bg-gray-50  flex items-center justify-center p-4">
                <Card variant="elevated" padding="lg" className="text-center max-w-md">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900  mb-2">Agency Not Found</h3>
                    <p className="text-gray-500  text-sm mb-4">
                        This agency may no longer exist.
                    </p>
                    <Button variant="primary" onClick={() => router.back()}>
                        Go Back
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 ">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white  border-b border-gray-200  px-4 py-4">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full hover:bg-gray-100  transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 " />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 ">Agency Details</h1>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Agency Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 mb-6 shadow-xl"
                >
                    <div className="relative z-10">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Building2 className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-white mb-1">{agency.name}</h2>
                                {agency.description && (
                                    <p className="text-emerald-100 text-sm">{agency.description}</p>
                                )}
                            </div>
                            {isPreferred && (
                                <Badge className="bg-white/20 text-white border-0">
                                    <Check className="w-3 h-3 mr-1" /> Added
                                </Badge>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <Star className="w-4 h-4 text-amber-300" />
                                    <span className="text-white font-bold">{agency.rating.toFixed(1)}</span>
                                </div>
                                <p className="text-emerald-100 text-xs">Rating</p>
                            </div>
                            <div className="text-center">
                                <p className="text-white font-bold">{agency.driversCount}</p>
                                <p className="text-emerald-100 text-xs">Drivers</p>
                            </div>
                            <div className="text-center">
                                <p className="text-white font-bold">{agency.totalPickups}</p>
                                <p className="text-emerald-100 text-xs">Pickups</p>
                            </div>
                        </div>

                        {/* Service Areas */}
                        {agency.serviceAreas && agency.serviceAreas.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/20">
                                <div className="flex items-center gap-2 text-emerald-100 text-sm">
                                    <MapPin className="w-4 h-4" />
                                    <span>{agency.serviceAreas.join(', ')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Subscription Plans */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                >
                    <h3 className="text-sm font-semibold text-gray-500  uppercase tracking-wider mb-3">
                        Subscription Plans ({plans.length})
                    </h3>

                    {plans.length === 0 ? (
                        <Card variant="default" padding="lg" className="text-center">
                            <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500  text-sm">
                                No subscription plans available yet.
                            </p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {plans.map((plan, index) => {
                                const isSubscribed = isSubscribedToPlan(plan.id);
                                return (
                                    <motion.div
                                        key={plan.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 + index * 0.05 }}
                                    >
                                        <Card
                                            variant="elevated"
                                            padding="lg"
                                            className={isSubscribed ? 'ring-2 ring-emerald-500' : ''}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900  text-lg">{plan.name}</h4>
                                                    {plan.description && (
                                                        <p className="text-sm text-gray-500 ">{plan.description}</p>
                                                    )}
                                                </div>
                                                <Badge variant="secondary" className="flex items-center gap-1">
                                                    <Repeat className="w-3 h-3" />
                                                    {plan.frequency}
                                                </Badge>
                                            </div>

                                            {/* What's included */}
                                            <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gray-50  rounded-xl">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-gray-900 ">{plan.bucketCount}</p>
                                                    <p className="text-xs text-gray-500 ">Buckets</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-gray-900 ">{plan.trashBagCount}</p>
                                                    <p className="text-xs text-gray-500 ">Trash Bags</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-gray-900 ">{plan.largeBinCount}</p>
                                                    <p className="text-xs text-gray-500 ">Large Bins</p>
                                                </div>
                                            </div>

                                            {/* Price and Action */}
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-2xl font-bold text-emerald-600">
                                                        {formatPrice(plan.price)}
                                                    </span>
                                                    <span className="text-gray-500  text-sm">/{plan.frequency}</span>
                                                </div>

                                                {isSubscribed ? (
                                                    <Badge variant="success" className="px-4 py-2">
                                                        <Check className="w-4 h-4 mr-1" /> Subscribed
                                                    </Badge>
                                                ) : (
                                                    <Button
                                                        variant="primary"
                                                        onClick={() => handleSubscribe(plan.id)}
                                                        disabled={subscribingPlanId === plan.id}
                                                    >
                                                        {subscribingPlanId === plan.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        ) : null}
                                                        Subscribe
                                                    </Button>
                                                )}
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>

                {/* Pay Per Pickup Option */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card variant="default" padding="lg" className="border-2 border-dashed border-gray-200 ">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-gray-100  rounded-xl">
                                <Package className="w-6 h-6 text-gray-600 " />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-900  mb-1">Pay Per Pickup</h4>
                                <p className="text-sm text-gray-500  mb-3">
                                    Not ready to subscribe? You can still request pickups from this agency and pay per delivery.
                                </p>
                                <Button
                                    variant="secondary"
                                    onClick={() => router.push('/dashboard?action=book')}
                                >
                                    Request Pickup
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
