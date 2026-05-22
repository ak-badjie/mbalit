'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Building2, Smartphone, Check } from 'lucide-react';
import { MbButton } from '@/components/ui/mb-button';

const METHODS = [
    { id: 'bank', icon: Building2, label: 'Bank Transfer', sub: 'Direct from your bank account' },
    { id: 'card', icon: CreditCard, label: 'Debit / Credit Card', sub: 'Visa, Mastercard accepted' },
    { id: 'mobile', icon: Smartphone, label: 'Mobile Money', sub: 'Wave, Orange Money, QMoney' },
];

const PRESETS = ['500', '1,000', '2,000', '5,000', '10,000'];

export default function AddMoneyPage() {
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<string>('bank');

    return (
        <div className="min-h-full bg-white">
            <div className="flex items-center px-5 pt-12 pb-2">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full hover:bg-gray-50 text-[#0E7A3B]"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="ml-2 text-xl font-extrabold text-[#0F1A14]">Add Money</h1>
            </div>

            <div className="px-5 mt-4">
                <label className="text-sm font-bold text-[#0F1A14] mb-2 block">Amount (GMD)</label>
                <div className="flex items-center gap-3 px-4 py-4 rounded-2xl border-2 border-[#0E7A3B] bg-[#F1FAF4]">
                    <span className="text-2xl font-extrabold text-[#0E7A3B]">D</span>
                    <input
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ''))}
                        placeholder="0.00"
                        className="flex-1 bg-transparent outline-none text-2xl font-extrabold text-[#0F1A14] placeholder-gray-300"
                    />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                    {PRESETS.map((p) => (
                        <button
                            key={p}
                            onClick={() => setAmount(p)}
                            className="px-3 py-1.5 rounded-full bg-[#E8F6EE] text-[#0E7A3B] text-sm font-semibold hover:bg-[#D2F4E1]"
                        >
                            D{p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-5 mt-5">
                <label className="text-sm font-bold text-[#0F1A14] mb-2 block">Payment Method</label>
                <div className="space-y-2">
                    {METHODS.map((m) => {
                        const Icon = m.icon;
                        const active = method === m.id;
                        return (
                            <button
                                key={m.id}
                                onClick={() => setMethod(m.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all
                                    ${active ? 'border-[#0E7A3B] bg-[#ECFDF3]' : 'border-gray-100 hover:border-[#A8E7C3]'}`}
                            >
                                <div className="w-11 h-11 rounded-xl bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B]">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-[#0F1A14] text-sm">{m.label}</p>
                                    <p className="text-xs text-gray-500">{m.sub}</p>
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
                    Continue
                </MbButton>
            </div>
        </div>
    );
}
