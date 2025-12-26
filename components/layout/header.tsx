'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogIn, LogOut, Home, HelpCircle, Truck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TruckLogo } from '@/components/ui/truck-logo';
import { HamburgerMenuOverlay } from '@/components/ui/hamburger-menu';
import { useAuth } from '@/lib/auth-context';

interface HeaderProps {
    onMenuClick?: () => void;
}

// Animated Nav Link Component
const NavLink = ({ href, icon: Icon, children, onClick }: {
    href: string;
    icon: React.ElementType;
    children: React.ReactNode;
    onClick?: () => void;
}) => (
    <Link href={href} onClick={onClick}>
        <motion.div
            className="group relative flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Animated background on hover */}
            <motion.div
                className="absolute inset-0 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                layoutId="navBackground"
            />
            <Icon className="w-4 h-4 relative z-10 group-hover:text-emerald-500 transition-colors" />
            <span className="text-sm font-medium relative z-10">{children}</span>
            {/* Sparkle effect */}
            <motion.div
                className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100"
                initial={{ scale: 0, rotate: 0 }}
                whileHover={{ scale: 1, rotate: 15 }}
                transition={{ type: 'spring', stiffness: 400 }}
            >
                <Sparkles className="w-3 h-3 text-amber-400" />
            </motion.div>
        </motion.div>
    </Link>
);

export const Header: React.FC<HeaderProps> = ({
    onMenuClick,
}) => {
    const { user, isAuthenticated, logout } = useAuth();
    const userName = user?.name;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            setIsMobileMenuOpen(false);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="fixed top-0 left-0 right-0 z-40"
        >
            {/* Frosted Glass Effect Container */}
            <div className="relative">
                {/* Animated gradient accent line at top */}
                <motion.div
                    className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />

                {/* Main header with enhanced frosted glass */}
                <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl backdrop-saturate-200 border-b border-white/30 dark:border-gray-700/30 shadow-xl shadow-black/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            {/* Logo with hover animation */}
                            <Link href="/" className="flex items-center gap-2 group">
                                <motion.div
                                    whileHover={{ scale: 1.05, rotate: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                >
                                    <TruckLogo size="sm" showText={true} />
                                </motion.div>
                            </Link>

                            {/* Desktop Navigation - Beautified */}
                            <nav className="hidden md:flex items-center gap-2">
                                <NavLink href="/" icon={Home}>Home</NavLink>
                                <NavLink href="/how-it-works" icon={HelpCircle}>How It Works</NavLink>
                            </nav>

                            {/* Auth Buttons with Avatar */}
                            <div className="hidden md:flex items-center gap-3">
                                {isAuthenticated ? (
                                    <div className="flex items-center gap-2">
                                        {/* User Avatar/Dashboard */}
                                        <Link href="/collector/dashboard">
                                            <motion.div
                                                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-800 rounded-full hover:from-emerald-500/20 hover:to-teal-500/20 transition-all"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden ring-2 ring-white dark:ring-gray-800">
                                                    {user?.profileImage ? (
                                                        <img
                                                            src={user.profileImage}
                                                            alt={userName || 'User'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        userName?.charAt(0).toUpperCase() || 'U'
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    {userName || 'Dashboard'}
                                                </span>
                                            </motion.div>
                                        </Link>

                                        {/* Logout Button */}
                                        <motion.button
                                            onClick={handleLogout}
                                            className="p-2 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            title="Logout"
                                        >
                                            <LogOut className="w-5 h-5" />
                                        </motion.button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Link href="/auth">
                                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                <Button variant="ghost" leftIcon={<LogIn size={18} />}>
                                                    Login
                                                </Button>
                                            </motion.div>
                                        </Link>
                                        <Link href="/auth?signup=true">
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <Button variant="primary" leftIcon={<Truck size={18} />}>
                                                    Become a Collector
                                                </Button>
                                            </motion.div>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Menu Button - Hidden, using HamburgerMenuOverlay instead */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Hamburger Menu Overlay */}
            <HamburgerMenuOverlay
                items={[
                    { label: 'Home', href: '/', icon: <Home className="w-5 h-5" /> },
                    { label: 'How It Works', href: '/how-it-works', icon: <HelpCircle className="w-5 h-5" /> },
                    ...(isAuthenticated
                        ? [
                            { label: userName || 'Dashboard', href: '/collector/dashboard', icon: <User className="w-5 h-5" /> },
                            { label: 'Logout', onClick: handleLogout, icon: <LogOut className="w-5 h-5" /> },
                        ]
                        : [
                            { label: 'Login', href: '/auth', icon: <LogIn className="w-5 h-5" /> },
                            { label: 'Become a Collector', href: '/auth?signup=true', icon: <Truck className="w-5 h-5" /> },
                        ]
                    ),
                ]}
            />
        </motion.header>
    );
};

export default Header;

