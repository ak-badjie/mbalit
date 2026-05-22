'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useRequireAuth } from '@/lib/auth-context';
import { LoadingScreen } from '@/components/ui/truck-logo';
import { Home, Users, BarChart3, Wallet, Settings as SettingsIcon } from 'lucide-react';

const ORG_NAV = [
    { icon: Home, label: 'Home', href: '/organization/dashboard' },
    { icon: Users, label: 'Team', href: '/organization/team' },
    { icon: BarChart3, label: 'Reports', href: '/organization/reports' },
    { icon: Wallet, label: 'Wallet', href: '/organization/wallet' },
    { icon: SettingsIcon, label: 'Settings', href: '/organization/settings' },
];

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, isLoading, isAuthenticated } = useRequireAuth();

    if (isLoading) return <LoadingScreen duration={1500} onComplete={() => { }} />;
    if (!isAuthenticated) return null;
    if (user?.role !== 'collector') {
        if (typeof window !== 'undefined') window.location.href = '/dashboard';
        return null;
    }

    return (
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-white">
            <main className="flex-1 overflow-y-auto pb-24">{children}</main>

            <nav className="fixed bottom-0 left-0 right-0 z-50">
                <div className="bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-6px_24px_rgba(15,26,20,0.06)]">
                    <div className="flex items-center justify-around py-2 px-2 safe-area-pb">
                        {ORG_NAV.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                            const Icon = item.icon;
                            return (
                                <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center py-1.5 relative">
                                    <motion.div
                                        whileTap={{ scale: 0.92 }}
                                        className={`flex flex-col items-center gap-1 ${isActive ? 'text-[#0E7A3B]' : 'text-gray-400'}`}
                                    >
                                        <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-[#E8F6EE]' : ''}`}>
                                            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                                        </div>
                                        <span className={`text-[10px] font-semibold ${isActive ? 'text-[#0E7A3B]' : 'text-gray-500'}`}>
                                            {item.label}
                                        </span>
                                    </motion.div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </div>
    );
}
