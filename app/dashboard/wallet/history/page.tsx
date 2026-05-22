'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Filter, Loader2, Wallet as WalletIcon } from 'lucide-react';
import { TransactionItem, TransactionKind } from '@/components/ui/transaction-item';
import { useAuth } from '@/lib/auth-context';
import { getWalletTransactions } from '@/lib/firestore';

const FILTERS = ['All', 'Money In', 'Money Out', 'Refunds'] as const;
type Filter = typeof FILTERS[number];

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

export default function HistoryPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [filter, setFilter] = useState<Filter>('All');
    const [transactions, setTransactions] = useState<TxnDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const txns = await getWalletTransactions(user.id, 100);
                if (!cancelled) setTransactions(txns as TxnDoc[]);
            } catch (err) {
                console.error('Transaction history load failed:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    const filtered = useMemo(() => {
        if (filter === 'All') return transactions;
        if (filter === 'Money In') return transactions.filter((t) => classify(t) === 'credit');
        if (filter === 'Money Out') return transactions.filter((t) => classify(t) === 'debit');
        return transactions.filter((t) => classify(t) === 'refund');
    }, [filter, transactions]);

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
                    {isLoading ? (
                        <div className="py-10 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-[#0E7A3B]" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-3">
                                <WalletIcon className="w-6 h-6" />
                            </div>
                            <p className="font-bold text-[#0F1A14] text-sm">No transactions</p>
                            <p className="text-xs text-gray-500 mt-1 max-w-[18rem]">
                                {filter === 'All'
                                    ? 'Your wallet activity will show up here.'
                                    : `Nothing matches “${filter}” yet.`}
                            </p>
                        </div>
                    ) : (
                        filtered.map((t) => (
                            <TransactionItem
                                key={t.id}
                                kind={classify(t)}
                                title={t.title || (t.direction === 'debit' ? 'Payment' : 'Money Added')}
                                subtitle={t.description || t.source || (t.bookingId ? `Booking #${t.bookingId}` : '')}
                                timestamp={timestamp(t.createdAt)}
                                amount={formatGmd(t.amount)}
                                balanceAfter={typeof t.balanceAfter === 'number' ? formatGmd(t.balanceAfter) : undefined}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
