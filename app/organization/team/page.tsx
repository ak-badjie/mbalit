'use client';

import React from 'react';
import { Bell, UserPlus, MoreVertical, Star, MapPin } from 'lucide-react';

const TEAM = [
    { id: 1, name: 'Aminata Sow', role: 'Senior Collector', rating: 4.8, pickups: 124, status: 'Active', area: 'Banjul' },
    { id: 2, name: 'Lamin Ceesay', role: 'Collector', rating: 4.6, pickups: 98, status: 'Active', area: 'Serrekunda' },
    { id: 3, name: 'Fatou Touray', role: 'Collector', rating: 4.7, pickups: 87, status: 'Off-duty', area: 'Bakau' },
    { id: 4, name: 'Ousman Jallow', role: 'Trainee', rating: 4.2, pickups: 32, status: 'Active', area: 'Brusubi' },
];

export default function TeamPage() {
    return (
        <div className="min-h-full bg-white">
            <div className="px-5 pt-12 pb-2 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Team</h1>
                    <p className="text-sm text-gray-500 mt-1">{TEAM.length} members</p>
                </div>
                <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-gray-700" />
                </button>
            </div>

            <div className="px-5 mt-4">
                <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#A8E7C3] bg-[#F1FAF4] text-[#0E7A3B] font-bold">
                    <UserPlus className="w-5 h-5" />
                    Invite Member
                </button>
            </div>

            <div className="px-5 mt-4 space-y-3 mb-6">
                {TEAM.map((m) => (
                    <div key={m.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1FA653] to-[#0E7A3B] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {m.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-[#0F1A14] text-sm">{m.name}</h3>
                                <span className={`mb-badge ${m.status === 'Active' ? 'mb-badge-required' : 'mb-badge-optional'}`}>
                                    {m.status}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">{m.role}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                    {m.rating}
                                </span>
                                <span className="text-[11px] text-gray-500">{m.pickups} pickups</span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                                    <MapPin className="w-3 h-3" />
                                    {m.area}
                                </span>
                            </div>
                        </div>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-50">
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
