'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Package, Clock, User } from 'lucide-react';

interface NavItem {
    icon: React.ElementType;
    label: string;
    href: string;
}

const NAV_ITEMS: NavItem[] = [
    { icon: Home, label: 'Home', href: '/dashboard' },
    { icon: Package, label: 'Book', href: '/dashboard?action=book' },
    { icon: Clock, label: 'Orders', href: '/dashboard/orders' },
    { icon: User, label: 'Profile', href: '/dashboard/profile' },
];

export const BottomNav: React.FC = () => {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            {/* Frosted glass background */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-around py-2 px-4 safe-area-pb">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href === '/dashboard' && pathname === '/dashboard') ||
                            (item.href.includes('action=book') && pathname.includes('action=book'));
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex-1 flex flex-col items-center py-2 relative"
                            >
                                <motion.div
                                    whileTap={{ scale: 0.9 }}
                                    className={`flex flex-col items-center gap-1 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute -top-2 w-12 h-1 bg-emerald-500 rounded-full"
                                            initial={false}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    )}

                                    <div className={`p-2 rounded-xl transition-all ${isActive
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                            : ''
                                        }`}>
                                        <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                                    </div>
                                    <span className={`text-xs font-medium ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
                                        }`}>
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

export default BottomNav;
