'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Menu, X, User, LogIn, LogOut, Home, HelpCircle, UserPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TruckLogo } from '@/components/ui/truck-logo';
import CapsuleNav from '@/components/ui/CapsuleNav';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

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
            className="group relative flex items-center gap-2 px-4 py-2 rounded-xl text-gray-700 hover:text-emerald-700 transition-colors font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Animated background on hover */}
            <motion.div
                className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                layoutId="navBackground"
            />
            <Icon className="w-4 h-4 relative z-10 group-hover:text-emerald-600 transition-colors" />
            <span className="text-sm relative z-10">{children}</span>
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
    const [isScrolled, setIsScrolled] = useState(false);

    // Handle scroll for transparency
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY;
            setIsScrolled(scrollPosition > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <>
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                className={cn(
                    "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
                    isScrolled
                        ? "py-0 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-black/5"
                        : "py-4 bg-transparent border-transparent shadow-none"
                )}
            >
                {/* Frosted Glass Effect Container */}
                <div className="relative">
                    {/* Animated gradient accent line at top - only visible when scrolled */}
                    <motion.div
                        className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isScrolled ? 1 : 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className={cn("flex items-center justify-between transition-all duration-300", isScrolled ? "h-16" : "h-20")}>
                            {/* Logo with hover animation */}
                            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
                                <motion.div
                                    whileHover={{ scale: 1.05, rotate: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                    className="flex items-center"
                                >
                                    {/* Pass text color based on scroll state if needed, assuming TruckLogo adapts or is fine */}
                                    <TruckLogo size="sm" showText={true} />
                                </motion.div>
                            </Link>

                            {/* Spacer for mobile to prevent overlap with hamburger */}
                            {/* We don't need a spacer as CapsuleNav is fixed position */}

                            {/* Desktop Navigation - Beautified */}
                            <nav className="hidden md:flex items-center gap-2">
                                <NavLink href="/" icon={Home}>Home</NavLink>
                                <NavLink href="/how-it-works" icon={HelpCircle}>How It Works</NavLink>
                            </nav>

                            {/* Auth Buttons with Avatar -- Only visible on DESKTOP now, mobile handled by CapsuleNav */}
                            <div className="hidden md:flex items-center gap-3">
                                {isAuthenticated ? (
                                    <div className="flex items-center gap-2">
                                        {/* User Avatar/Dashboard */}
                                        <Link href={user?.role === 'collector' ? '/collector/dashboard' : '/dashboard'}>
                                            <motion.div
                                                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 rounded-full hover:from-emerald-500/20 hover:to-teal-500/20 transition-all font-medium text-gray-700"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden ring-2 ring-white/50 shadow-sm">
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
                                                <span className="text-sm">
                                                    {userName || 'Dashboard'}
                                                </span>
                                            </motion.div>
                                        </Link>

                                        {/* Logout Button */}
                                        <motion.button
                                            onClick={handleLogout}
                                            className="p-2 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
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
                                                <Button variant="ghost" leftIcon={<LogIn size={18} />} className="text-gray-700 hover:bg-white/50">
                                                    Login
                                                </Button>
                                            </motion.div>
                                        </Link>
                                        <Link href="/auth?signup=true">
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <Button variant="primary" leftIcon={<UserPlus size={18} />}>
                                                    Sign Up
                                                </Button>
                                            </motion.div>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.header>

            {/* Mobile Capsule Navigation - Fixed overlay independent of Header flow */}
            <CapsuleNav />
        </>
    );
};

export default Header;

