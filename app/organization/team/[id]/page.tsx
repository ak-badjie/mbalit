'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, UserMinus, ShieldAlert, Star, TrendingUp, Package, Phone, Mail, Truck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getOrganizationByOwner, getCollectorProfile, getCollectorStats, removeMember } from '@/lib/firestore';

export default function TeamMemberPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { user } = useAuth();
    const memberId = params.id;
    
    const [org, setOrg] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        if (!user?.id || !memberId) return;
        let cancelled = false;
        (async () => {
            try {
                const orgData = await getOrganizationByOwner(user.id);
                if (cancelled) return;
                if (!orgData?.orgCode) return;
                setOrg(orgData);

                const [p, s] = await Promise.all([
                    getCollectorProfile(memberId),
                    getCollectorStats(memberId)
                ]);
                
                if (cancelled) return;
                setProfile(p);
                setStats(s);
            } catch (err) {
                console.error('Failed to load member:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id, memberId]);

    const handleRemove = async () => {
        if (!org?.orgCode || !confirm("Are you sure you want to remove this driver from your team? They will lose access to your organization's bookings.")) return;
        
        setIsRemoving(true);
        try {
            await removeMember(org.orgCode, memberId);
            router.push('/organization/team');
        } catch (err) {
            console.error('Failed to remove member:', err);
            setIsRemoving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#0E7A3B]" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-[100dvh] bg-white pt-12 px-5 text-center">
                <h1 className="text-2xl font-bold text-[#0F1A14]">Driver not found</h1>
                <button onClick={() => router.back()} className="mt-4 text-[#0E7A3B] font-bold">Go Back</button>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-white pb-24">
            <div className="px-5 pt-12 pb-2 flex items-center gap-3">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <h1 className="text-2xl font-extrabold text-[#0F1A14]">Driver Profile</h1>
            </div>

            <div className="px-5 mt-6">
                <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1FA653] to-[#0E7A3B] flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-green-900/10 mb-4 overflow-hidden border-4 border-white">
                        {profile.profileImage ? (
                            <img src={profile.profileImage as string} alt="" className="w-full h-full object-cover" />
                        ) : (
                            (profile.displayName || '?').charAt(0).toUpperCase()
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-[#0F1A14]">{profile.displayName || 'Unnamed Driver'}</h2>
                    <p className="text-gray-500 font-medium text-sm mt-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Active Member
                    </p>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                    <div className="bg-[#F1FAF4] rounded-2xl p-4 border border-[#D2F4E1]">
                        <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 text-[#0E7A3B]" />
                            <span className="text-xs font-bold text-[#0E7A3B] uppercase tracking-wide">Rating</span>
                        </div>
                        <p className="text-2xl font-black text-[#0F1A14]">{stats?.rating?.toFixed(1) || '0.0'}</p>
                    </div>
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Pickups</span>
                        </div>
                        <p className="text-2xl font-black text-[#0F1A14]">{stats?.totalPickups || 0}</p>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <h3 className="font-bold text-[#0F1A14] text-lg">Contact Information</h3>
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                                <p className="font-bold text-[#0F1A14]">{profile.phone || 'N/A'}</p>
                            </div>
                        </div>
                        {profile.email && (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Email Address</p>
                                    <p className="font-bold text-[#0F1A14]">{profile.email}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                                <Truck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Vehicle Type</p>
                                <p className="font-bold text-[#0F1A14] capitalize">{profile.vehicleType?.replace('_', ' ') || 'Unknown'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 space-y-3">
                    <h3 className="font-bold text-[#0F1A14] text-lg">Management</h3>
                    <button
                        onClick={handleRemove}
                        disabled={isRemoving}
                        className="w-full flex items-center justify-between p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                        <div className="flex items-center gap-3">
                            {isRemoving ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserMinus className="w-5 h-5" />}
                            Remove from Team
                        </div>
                    </button>
                    <button
                        className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="w-5 h-5" />
                            Block Driver
                        </div>
                        <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 uppercase tracking-wider">Coming Soon</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
