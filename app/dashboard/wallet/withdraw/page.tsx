'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { MbButton } from '@/components/ui/mb-button';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { getWalletBalance } from '@/lib/firestore';

const ACCOUNTS = [
    { id: 'wave', name: 'Wave Mobile Money', sub: 'Instant Transfer', logo: 'https://www.wave.com/img/nav-logo.png' },
    { id: 'afrimoney', name: 'Afrimoney', sub: 'Instant Transfer', logo: 'https://slcb.com/admin/gallery/751_20230511.jpg' },
    { id: 'aps', name: 'APS Wallet', sub: 'Instant Transfer', logo: 'https://apsinternational.com/wp-content/uploads/2022/05/APS-logo.svg' },
    { id: 'qmoney', name: 'QMoney', sub: 'Instant Transfer', logo: 'https://qmoney.gm/wp-content/uploads/2022/12/QMoney-logo-landscape-1.svg' },
];

export default function WithdrawPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState('wave');
    const [destination, setDestination] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        const load = async () => {
            try {
                const balance = await getWalletBalance(user.id);
                setWalletBalance(balance);
            } catch (err) {
                console.error('Failed to load balance:', err);
                setWalletBalance(0);
            } finally {
                setIsLoadingBalance(false);
            }
        };
        load();
    }, [user?.id]);

    const formattedBalance = walletBalance !== null
        ? walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '---';

    const handleWithdraw = async () => {
        const numAmount = Number(amount.replace(/,/g, ''));
        if (!amount || isNaN(numAmount) || numAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (numAmount < 50) {
            alert('Minimum withdrawal is D50.00');
            return;
        }
        if (walletBalance !== null && numAmount > walletBalance) {
            alert('Insufficient balance');
            return;
        }
        if (!destination) {
            alert('Please enter a destination account number');
            return;
        }

        setIsSubmitting(true);
        try {
            const functions = getFunctions(app);
            const requestWithdrawal = httpsCallable(functions, 'requestWithdrawal');
            
            const response = await requestWithdrawal({
                amount: numAmount,
                network: accountId,
                account_number: destination,
                beneficiary_name: user?.name || 'Mbalit User',
                userId: user.id
            });

            const data = response.data as any;
            if (data?.success) {
                alert('Withdrawal request submitted successfully!');
                router.back();
            } else {
                alert(data?.message || 'Withdrawal failed');
            }
        } catch (error: any) {
            console.error(error);
            const msg = error?.message || 'An error occurred during withdrawal';
            // Parse Firebase callable error messages
            if (msg.includes('Insufficient balance')) {
                alert('Insufficient wallet balance.');
            } else if (msg.includes('Wallet not found')) {
                alert('Your wallet has not been set up yet. Please contact support.');
            } else {
                alert(msg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-full bg-white">
            <div className="flex items-center px-5 pt-12 pb-2">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full hover:bg-gray-50 text-[#0E7A3B]"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="ml-2 text-xl font-extrabold text-[#0F1A14]">Withdraw</h1>
            </div>

            <div className="px-5 mt-4">
                <div className="p-4 rounded-2xl bg-[#F1FAF4] border border-[#D2F4E1] flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500">Available Balance</p>
                        {isLoadingBalance ? (
                            <Loader2 className="w-5 h-5 animate-spin text-[#0E7A3B] mt-1" />
                        ) : (
                            <p className="font-extrabold text-xl text-[#0E7A3B]">D{formattedBalance}</p>
                        )}
                    </div>
                    {walletBalance !== null && walletBalance > 0 && (
                        <button
                            onClick={() => setAmount(walletBalance.toFixed(2))}
                            className="text-sm font-bold text-[#0E7A3B] hover:underline"
                        >
                            Withdraw All
                        </button>
                    )}
                </div>
            </div>

            <div className="px-5 mt-5">
                <label className="text-sm font-bold text-[#0F1A14] mb-2 block">Amount</label>
                <div className="flex items-center gap-3 px-4 py-4 rounded-2xl border-2 border-[#0E7A3B] bg-[#F1FAF4]">
                    <span className="text-2xl font-extrabold text-[#0E7A3B]">D</span>
                    <input
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                        placeholder="0.00"
                        className="flex-1 bg-transparent outline-none text-2xl font-extrabold text-[#0F1A14] placeholder-gray-300"
                    />
                </div>
                <p className="text-xs text-gray-400 mt-1">Minimum withdrawal: D50.00</p>
            </div>

            <div className="px-5 mt-5">
                <label className="text-sm font-bold text-[#0F1A14] mb-2 block">Destination Account/Number</label>
                <div className="flex items-center gap-3 px-4 py-4 rounded-2xl border-2 border-gray-100 bg-white mb-5 focus-within:border-[#0E7A3B]">
                    <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Enter phone or account number"
                        className="flex-1 bg-transparent outline-none text-base font-bold text-[#0F1A14] placeholder-gray-400"
                    />
                </div>

                <label className="text-sm font-bold text-[#0F1A14] mb-2 block">Withdrawal Method</label>
                <div className="space-y-2">
                    {ACCOUNTS.map((acc) => {
                        const active = accountId === acc.id;
                        return (
                            <button
                                key={acc.id}
                                onClick={() => setAccountId(acc.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all
                                    ${active ? 'border-[#0E7A3B] bg-[#ECFDF3]' : 'border-gray-100 hover:border-[#A8E7C3]'}`}
                            >
                                <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
                                    <img src={acc.logo} alt={acc.name} className="w-full h-full object-contain p-1" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-[#0F1A14] text-sm">{acc.name}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{acc.sub}</p>
                                </div>
                                {active && (
                                    <div className="w-6 h-6 rounded-full bg-[#0E7A3B] flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="px-5 mt-6 mb-6">
                <MbButton size="lg" disabled={!amount || !destination || isSubmitting || isLoadingBalance} onClick={handleWithdraw}>
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Request Withdrawal'}
                </MbButton>
            </div>
        </div>
    );
}
