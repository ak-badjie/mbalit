'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Bell, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
    icon: React.ElementType | 'profile';
    label: string;
    href: string;
}

const NAV_ITEMS: NavItem[] = [
    { icon: Home, label: 'Home', href: '/collector/dashboard' },
    { icon: Bell, label: 'Alerts', href: '/collector/notifications' },
    { icon: Settings, label: 'Settings', href: '/collector/settings' },
    { icon: 'profile', label: 'Profile', href: '/collector/profile' },
];

export const CollectorBottomNav: React.FC = () => {
    const pathname = usePathname();
    const { user } = useAuth();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            {/* Frosted glass background */}
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-around py-2 px-2 safe-area-pb">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href === '/collector/dashboard' && pathname === '/collector/dashboard');
                        const isProfile = item.icon === 'profile';
                        const Icon = isProfile ? null : item.icon as React.ElementType;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex-1 flex flex-col items-center py-1.5 relative"
                            >
                                <motion.div
                                    whileTap={{ scale: 0.9 }}
                                    className={`flex flex-col items-center gap-0.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTabCollector"
                                            className="absolute -top-2 w-10 h-1 bg-emerald-500 rounded-full"
                                            initial={false}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    )}

                                    {isProfile ? (
                                        // Profile picture or initials
                                        <div className={`w-8 h-8 rounded-full overflow-hidden transition-all ${isActive
                                                ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
                                                : ''
                                            }`}>
                                            {user?.profileImage ? (
                                                <img
                                                    src={user.profileImage}
                                                    alt={user.name || 'Profile'}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold">
                                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={`p-1.5 rounded-xl transition-all ${isActive
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                                : ''
                                            }`}>
                                            {Icon && <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />}
                                        </div>
                                    )}
                                    <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
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

export default CollectorBottomNav;
