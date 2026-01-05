'use client';

/**
 * Agency Owner Dashboard Components
 * Displayed for collectors with collectorType === 'agency_owner'
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    UserPlus,
    Check,
    X,
    Building2,
    Crown,
    Star,
    Truck,
    Calendar,
    CreditCard,
    Package,
    DollarSign,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/waste-config';
import { Agency, CollectorType, Collector } from '@/types';
import { getAgencyByOwner, approveDriver, removeDriver, getAgencyDrivers, getPendingDrivers } from '@/lib/agencies';
import { getAgencyPlans, getAgencySubscribers } from '@/lib/agency-subscriptions';
import { AgencySubscriptionPlan, UserAgencySubscription } from '@/types';

interface AgencyDashboardProps {
    userId: string;
    userName: string;
}

interface DriverInfo {
    id: string;
    name: string;
    email: string;
    status: 'approved' | 'pending';
    totalPickups?: number;
}

export function AgencyOwnerDashboard({ userId, userName }: AgencyDashboardProps) {
    const [agency, setAgency] = useState<Agency | null>(null);
    const [drivers, setDrivers] = useState<DriverInfo[]>([]);
    const [pendingDrivers, setPendingDrivers] = useState<DriverInfo[]>([]);
    const [subscribers, setSubscribers] = useState<UserAgencySubscription[]>([]);
    const [plans, setPlans] = useState<AgencySubscriptionPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        loadAgencyData();
    }, [userId]);

    const loadAgencyData = async () => {
        setIsLoading(true);
        try {
            const agencyData = await getAgencyByOwner(userId);
            if (agencyData) {
                setAgency(agencyData);

                const [approvedDrivers, pendingDriversData, plansData, subscribersData] = await Promise.all([
                    getAgencyDrivers(agencyData.id),
                    getPendingDrivers(agencyData.id),
                    getAgencyPlans(agencyData.id),
                    getAgencySubscribers(agencyData.id),
                ]);

                // Map to DriverInfo format
                const approved = approvedDrivers.map(d => ({
                    id: d.id,
                    name: d.name,
                    email: d.email,
                    status: 'approved' as const,
                    totalPickups: d.totalPickups
                }));
                const pending = pendingDriversData.map(d => ({
                    id: d.id,
                    name: d.name,
                    email: d.email,
                    status: 'pending' as const
                }));
                setDrivers(approved);
                setPendingDrivers(pending);
                setPlans(plansData);
                setSubscribers(subscribersData);
            }
        } catch (error) {
            console.error('Failed to load agency data:', error);
        }
        setIsLoading(false);
    };

    const handleApproveDriver = async (driverId: string) => {
        if (!agency) return;
        setActionLoading(driverId);
        try {
            await approveDriver(agency.id, driverId, userId);
            // Move driver from pending to approved
            const driver = pendingDrivers.find(d => d.id === driverId);
            if (driver) {
                setPendingDrivers(prev => prev.filter(d => d.id !== driverId));
                setDrivers(prev => [...prev, { ...driver, status: 'approved' }]);
            }
        } catch (error) {
            console.error('Failed to approve driver:', error);
        }
        setActionLoading(null);
    };

    const handleRemoveDriver = async (driverId: string) => {
        if (!agency) return;
        setActionLoading(driverId);
        try {
            await removeDriver(agency.id, driverId, userId);
            setDrivers(prev => prev.filter(d => d.id !== driverId));
            setPendingDrivers(prev => prev.filter(d => d.id !== driverId));
        } catch (error) {
            console.error('Failed to remove driver:', error);
        }
        setActionLoading(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!agency) {
        return (
            <Card variant="elevated" padding="lg" className="text-center">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900  mb-2">No Agency Found</h3>
                <p className="text-gray-500  text-sm">
                    Your agency data could not be loaded.
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Agency Header Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-5 shadow-xl shadow-amber-500/20"
            >
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Crown className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{agency.name}</h2>
                            <p className="text-amber-100 text-sm">Agency Code: {agency.agencyCode}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-amber-100 text-xs">Drivers</p>
                            <p className="text-2xl font-bold text-white">{drivers.length}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-amber-100 text-xs">Subscribers</p>
                            <p className="text-2xl font-bold text-white">{subscribers.length}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-amber-100 text-xs">Wallet</p>
                            <p className="text-2xl font-bold text-white">{formatPrice(agency.walletBalance)}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Pending Driver Requests */}
            {pendingDrivers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h3 className="text-sm font-semibold text-gray-500  uppercase tracking-wider mb-3">
                        Pending Requests ({pendingDrivers.length})
                    </h3>
                    <div className="space-y-2">
                        {pendingDrivers.map((driver) => (
                            <Card key={driver.id} variant="elevated" padding="md">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-100  flex items-center justify-center">
                                            <UserPlus className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 ">{driver.name}</p>
                                            <p className="text-sm text-gray-500 ">{driver.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveDriver(driver.id)}
                                            disabled={actionLoading === driver.id}
                                            className="text-red-500 hover:bg-red-50"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => handleApproveDriver(driver.id)}
                                            disabled={actionLoading === driver.id}
                                        >
                                            {actionLoading === driver.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Check className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Active Drivers */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h3 className="text-sm font-semibold text-gray-500  uppercase tracking-wider mb-3">
                    Drivers ({drivers.length})
                </h3>
                {drivers.length === 0 ? (
                    <Card variant="default" padding="lg" className="text-center">
                        <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500  text-sm">
                            No drivers yet. Share your agency code: <span className="font-mono font-bold">{agency.agencyCode}</span>
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {drivers.map((driver) => (
                            <Card key={driver.id} variant="default" padding="md">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100  flex items-center justify-center">
                                            <Truck className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 ">{driver.name}</p>
                                            <p className="text-xs text-gray-500 ">
                                                {driver.totalPickups || 0} pickups
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveDriver(driver.id)}
                                        disabled={actionLoading === driver.id}
                                        className="text-red-500 hover:bg-red-50"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Subscription Plans */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-500  uppercase tracking-wider">
                        Subscription Plans ({plans.length})
                    </h3>
                    <Button variant="ghost" size="sm" leftIcon={<CreditCard className="w-4 h-4" />}>
                        Add Plan
                    </Button>
                </div>
                {plans.length === 0 ? (
                    <Card variant="default" padding="lg" className="text-center">
                        <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500  text-sm">
                            No subscription plans yet. Create one to start earning recurring revenue.
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {plans.map((plan) => (
                            <Card key={plan.id} variant="elevated" padding="md">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 ">{plan.name}</h4>
                                        <p className="text-xs text-gray-500 ">{plan.frequency}</p>
                                    </div>
                                    <Badge variant={plan.isActive ? 'success' : 'secondary'}>
                                        {plan.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-bold text-emerald-600">{formatPrice(plan.price)}</span>
                                    <span className="text-xs text-gray-500 ">/ {plan.frequency}</span>
                                </div>
                                <p className="text-xs text-gray-500  mt-1">
                                    You earn: {formatPrice(plan.agencyEarnings)} (70%)
                                </p>
                            </Card>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
}

// Driver Dashboard (limited view - no wallet)
interface DriverDashboardProps {
    userId: string;
    userName: string;
    agencyId?: string;
    isApproved?: boolean;
}

export function DriverDashboard({ userId, userName, agencyId, isApproved }: DriverDashboardProps) {
    return (
        <div className="space-y-6">
            {/* Driver Status Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-5 shadow-xl shadow-blue-500/20"
            >
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Truck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{userName}</h2>
                            <p className="text-blue-100 text-sm">Agency Driver</p>
                        </div>
                    </div>

                    {/* Approval Status */}
                    <div className="p-3 bg-white/10 rounded-xl">
                        {isApproved ? (
                            <div className="flex items-center gap-2 text-white">
                                <Check className="w-5 h-5" />
                                <span>Approved - Ready to accept jobs</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-amber-200">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Pending approval from agency owner</span>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {!isApproved && (
                <Card variant="elevated" padding="lg" className="text-center border-2 border-amber-200">
                    <Loader2 className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-spin" />
                    <h3 className="font-semibold text-gray-900  mb-2">Waiting for Approval</h3>
                    <p className="text-gray-500  text-sm">
                        Your agency owner needs to approve your request before you can start accepting jobs.
                    </p>
                </Card>
            )}

            {/* Note about payments */}
            <Card variant="default" padding="md" className="bg-blue-50  border-blue-200">
                <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-blue-900">Payment Info</p>
                        <p className="text-sm text-blue-700">
                            As an agency driver, your earnings are handled by your agency. Contact your agency owner for payment details.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
