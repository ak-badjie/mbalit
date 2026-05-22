'use client';

import React from 'react';
import { Bell, Settings, Calendar, MapPin, Clock, Package } from 'lucide-react';

const BOOKINGS = [
    {
        id: 'BKD-2024-00124',
        customer: 'Aminata Sow',
        location: 'Brusubi, Banjul',
        eta: '15 min',
        items: '2 bags',
        amount: 'D150.00',
        status: 'In Progress',
    },
    {
        id: 'BKD-2024-00120',
        customer: 'Lamin Ceesay',
        location: 'Kotu, Serrekunda',
        eta: '32 min',
        items: '4 bags',
        amount: 'D120.00',
        status: 'Assigned',
    },
    {
        id: 'BKD-2024-00118',
        customer: 'Fatou Touray',
        location: 'Bakau Newtown',
        eta: '1 h',
        items: '3 bags',
        amount: 'D135.00',
        status: 'Assigned',
    },
];

export default function BookingsPage() {
    return (
        <div className="min-h-full bg-white">
            <div className="px-5 pt-12 pb-2 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Bookings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your assigned pickups</p>
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

            <div className="px-5 mt-4 mb-6 space-y-3">
                {BOOKINGS.map((b) => (
                    <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-400 tracking-wide">#{b.id}</span>
                            <span className={`mb-badge ${b.status === 'In Progress' ? 'mb-badge-required' : 'mb-badge-optional'}`}>
                                {b.status}
                            </span>
                        </div>
                        <h3 className="font-bold text-[#0F1A14] text-base">{b.customer}</h3>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-[#0E7A3B]" />
                                <span className="text-xs text-gray-500 truncate">{b.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#0E7A3B]" />
                                <span className="text-xs text-gray-500">{b.eta}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-[#0E7A3B]" />
                                <span className="text-xs text-gray-500">{b.items}</span>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500">Payout</p>
                                <p className="font-bold text-[#0F1A14]">{b.amount}</p>
                            </div>
                            <button className="px-4 py-2 rounded-xl bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-semibold text-sm">
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
