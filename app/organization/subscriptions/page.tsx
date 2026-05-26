'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Loader2, Star, Calendar, RefreshCw, Package, DollarSign, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getOrganizationByOwner } from '@/lib/firestore';
import { getCollectorSubscriptions, getSubscriptionSummary } from '@/lib/subscriptions';
import { formatPrice } from '@/lib/waste-config';

export default function SubscriptionsPage() {
    const router = useRouter();
    const { user } = useAuth();
    
    const [subs, setSubs] = useState<any[]>([]);
    const [org, setOrg] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const orgData = (await getOrganizationByOwner(user.id)) as { id: string; orgCode?: string; escrowBalance?: number } | null;
                if (cancelled || !orgData) return;
                setOrg(orgData);
                
                const fetchedSubs = await getCollectorSubscriptions(undefined, orgData.id);
                if (cancelled) return;
                setSubs(fetchedSubs);
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    const totalMonthlyRevenue = subs.reduce((sum, s) => sum + (s.totalMonthlyPrice || 0), 0);

    return (
        <div className="min-h-[100dvh] bg-white pb-24">
            <div className="px-5 pt-12 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-[#0F1A14] leading-tight">Subscriptions</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {isLoading ? '...' : `${subs.length} active subscriber${subs.length === 1 ? '' : 's'}`}
                        </p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0E7A3B]" />
                </div>
            ) : (
                <>
                    <div className="px-5 mt-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative overflow-hidden rounded-3xl p-5 shadow-xl shadow-green-900/10"
                            style={{ backgroundImage: 'linear-gradient(135deg, #0E7A3B 0%, #065F2B 50%, #0A4D25 100%)' }}
                        >
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <Star className="w-5 h-5 text-green-100" />
                                    <span className="text-green-100 text-sm font-medium">Subscriptions Overview</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-white/60 text-xs">Total Monthly Revenue</p>
                                        <p className="text-2xl font-bold text-white mt-1">{formatPrice(totalMonthlyRevenue)}</p>
                                    </div>
                                    <div>
                                        <p className="text-white/60 text-xs">Escrow Balance</p>
                                        <p className="text-2xl font-bold text-white mt-1">{formatPrice(org?.escrowBalance || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="px-5 mt-6 space-y-4">
                        {subs.length === 0 ? (
                            <div className="py-16 flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-4">
                                    <RefreshCw className="w-7 h-7" />
                                </div>
                                <h3 className="font-bold text-[#0F1A14]">No subscriptions yet</h3>
                                <p className="text-sm text-gray-500 mt-1 max-w-[20rem]">
                                    When customers subscribe to your services, they will appear here.
                                </p>
                            </div>
                        ) : (
                            subs.map((sub, index) => {
                                const summary = getSubscriptionSummary(sub);
                                return (
                                    <motion.div
                                        key={sub.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-full bg-[#F1FAF4] flex items-center justify-center text-[#0E7A3B]">
                                                    <Star className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-[#0F1A14] text-sm">{summary.planName}</h3>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            sub.status === 'active' ? 'bg-[#E8F6EE] text-[#0E7A3B]' : 
                                                            sub.status === 'paused' ? 'bg-amber-100 text-amber-700' : 
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-[#0E7A3B]">{summary.monthlyPrice}</p>
                                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">per month</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-gray-400" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-gray-500 font-medium">Containers</p>
                                                    <p className="text-xs font-semibold text-[#0F1A14] truncate">{summary.containerSummary}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-gray-500 font-medium">Next Pickup</p>
                                                    <p className="text-xs font-semibold text-[#0F1A14] truncate">{summary.nextPickup}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
