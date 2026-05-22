'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Filter } from 'lucide-react';
import { TransactionItem } from '@/components/ui/transaction-item';

const ALL_TRANSACTIONS: Array<{
    kind: 'credit' | 'debit' | 'refund';
    title: string;
    subtitle: string;
    timestamp: string;
    amount: string;
    balance?: string;
}> = [
    { kind: 'credit', title: 'Money Added', subtitle: 'From: Access Bank •••• 1234', timestamp: 'May 22, 2024 · 10:30 AM', amount: 'D2,000.00', balance: 'D4,560.00' },
    { kind: 'debit', title: 'Payment to GreenCity', subtitle: 'Booking #BKD-2024-00124', timestamp: 'May 22, 2024 · 11:15 AM', amount: 'D150.00', balance: 'D2,560.00' },
    { kind: 'credit', title: 'Money Added', subtitle: 'From: Cash Deposit', timestamp: 'May 20, 2024 · 09:45 AM', amount: 'D1,500.00', balance: 'D2,710.00' },
    { kind: 'debit', title: 'Payment to GreenCity', subtitle: 'Booking #BKD-2024-00120', timestamp: 'May 20, 2024 · 02:20 PM', amount: 'D120.00', balance: 'D1,210.00' },
    { kind: 'refund', title: 'Refund Received', subtitle: 'Booking #BKD-2024-00110', timestamp: 'May 18, 2024 · 04:10 PM', amount: 'D100.00', balance: 'D1,330.00' },
    { kind: 'debit', title: 'Payment to CleanCity', subtitle: 'Booking #BKD-2024-00098', timestamp: 'May 15, 2024 · 03:45 PM', amount: 'D210.00', balance: 'D1,230.00' },
];

const FILTERS = ['All', 'Money In', 'Money Out', 'Refunds'];

export default function HistoryPage() {
    const router = useRouter();
    const [filter, setFilter] = useState('All');

    return (
        <div className="min-h-full bg-white">
            <div className="flex items-center px-5 pt-12 pb-2">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full hover:bg-gray-50 text-[#0E7A3B]"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="ml-2 text-xl font-extrabold text-[#0F1A14]">Transaction History</h1>
            </div>

            <div className="px-5 mt-4 flex gap-2 overflow-x-auto no-scrollbar">
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold text-sm transition-colors
                            ${filter === f
                                ? 'bg-[#0E7A3B] text-white'
                                : 'bg-[#E8F6EE] text-[#0E7A3B] hover:bg-[#D2F4E1]'}`}
                    >
                        {f}
                    </button>
                ))}
                <button className="flex-shrink-0 ml-auto w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                    <Filter className="w-4 h-4 text-gray-600" />
                </button>
            </div>

            <div className="px-5 mt-4 mb-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    {ALL_TRANSACTIONS.map((t, i) => (
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
    );
}
