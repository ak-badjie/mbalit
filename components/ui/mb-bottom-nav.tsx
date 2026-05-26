'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Calendar, BarChart3, Wallet, User, FileText, Settings, RefreshCw } from 'lucide-react';

export interface MbNavItem {
    icon: React.ElementType;
    label: string;
    href: string;
}

/**
 * Resident nav — these users PAY for pickups (they don't earn), so there's
 * no wallet or earnings tab. Settings is surfaced directly in the bar.
 */
export const RESIDENT_NAV: MbNavItem[] = [
    { icon: Home, label: 'Home', href: '/dashboard' },
    { icon: Calendar, label: 'Pickups', href: '/dashboard/orders' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
    { icon: User, label: 'Profile', href: '/dashboard/profile' },
];

/**
 * Collector nav — independent collectors / org owners. Drivers under an org
 * use COLLECTOR_DRIVER_NAV (no wallet).
 */
export const COLLECTOR_NAV: MbNavItem[] = [
    { icon: Home, label: 'Home', href: '/collector/dashboard' },
    { icon: Calendar, label: 'Pickups', href: '/collector/bookings' },
    { icon: RefreshCw, label: 'Subs', href: '/collector/subscriptions' },
    { icon: BarChart3, label: 'Earnings', href: '/collector/earnings' },
    { icon: Wallet, label: 'Wallet', href: '/collector/wallet' },
];

/**
 * Driver-under-org nav — earnings flow into the org's wallet, not the
 * driver's. So no wallet tab, no withdrawal flow. The org owner pays them
 * outside the platform.
 */
export const COLLECTOR_DRIVER_NAV: MbNavItem[] = [
    { icon: Home, label: 'Home', href: '/collector/dashboard' },
    { icon: Calendar, label: 'Pickups', href: '/collector/bookings' },
    { icon: RefreshCw, label: 'Subs', href: '/collector/subscriptions' },
    { icon: BarChart3, label: 'Earnings', href: '/collector/earnings' },
    { icon: Settings, label: 'Settings', href: '/collector/settings' },
];

interface MbBottomNavProps {
    items?: MbNavItem[];
    activeHref?: string;
}

export const MbBottomNav: React.FC<MbBottomNavProps> = ({
    items = RESIDENT_NAV,
    activeHref,
}) => {
    const pathname = usePathname();
    const currentPath = activeHref ?? pathname;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
            <div className="bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-6px_24px_rgba(15,26,20,0.06)]">
                <div className="flex items-center justify-around py-2 px-2 safe-area-pb">
                    {items.map((item) => {
                        const isActive =
                            currentPath === item.href ||
                            (item.href !== '/' && currentPath?.startsWith(item.href));
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex-1 flex flex-col items-center py-1.5 relative"
                            >
                                <motion.div
                                    whileTap={{ scale: 0.92 }}
                                    className={`flex flex-col items-center gap-1 ${
                                        isActive ? 'text-[#0E7A3B]' : 'text-gray-400'
                                    }`}
                                >
                                    <div
                                        className={`p-1.5 rounded-xl transition-colors ${
                                            isActive ? 'bg-[#E8F6EE]' : ''
                                        }`}
                                    >
                                        <Icon
                                            className="w-5 h-5"
                                            strokeWidth={isActive ? 2.5 : 2}
                                        />
                                    </div>
                                    <span
                                        className={`text-[10px] font-semibold ${
                                            isActive ? 'text-[#0E7A3B]' : 'text-gray-500'
                                        }`}
                                    >
                                        {item.label}
                                    </span>
                                </motion.div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};

export default MbBottomNav;
