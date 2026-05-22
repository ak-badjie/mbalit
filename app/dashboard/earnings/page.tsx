'use client';

import React from 'react';
import { Bell, Settings, TrendingUp, Calendar, Package } from 'lucide-react';

const STATS = [
    { label: 'This Week', value: 'D3,450.00', delta: '+12%', positive: true },
    { label: 'This Month', value: 'D12,800.00', delta: '+8%', positive: true },
    { label: 'Total Pickups', value: '42', delta: 'last 30 days', positive: null },
];

export default function EarningsPage() {
    return (
        <div className="min-h-full bg-white">
            <div className="px-5 pt-12 pb-2 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Earnings</h1>
                    <p className="text-sm text-gray-500 mt-1">Your savings and rewards summary</p>
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
                <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #0E7A3B 0%, #1FA653 100%)' }}>
                    <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
                    <div className="relative">
                        <p className="text-sm text-white/90">Total Earnings</p>
                        <p className="text-[34px] font-extrabold leading-none mt-1">D16,250.00</p>
                        <p className="mt-2 text-xs text-white/80">+18% vs last month</p>
                    </div>
                </div>
            </div>

            <div className="px-5 mt-4 grid grid-cols-3 gap-3">
                {STATS.map((s) => (
                    <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-3">
                        <p className="text-[11px] text-gray-500 mb-1">{s.label}</p>
                        <p className="font-bold text-[#0F1A14] text-base leading-tight">{s.value}</p>
                        {s.delta && (
                            <p className={`text-[10px] mt-1 ${s.positive ? 'text-[#0E7A3B]' : 'text-gray-400'}`}>
                                {s.delta}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            <div className="px-5 mt-5">
                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-[#0F1A14] text-base">Weekly breakdown</h2>
                        <button className="text-sm font-semibold text-[#0E7A3B]">View All</button>
                    </div>
                    <div className="space-y-3">
                        {[
                            { day: 'This week', amount: 'D3,450.00', icon: TrendingUp },
                            { day: 'Last week', amount: 'D2,980.00', icon: Calendar },
                            { day: 'Avg per pickup', amount: 'D305.00', icon: Package },
                        ].map((row) => {
                            const Icon = row.icon;
                            return (
                                <div key={row.day} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
                                    <div className="w-10 h-10 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B]">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm text-[#0F1A14]">{row.day}</p>
                                    </div>
                                    <p className="font-bold text-[#0F1A14]">{row.amount}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
