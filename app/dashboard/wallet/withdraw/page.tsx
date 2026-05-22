'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Check } from 'lucide-react';
import { MbButton } from '@/components/ui/mb-button';

const ACCOUNTS = [
    { id: 'access', name: 'Access Bank', sub: '•••• 1234', primary: true },
    { id: 'gtb', name: 'GTBank', sub: '•••• 5678' },
];

export default function WithdrawPage() {
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState('access');

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
                        <p className="font-extrabold text-xl text-[#0E7A3B]">D4,560.00</p>
                    </div>
                    <button
                        onClick={() => setAmount('4,560.00')}
                        className="text-sm font-bold text-[#0E7A3B] hover:underline"
                    >
                        Withdraw All
                    </button>
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
            </div>

            <div className="px-5 mt-5">
                <label className="text-sm font-bold text-[#0F1A14] mb-2 block">Destination Account</label>
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
                                <div className="w-11 h-11 rounded-xl bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B]">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-[#0F1A14] text-sm">{acc.name}</p>
                                        {acc.primary && (
                                            <span className="mb-badge mb-badge-required">Primary</span>
                                        )}
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
                <MbButton size="lg" disabled={!amount}>
                    Request Withdrawal
                </MbButton>
            </div>
        </div>
    );
}
