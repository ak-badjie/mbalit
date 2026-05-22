'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Settings, TrendingUp, Package, Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getCollectorStats, getCollectorEarnings } from '@/lib/firestore';
import { CollectorStats } from '@/types';

const formatGmd = (n: number | undefined) =>
    `D${(typeof n === 'number' ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CollectorEarningsPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<CollectorStats | null>(null);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const [s, t] = await Promise.all([
                    getCollectorStats(user.id),
                    getCollectorEarnings(user.id),
                ]);
                if (cancelled) return;
                setStats(s);
                setTotal(t);
            } catch (err) {
                console.error('Earnings load failed:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    return (
        <div className="min-h-full bg-white">
            <div className="px-5 pt-12 pb-2 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Earnings</h1>
                    <p className="text-sm text-gray-500 mt-1">Track your collection income</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-gray-700" />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-gray-700" />
                    </button>
                </div>
            </div>

            <div className="px-5 mt-4">
                <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #0E7A3B 0%, #1FA653 100%)' }}>
                    <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
                    <div className="relative">
                        <p className="text-sm text-white/90">This Month</p>
                        <p className="text-[34px] font-extrabold leading-none mt-1">
                            {isLoading ? '…' : formatGmd(stats?.monthlyEarnings ?? 0)}
                        </p>
                        <p className="mt-2 text-xs text-white/80">
                            All-time {formatGmd(total)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-5 mt-4 grid grid-cols-3 gap-3">
                <StatTile icon={TrendingUp} label="This Week" value={formatGmd(stats?.weeklyEarnings ?? 0)} loading={isLoading} />
                <StatTile icon={Package} label="Pickups" value={String(stats?.monthlyPickups ?? 0)} loading={isLoading} />
                <StatTile icon={Calendar} label="Today" value={formatGmd(stats?.todayEarnings ?? 0)} loading={isLoading} />
            </div>

            {!isLoading && !stats?.monthlyPickups && (
                <div className="px-5 mt-6 mb-6">
                    <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mx-auto mb-3">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-[#0F1A14] text-sm">No earnings yet</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-[20rem] mx-auto">
                            Complete your first pickup to start seeing earnings here.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatTile({ icon: Icon, label, value, loading }: { icon: React.ElementType; label: string; value: string; loading: boolean }) {
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-2">
                <Icon className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-gray-500">{label}</p>
            <p className="font-bold text-[#0F1A14] text-base leading-tight">
                {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : value}
            </p>
        </div>
    );
}
