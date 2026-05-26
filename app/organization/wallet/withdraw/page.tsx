'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowDownToLine, Loader2, CheckCircle, AlertCircle, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getOrganizationByOwner, withdrawFromOrgWallet } from '@/lib/firestore';
import { formatPrice } from '@/lib/waste-config';

const ACCOUNTS = [
    { id: 'wave', name: 'Wave Mobile Money', sub: 'Instant Transfer', logo: 'https://www.wave.com/img/nav-logo.png' },
    { id: 'afrimoney', name: 'Afrimoney', sub: 'Instant Transfer', logo: 'https://slcb.com/admin/gallery/751_20230511.jpg' },
    { id: 'aps', name: 'APS Wallet', sub: 'Instant Transfer', logo: 'https://apsinternational.com/wp-content/uploads/2022/05/APS-logo.svg' },
    { id: 'qmoney', name: 'QMoney', sub: 'Instant Transfer', logo: 'https://qmoney.gm/wp-content/uploads/2022/12/QMoney-logo-landscape-1.svg' },
];

export default function WithdrawPage() {
    const router = useRouter();
    const { user } = useAuth();
    
    const [org, setOrg] = useState<any>(null);
    const [balance, setBalance] = useState(0);
    const [escrowBalance, setEscrowBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [accountId, setAccountId] = useState('wave');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const quickAmounts = [100, 500, 1000, 5000];

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const orgData = (await getOrganizationByOwner(user.id)) as { id: string; orgCode?: string; walletBalance?: number; escrowBalance?: number } | null;
                if (cancelled || !orgData) return;
                setOrg(orgData);
                setBalance(orgData.walletBalance || 0);
                setEscrowBalance(orgData.escrowBalance || 0);
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 50) {
            setError('Minimum withdrawal amount is 50 GMD');
            return;
        }
        if (numAmount > balance) {
            setError('Insufficient funds');
            return;
        }
        if (!phone || phone.length < 7) {
            setError('Please enter a valid phone number');
            return;
        }
        if (!org?.id) return;

        setIsWithdrawing(true);
        try {
            const result = await withdrawFromOrgWallet(org.id, numAmount, accountId, phone);
            if (result.success) {
                setBalance(prev => prev - numAmount);
                setSuccess(true);
                setTimeout(() => {
                    router.push('/organization/wallet');
                }, 3000);
            } else {
                setError(result.error || 'Withdrawal failed');
            }
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsWithdrawing(false);
        }
    };

    const parsedAmount = parseFloat(amount) || 0;

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#0E7A3B]" />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-white relative">
            <div className="px-5 pt-12 pb-2 flex items-center gap-3">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <h1 className="text-2xl font-extrabold text-[#0F1A14]">Withdraw Funds</h1>
            </div>

            <div className="px-5 mt-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl p-5 shadow-xl shadow-amber-500/20"
                    style={{
                        backgroundColor: '#F59E0B',
                        backgroundImage: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #EA580C 100%)'
                    }}
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <WalletIcon className="w-5 h-5 text-white" />
                            <span className="text-amber-100 text-sm font-medium">Available Balance</span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-4">
                            {formatPrice(balance)}
                        </p>
                        <div>
                            <p className="text-white/60 text-xs">Escrow Balance</p>
                            <p className="text-lg font-bold text-white">{formatPrice(escrowBalance)}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="px-5 mt-8">
                <form onSubmit={handleWithdraw} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-[#0F1A14] mb-2">
                            Amount to Withdraw
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">D</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-[#0E7A3B] outline-none text-[#0F1A14] font-bold text-lg transition-colors"
                            />
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 mt-3">
                            {quickAmounts.map(val => (
                                <motion.button
                                    key={val}
                                    type="button"
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setAmount(val.toString())}
                                    className="rounded-xl bg-[#F1FAF4] text-[#0E7A3B] font-bold py-2.5 text-sm hover:bg-[#E8F6EE] transition-colors"
                                >
                                    +{val}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[#0F1A14] mb-2">
                            Destination Account/Number
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="3000000"
                            className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-[#0E7A3B] outline-none text-[#0F1A14] font-bold text-lg transition-colors mb-5"
                        />
                        
                        <label className="block text-sm font-bold text-[#0F1A14] mb-2">
                            Withdrawal Method
                        </label>
                        <div className="space-y-2">
                            {ACCOUNTS.map((acc) => {
                                const active = accountId === acc.id;
                                return (
                                    <button
                                        key={acc.id}
                                        type="button"
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
                                                <CheckCircle className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Withdrawal Amount</span>
                            <span className="font-bold text-[#0F1A14]">{formatPrice(parsedAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Fee</span>
                            <span className="font-bold text-[#0E7A3B]">Free</span>
                        </div>
                        <div className="pt-2 border-t border-gray-200 flex justify-between">
                            <span className="font-bold text-[#0F1A14]">You will receive</span>
                            <span className="font-bold text-[#0F1A14] text-lg">{formatPrice(parsedAmount)}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isWithdrawing || !amount || !phone || parsedAmount < 50 || parsedAmount > balance}
                        className="w-full py-4 rounded-2xl bg-[#0E7A3B] text-white font-bold text-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {isWithdrawing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <ArrowDownToLine className="w-5 h-5" />
                                Withdraw Funds
                            </>
                        )}
                    </button>
                </form>
            </div>

            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 bg-[#0E7A3B] flex flex-col items-center justify-center p-6 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                            className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6"
                        >
                            <CheckCircle className="w-12 h-12 text-[#0E7A3B]" />
                        </motion.div>
                        <h2 className="text-3xl font-extrabold text-white mb-2">Withdrawal Successful!</h2>
                        <p className="text-white/80 font-medium">
                            {formatPrice(parsedAmount)} is on its way to your Wave account.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
