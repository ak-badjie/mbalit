'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    Settings,
    FileText,
    Building2,
    Shield,
    HelpCircle,
    ChevronRight,
    Wallet as WalletIcon,
    Loader2,
} from 'lucide-react';
import { WalletBalanceCard } from '@/components/ui/wallet-balance-card';
import { TransactionItem, TransactionKind } from '@/components/ui/transaction-item';
import { useAuth } from '@/lib/auth-context';
import { getWalletBalance, getWalletTransactions } from '@/lib/firestore';

const QUICK_ACTIONS = [
    { icon: FileText, label: 'Transaction History', href: '/dashboard/wallet/history' },
    { icon: Building2, label: 'Bank Accounts', href: '/dashboard/wallet/accounts' },
    { icon: Shield, label: 'Withdrawal Requests', href: '/dashboard/wallet/withdrawals' },
    { icon: HelpCircle, label: 'Help & Support', href: '/dashboard/wallet/help' },
];

interface TxnDoc {
    id: string;
    type?: string;
    direction?: 'credit' | 'debit';
    title?: string;
    description?: string;
    amount?: number;
    balanceAfter?: number;
    bookingId?: string;
    source?: string;
    createdAt?: Date;
    [key: string]: unknown;
}

function formatGmd(amount: number | undefined): string {
    const value = typeof amount === 'number' ? amount : 0;
    return `D${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function inWords(amount: number): string {
    // Cheap "currency in words" helper — good enough for the readout under the balance.
    if (!amount) return 'GMD Zero';
    return `GMD ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function classify(t: TxnDoc): TransactionKind {
    if (t.type === 'refund') return 'refund';
    return t.direction === 'debit' ? 'debit' : 'credit';
}

function timestamp(d?: Date): string {
    if (!d) return '';
    return d.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function WalletPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [visible, setVisible] = useState(true);
    const [balance, setBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<TxnDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const [b, txns] = await Promise.all([
                    getWalletBalance(user.id),
                    getWalletTransactions(user.id, 5),
                ]);
                if (cancelled) return;
                setBalance(b);
                setTransactions(txns as TxnDoc[]);
            } catch (err) {
                console.error('Wallet load failed:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    return (
        <div className="min-h-full bg-white">
            {/* Header */}
            <div className="px-5 pt-12 pb-2 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Wallet</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your balance and transactions</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push('/dashboard/notifications')}
                        className="relative w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50"
                    >
                        <Bell className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/settings')}
                        className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50"
                    >
                        <Settings className="w-5 h-5 text-gray-700" />
                    </button>
                </div>
            </div>

            {/* Balance card */}
            <div className="px-5 mt-4">
                <WalletBalanceCard
                    balance={formatGmd(balance)}
                    balanceWords={inWords(balance)}
                    totalEarned={formatGmd(0)}
                    totalSpent={formatGmd(0)}
                    pendingWithdrawal={formatGmd(0)}
                    pendingRequests={0}
                    visible={visible}
                    onToggleVisibility={() => setVisible((v) => !v)}
                    onWithdraw={() => router.push('/dashboard/wallet/withdraw')}
                />
            </div>

            {/* Quick actions */}
            <div className="px-5 mt-4">
                <div className="grid grid-cols-4 gap-2 bg-white border border-gray-100 rounded-2xl p-3">
                    {QUICK_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.label}
                                onClick={() => router.push(action.href)}
                                className="flex flex-col items-center text-center gap-2 py-2 px-1 rounded-xl hover:bg-[#F1FAF4] transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B]">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-semibold text-[#0F1A14] leading-tight">
                                    {action.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Recent transactions */}
            <div className="px-5 mt-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="font-bold text-[#0F1A14] text-base">Recent Transactions</h2>
                        <button
                            onClick={() => router.push('/dashboard/wallet/history')}
                            className="text-sm font-semibold text-[#0E7A3B] hover:underline"
                        >
                            View All
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="py-10 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-[#0E7A3B]" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <EmptyTransactions />
                    ) : (
                        <div>
                            {transactions.map((t) => (
                                <TransactionItem
                                    key={t.id}
                                    kind={classify(t)}
                                    title={t.title || (t.direction === 'debit' ? 'Payment' : 'Money Added')}
                                    subtitle={t.description || t.source || (t.bookingId ? `Booking #${t.bookingId}` : '')}
                                    timestamp={timestamp(t.createdAt)}
                                    amount={formatGmd(t.amount)}
                                    balanceAfter={typeof t.balanceAfter === 'number' ? formatGmd(t.balanceAfter) : undefined}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}

function EmptyTransactions() {
    return (
        <div className="py-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-3">
                <WalletIcon className="w-6 h-6" />
            </div>
            <p className="font-bold text-[#0F1A14] text-sm">No transactions yet</p>
            <p className="text-xs text-gray-500 mt-1 max-w-[18rem]">
                Book a pickup or receive payments to see your activity here.
            </p>
        </div>
    );
}
