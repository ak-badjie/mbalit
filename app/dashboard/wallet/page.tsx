'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    Settings,
    FileText,
    Building2,
    Shield,
    HelpCircle,
    ChevronRight,
} from 'lucide-react';
import { WalletBalanceCard } from '@/components/ui/wallet-balance-card';
import { TransactionItem } from '@/components/ui/transaction-item';

const TRANSACTIONS: Array<{
    kind: 'credit' | 'debit' | 'refund';
    title: string;
    subtitle: string;
    timestamp: string;
    amount: string;
    balance?: string;
}> = [
    {
        kind: 'credit',
        title: 'Money Added',
        subtitle: 'From: Access Bank •••• 1234',
        timestamp: 'May 22, 2024 · 10:30 AM',
        amount: 'D2,000.00',
        balance: 'D4,560.00',
    },
    {
        kind: 'debit',
        title: 'Payment to GreenCity',
        subtitle: 'Booking #BKD-2024-00124',
        timestamp: 'May 22, 2024 · 11:15 AM',
        amount: 'D150.00',
        balance: 'D2,560.00',
    },
    {
        kind: 'credit',
        title: 'Money Added',
        subtitle: 'From: Cash Deposit',
        timestamp: 'May 20, 2024 · 09:45 AM',
        amount: 'D1,500.00',
        balance: 'D2,710.00',
    },
    {
        kind: 'debit',
        title: 'Payment to GreenCity',
        subtitle: 'Booking #BKD-2024-00120',
        timestamp: 'May 20, 2024 · 02:20 PM',
        amount: 'D120.00',
        balance: 'D1,210.00',
    },
    {
        kind: 'refund',
        title: 'Refund Received',
        subtitle: 'Booking #BKD-2024-00110',
        timestamp: 'May 18, 2024 · 04:10 PM',
        amount: 'D100.00',
        balance: 'D1,330.00',
    },
];

const QUICK_ACTIONS = [
    { icon: FileText, label: 'Transaction History', href: '/dashboard/wallet/history' },
    { icon: Building2, label: 'Bank Accounts', href: '/dashboard/wallet/accounts' },
    { icon: Shield, label: 'Withdrawal Requests', href: '/dashboard/wallet/withdrawals' },
    { icon: HelpCircle, label: 'Help & Support', href: '/dashboard/wallet/help' },
];

export default function WalletPage() {
    const router = useRouter();
    const [visible, setVisible] = useState(true);

    return (
        <div className="min-h-full bg-white">
            {/* Header */}
            <div className="px-5 pt-12 pb-2 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Wallet</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your balance and transactions</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="relative w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50">
                        <Bell className="w-5 h-5 text-gray-700" />
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                            3
                        </span>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50">
                        <Settings className="w-5 h-5 text-gray-700" />
                    </button>
                </div>
            </div>

            {/* Balance card */}
            <div className="px-5 mt-4">
                <WalletBalanceCard
                    balance="D4,560.00"
                    balanceWords="GMD Four Thousand Five Hundred Sixty"
                    totalAdded="D12,800.00"
                    totalSpent="D8,240.00"
                    pendingWithdrawal="D1,200.00"
                    pendingRequests={1}
                    visible={visible}
                    onToggleVisibility={() => setVisible((v) => !v)}
                    onAddMoney={() => router.push('/dashboard/wallet/add')}
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
                    <div>
                        {TRANSACTIONS.map((t, i) => (
                            <TransactionItem
                                key={i}
                                kind={t.kind}
                                title={t.title}
                                subtitle={t.subtitle}
                                timestamp={t.timestamp}
                                amount={t.amount}
                                balanceAfter={t.balance}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Add money promo */}
            <div className="px-5 mt-4 mb-6">
                <div className="relative overflow-hidden bg-[#F1FAF4] border border-[#D2F4E1] rounded-2xl p-4 flex items-center gap-3">
                    <div className="flex-1">
                        <h3 className="font-bold text-[#0F1A14] text-base">Add Money to Wallet</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Top up your wallet for faster and seamless transactions.
                        </p>
                        <button
                            onClick={() => router.push('/dashboard/wallet/add')}
                            className="mt-3 inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-semibold text-sm"
                        >
                            Add Money Now
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <img
                        src="/illustrations/add-money.svg"
                        alt=""
                        className="w-28 h-24 flex-shrink-0"
                    />
                </div>
            </div>
        </div>
    );
}
