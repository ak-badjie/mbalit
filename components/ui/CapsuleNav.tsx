'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpRight, Home, LayoutDashboard, LogIn, UserPlus, HelpCircle, Truck } from 'lucide-react';
import { cn } from '@/lib/utils'; // Fixed import path
import { useAuth } from '@/lib/auth-context'; // Import auth context

export interface CapsuleNavProps {
    logoSrc?: string;
    logoAlt?: string;
    companyName?: string;
    tagline?: string;
    position?: 'top-left' | 'top-right';
    className?: string;
    zIndex?: number;
}

const cardColors = ['rgba(16, 185, 129, 0.9)', 'rgba(5, 150, 105, 0.9)']; // Emerald colors for Mbalit

const CapsuleNav: React.FC<CapsuleNavProps> = ({
    logoSrc = '/davelabslogo.png', // We'll rely on the passed prop or default. note: Mbalit uses TruckLogo usually
    logoAlt = 'Mbalit Logo',
    companyName = 'Mbalit',
    tagline = 'WASTE MADE EASY',
    position = 'top-right',
    className,
    zIndex = 9999,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const overlayRef = useRef<HTMLDivElement>(null);
    const { user, isAuthenticated, logout } = useAuth(); // Use auth hook

    // Update navigation sections based on auth state
    const navigationSections = [
        {
            title: 'Account',
            size: 'large',
            links: isAuthenticated ? [
                { label: user?.name || 'Dashboard', href: user?.role === 'collector' ? '/collector/dashboard' : '/dashboard', icon: LayoutDashboard },
                { label: 'Logout', onClick: () => { logout(); setIsOpen(false); }, icon: LogIn }, // Handle logout
            ] : [
                { label: 'Login', href: '/auth', icon: LogIn },
                { label: 'Sign Up', href: '/auth?signup=true', icon: UserPlus },
                { label: 'Become a Collector', href: '/auth?signup=true&role=collector', icon: Truck },
            ],
        },
        {
            title: 'Explore',
            size: 'medium',
            links: [
                { label: 'Home', href: '/', icon: Home },
                { label: 'How It Works', href: '/how-it-works', icon: HelpCircle },
            ],
        },
    ];


    // Track window dimensions
    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const toggleMenu = () => setIsOpen(!isOpen);

    // Calculate card dimensions based on window size
    const getCardStyle = (size: string, index: number) => {
        const baseWidth = Math.min(dimensions.width * 0.4, 320); // Slightly wider for better mobile content
        const basePadding = Math.max(dimensions.width * 0.02, 24);
        const baseHeight = Math.max(dimensions.height * 0.2, 180);

        let width: number;
        let height: number;

        switch (size) {
            case 'large':
                width = baseWidth * 1.1;
                height = baseHeight * 1.2;
                break;
            case 'medium':
            default:
                width = baseWidth;
                height = baseHeight;
                break;
        }

        // Adjust for mobile - make them full width mostly
        if (dimensions.width < 768) {
            width = dimensions.width * 0.85;
        }

        return {
            width: `${width}px`,
            minHeight: `${height}px`,
            padding: `${basePadding}px`,
            backgroundColor: cardColors[index % 2],
            backdropFilter: 'blur(10px)',
        };
    };

    const positionClasses = position === 'top-right'
        ? 'right-4 top-5 md:right-6 md:top-6' // Adjusted top to center in standard header (approx h-20/80px or h-16/64px)
        : 'left-4 top-5 md:left-6 md:top-6';

    // Calculate positions for smooth animation
    const clipPathOrigin = position === 'top-right'
        ? `calc(100% - 60px) 40px` // Adjusted for where the button likely sits
        : `60px 40px`;

    return (
        <>
            {/* Capsule Trigger Button - Only visible when needed (handled by parent or media queries typically, but here we just show/hide) */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        onClick={toggleMenu}
                        className={cn('fixed z-50 md:hidden', positionClasses, className)} // Only show on mobile by default if used alongside desktop nav
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/20 pl-4 pr-2 py-2">
                            <span className="text-sm font-semibold text-gray-800">Menu</span>
                            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                                <div className="flex flex-col gap-1">
                                    <span className="w-4 h-0.5 bg-white rounded-full" />
                                    <span className="w-4 h-0.5 bg-white rounded-full" />
                                    <span className="w-4 h-0.5 bg-white rounded-full" />
                                </div>
                            </div>
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Fullscreen Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={overlayRef}
                        className="fixed inset-0 flex flex-col"
                        style={{ zIndex }}
                        initial={{ clipPath: `circle(0% at ${clipPathOrigin})` }}
                        animate={{ clipPath: `circle(150% at ${clipPathOrigin})` }}
                        exit={{ clipPath: `circle(0% at ${clipPathOrigin})` }}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        {/* Background Image Layer - NO BLUR, NO TINT as requested */}
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{
                                backgroundImage: 'url(/hero.jpeg)',
                            }}
                        />
                        {/* Removed dark overlay div */}

                        {/* Close Button */}
                        <motion.button
                            onClick={toggleMenu}
                            className={cn(
                                'absolute flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white',
                                'hover:bg-white/30 transition-colors z-20',
                                position === 'top-right' ? 'right-6 top-6' : 'left-6 top-6'
                            )}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            transition={{ delay: 0.3 }}
                            aria-label="Close menu"
                        >
                            <X className="w-6 h-6" />
                        </motion.button>

                        {/* Content */}
                        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
                            <div className="min-h-full flex flex-col items-center py-20 px-6">

                                <motion.div
                                    className="mb-12 text-center"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">{companyName}</h1>
                                    <p className="text-emerald-100 tracking-widest text-sm font-medium">{tagline}</p>
                                </motion.div>

                                <div className="flex flex-wrap justify-center gap-6 w-full max-w-4xl">
                                    {navigationSections.map((section, index) => (
                                        <motion.div
                                            key={section.title}
                                            className="rounded-3xl border border-white/10 overflow-hidden flex flex-col"
                                            style={getCardStyle(section.size, index)}
                                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ delay: 0.3 + index * 0.1 }}
                                        >
                                            <h2 className="text-xl font-bold text-white mb-6 p-2 border-b border-white/10">
                                                {section.title}
                                            </h2>

                                            <div className="flex flex-col gap-4 flex-1">
                                                {section.links.map((link) => {
                                                    const LinkIcon = link.icon;
                                                    const Wrapper = link.onClick ? 'button' : 'a';
                                                    return (
                                                        <Wrapper
                                                            key={link.label}
                                                            href={link.href}
                                                            onClick={link.onClick}
                                                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 transition-colors text-left group"
                                                        >
                                                            <div className="p-2 bg-white/20 rounded-lg group-hover:bg-emerald-400 group-hover:text-white transition-colors text-emerald-50">
                                                                {LinkIcon ? <LinkIcon size={20} /> : <ArrowUpRight size={20} />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-lg font-medium text-white leading-none">
                                                                    {link.label}
                                                                </span>
                                                            </div>
                                                        </Wrapper>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default CapsuleNav;
export { CapsuleNav };
