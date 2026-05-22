'use client';

import React, { useState } from 'react';
import { Bell, Settings, FileText, Building2, Shield, HelpCircle } from 'lucide-react';
import { WalletBalanceCard } from '@/components/ui/wallet-balance-card';
import { TransactionItem } from '@/components/ui/transaction-item';

const TRANSACTIONS: Array<{ kind: 'credit' | 'debit' | 'refund'; title: string; subtitle: string; timestamp: string; amount: string; balance?: string }> = [
    { kind: 'credit', title: 'Pickup Earnings (Team)', subtitle: 'May 22 batch', timestamp: 'May 22, 2024 · 06:00 PM', amount: 'D3,250.00', balance: 'D18,420.00' },
    { kind: 'debit', title: 'Payroll Payout', subtitle: 'Aminata Sow + 3 others', timestamp: 'May 21, 2024 · 09:00 AM', amount: 'D5,400.00', balance: 'D15,170.00' },
    { kind: 'credit', title: 'Pickup Earnings (Team)', subtitle: 'May 20 batch', timestamp: 'May 20, 2024 · 06:00 PM', amount: 'D2,840.00', balance: 'D20,570.00' },
];

const QUICK_ACTIONS = [
    { icon: FileText, label: 'Transactions', href: '/organization/wallet/history' },
    { icon: Building2, label: 'Bank Accounts', href: '/organization/wallet/accounts' },
    { icon: Shield, label: 'Withdrawals', href: '/organization/wallet/withdrawals' },
    { icon: HelpCircle, label: 'Support', href: '/organization/wallet/help' },
];

export default function OrgWalletPage() {
    const [visible, setVisible] = useState(true);

    return (
        <div className="min-h-full bg-white">
            <div className="px-5 pt-12 pb-2 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Wallet</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage company balance and payouts</p>
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
                <WalletBalanceCard
                    balance="D18,420.00"
                    balanceWords="GMD Eighteen Thousand Four Hundred Twenty"
                    totalAdded="D24,300.00"
                    totalSpent="D14,600.00"
                    pendingWithdrawal="D2,500.00"
                    pendingRequests={2}
                    visible={visible}
                    onToggleVisibility={() => setVisible((v) => !v)}
                />
            </div>

            <div className="px-5 mt-4">
                <div className="grid grid-cols-4 gap-2 bg-white border border-gray-100 rounded-2xl p-3">
                    {QUICK_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.label}
                                className="flex flex-col items-center text-center gap-2 py-2 px-1 rounded-xl hover:bg-[#F1FAF4] transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B]">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-semibold text-[#0F1A14] leading-tight">{action.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="px-5 mt-4 mb-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="font-bold text-[#0F1A14] text-base">Recent Transactions</h2>
                        <button className="text-sm font-semibold text-[#0E7A3B] hover:underline">View All</button>
                    </div>
                    {TRANSACTIONS.map((t, i) => (
                        <TransactionItem key={i} kind={t.kind} title={t.title} subtitle={t.subtitle} timestamp={t.timestamp} amount={t.amount} balanceAfter={t.balance} />
                    ))}
                </div>
            </div>
        </div>
    );
}
