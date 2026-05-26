'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getOrganizationByOwner, getWalletTransactions } from '@/lib/firestore';
import { TransactionItem, TransactionKind } from '@/components/ui/transaction-item';

export default function WalletHistoryPage() {
    const router = useRouter();
    const { user } = useAuth();
    
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const org = (await getOrganizationByOwner(user.id)) as { id: string; orgCode?: string } | null;
                const walletId = org?.orgCode || user.id;
                
                const txns = await getWalletTransactions(walletId, 50);
                if (cancelled) return;
                setTransactions(txns);
            } catch (err) {
                console.error('Wallet history load failed:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    return (
        <div className="min-h-[100dvh] bg-white pb-24">
            <div className="px-5 pt-12 pb-4 flex items-center gap-3 sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-gray-100">
                <button 
                    onClick={() => router.back()} 
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div>
                    <h1 className="text-2xl font-extrabold text-[#0F1A14]">Transaction History</h1>
                    <p className="text-sm text-gray-500">All wallet activity</p>
                </div>
            </div>

            <div className="px-5 mt-6">
                {isLoading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#0E7A3B]" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="py-20 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-4">
                            <RefreshCw className="w-7 h-7" />
                        </div>
                        <h3 className="font-bold text-[#0F1A14]">No transactions yet</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-[20rem]">
                            Your wallet activity will appear here once you start receiving payments or making withdrawals.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {transactions.map((tx) => (
                            <TransactionItem
                                key={tx.id}
                                title={tx.title}
                                amount={tx.amount}
                                date={tx.date}
                                type={tx.type as 'credit' | 'debit'}
                                kind={tx.kind as TransactionKind}
                                status={tx.status}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
