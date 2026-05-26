'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Clock, Shield, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PendingApprovalPage() {
    const { logout, user } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/auth');
    };

    return (
        <div className="min-h-[100dvh] bg-gradient-to-br from-[#F1FAF4] via-white to-[#ECFDF3] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-[#E8F6EE] flex items-center justify-center mb-6 shadow-sm border-4 border-white">
                <Clock className="w-10 h-10 text-[#0E7A3B] animate-pulse" />
            </div>

            <h1 className="text-3xl font-extrabold text-[#0F1A14] mb-3">Awaiting Approval</h1>
            <p className="text-gray-600 mb-8 max-w-sm">
                Your account is currently pending approval by the organization. You will gain access to the driver dashboard once the organization manager approves your profile.
            </p>

            <div className="bg-white border border-[#D2F4E1] p-5 rounded-2xl max-w-sm w-full mb-8 shadow-sm">
                <div className="flex items-start gap-3 text-left">
                    <Shield className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <div>
                        <h3 className="font-bold text-[#0F1A14]">Security Check</h3>
                        <p className="text-xs text-gray-500 mt-1">Contact your organization manager to expedite the approval process.</p>
                    </div>
                </div>
            </div>

            <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 rounded-full border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
            >
                <LogOut className="w-4 h-4" />
                Sign Out
            </button>
        </div>
    );
}
