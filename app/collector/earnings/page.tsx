'use client';

import React from 'react';
import { Bell, Settings, TrendingUp, Calendar, Package } from 'lucide-react';

export default function CollectorEarningsPage() {
    return (
        <div className="min-h-full bg-white">
            <div className="px-5 pt-12 pb-2 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Earnings</h1>
                    <p className="text-sm text-gray-500 mt-1">Track your collection income</p>
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
                        <p className="text-sm text-white/90">This Month</p>
                        <p className="text-[34px] font-extrabold leading-none mt-1">D8,240.00</p>
                        <p className="mt-2 text-xs text-white/80">+18% vs last month</p>
                    </div>
                </div>
            </div>

            <div className="px-5 mt-4 grid grid-cols-3 gap-3">
                {[
                    { label: 'This Week', value: 'D3,450.00', icon: TrendingUp },
                    { label: 'Pickups', value: '42', icon: Package },
                    { label: 'Avg / Pickup', value: 'D196', icon: Calendar },
                ].map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-3">
                            <div className="w-9 h-9 rounded-xl bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-2">
                                <Icon className="w-4 h-4" />
                            </div>
                            <p className="text-[11px] text-gray-500">{s.label}</p>
                            <p className="font-bold text-[#0F1A14] text-base leading-tight">{s.value}</p>
                        </div>
                    );
                })}
            </div>

            <div className="px-5 mt-5">
                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <h2 className="font-bold text-[#0F1A14] text-base mb-3">Weekly breakdown</h2>
                    <div className="space-y-3">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                            const heights = [60, 75, 40, 90, 55, 30, 70];
                            const earned = ['540', '650', '320', '780', '470', '260', '600'][i];
                            return (
                                <div key={day} className="flex items-center gap-3">
                                    <span className="w-8 text-xs font-semibold text-gray-500">{day}</span>
                                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-[#0E7A3B]"
                                            style={{ width: `${heights[i]}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-semibold text-[#0F1A14] w-14 text-right">D{earned}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
