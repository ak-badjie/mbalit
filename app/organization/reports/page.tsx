'use client';

import React from 'react';
import { Bell, Download, TrendingUp, Package, Users, MapPin } from 'lucide-react';

const STATS = [
    { icon: TrendingUp, label: 'Revenue', value: 'D32,450', delta: '+18%' },
    { icon: Package, label: 'Pickups', value: '512', delta: '+12%' },
    { icon: Users, label: 'Customers', value: '218', delta: '+8%' },
    { icon: MapPin, label: 'Coverage', value: '14 areas', delta: '+2' },
];

export default function ReportsPage() {
    return (
        <div className="min-h-full bg-white">
            <div className="px-5 pt-12 pb-2 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Reports</h1>
                    <p className="text-sm text-gray-500 mt-1">Last 30 days overview</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-gray-700" />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-[#0E7A3B] flex items-center justify-center text-white">
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="px-5 mt-4 grid grid-cols-2 gap-3">
                {STATS.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4">
                            <div className="w-10 h-10 rounded-xl bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-3">
                                <Icon className="w-5 h-5" />
                            </div>
                            <p className="text-xs text-gray-500">{s.label}</p>
                            <p className="text-xl font-extrabold text-[#0F1A14]">{s.value}</p>
                            <p className="text-[11px] text-[#0E7A3B] font-semibold mt-1">{s.delta}</p>
                        </div>
                    );
                })}
            </div>

            <div className="px-5 mt-5">
                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <h2 className="font-bold text-[#0F1A14] text-base mb-3">Monthly Performance</h2>
                    <div className="flex items-end gap-2 h-32 mt-2">
                        {[40, 55, 35, 70, 60, 85, 50, 75, 65, 90, 80, 95].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className="w-full rounded-t-md bg-gradient-to-t from-[#0E7A3B] to-[#1FA653]"
                                    style={{ height: `${h}%` }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-semibold">
                        {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m) => (
                            <span key={m}>{m}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="px-5 mt-5 mb-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <h2 className="font-bold text-[#0F1A14] text-base mb-3">Top Areas</h2>
                    <div className="space-y-3">
                        {[
                            { area: 'Banjul', pickups: 142, share: 90 },
                            { area: 'Serrekunda', pickups: 118, share: 75 },
                            { area: 'Bakau', pickups: 86, share: 55 },
                            { area: 'Brusubi', pickups: 62, share: 40 },
                        ].map((row) => (
                            <div key={row.area}>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-[#0F1A14]">{row.area}</span>
                                    <span className="text-gray-500">{row.pickups} pickups</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 mt-1.5 overflow-hidden">
                                    <div className="h-full rounded-full bg-[#0E7A3B]" style={{ width: `${row.share}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
