'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Settings, TrendingUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getWalletBalance, getWalletTransactions } from '@/lib/firestore';

const formatGmd = (n: number | undefined) =>
    `D${(typeof n === 'number' ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface TxnDoc {
    direction?: 'credit' | 'debit';
    amount?: number;
    type?: string;
    createdAt?: Date;
}

export default function EarningsPage() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [balance, setBalance] = useState(0);
    const [monthIn, setMonthIn] = useState(0);
    const [monthOut, setMonthOut] = useState(0);
    const [hasActivity, setHasActivity] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const [b, txns] = await Promise.all([
                    getWalletBalance(user.id),
                    getWalletTransactions(user.id, 100),
                ]);
                if (cancelled) return;
                setBalance(b);
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const list = (txns as TxnDoc[]).filter((t) => t.createdAt && t.createdAt >= startOfMonth);
                setMonthIn(list.filter((t) => t.direction === 'credit').reduce((s, t) => s + (t.amount || 0), 0));
                setMonthOut(list.filter((t) => t.direction === 'debit').reduce((s, t) => s + (t.amount || 0), 0));
                setHasActivity((txns as TxnDoc[]).length > 0);
            } catch (err) {
                console.error('Earnings summary load failed:', err);
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
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Activity</h1>
                    <p className="text-sm text-gray-500 mt-1">Your wallet summary this month</p>
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
                        <p className="text-sm text-white/90">Available Balance</p>
                        <p className="text-[34px] font-extrabold leading-none mt-1">
                            {isLoading ? '…' : formatGmd(balance)}
                        </p>
                        <p className="mt-2 text-xs text-white/80">This month so far</p>
                    </div>
                </div>
            </div>

            <div className="px-5 mt-4 grid grid-cols-2 gap-3">
                <div className="bg-white border border-gray-100 rounded-2xl p-3">
                    <p className="text-[11px] text-gray-500">Money In</p>
                    <p className="font-bold text-[#0E7A3B] text-base leading-tight mt-0.5">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : `+${formatGmd(monthIn)}`}
                    </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-3">
                    <p className="text-[11px] text-gray-500">Money Out</p>
                    <p className="font-bold text-[#C2410C] text-base leading-tight mt-0.5">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : `-${formatGmd(monthOut)}`}
                    </p>
                </div>
            </div>

            {!isLoading && !hasActivity && (
                <div className="px-5 mt-6 mb-6">
                    <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mx-auto mb-3">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-[#0F1A14] text-sm">No activity yet</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-[20rem] mx-auto">
                            Add money to your wallet or book a pickup to start tracking your activity.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
