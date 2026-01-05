'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, LayoutDashboard, Truck, ArrowRight, User, HelpCircle, LogIn, Trash2, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/
interface LinkItem {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: React.ElementType;
}

interface NavSection {
    title: string;
    size: 'small' | 'medium' | 'large';
    links: LinkItem[];
}

interface CapsuleNavProps {
    isOpen: boolean;
    onClose: () => void;
}

/* -------------------------------------------------------------------------------------------------
 * Configuration
 * -----------------------------------------------------------------------------------------------*/

const cardColors = [
    'rgba(16, 185, 129, 0.95)', // Emerald 500 (Less transparent for legibility)
    'rgba(13, 148, 136, 0.95)', // Teal 600
];

/* -------------------------------------------------------------------------------------------------
 * Component
 * -----------------------------------------------------------------------------------------------*/

const CapsuleNav: React.FC<CapsuleNavProps> = ({ isOpen, onClose }) => {
    const { user, isAuthenticated, logout } = useAuth();
    const overlayRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

    const toggleMenu = () => {
        onClose();
    };

    // Update dimensions on mount and resize
    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        updateDimensions();
        // Fallback for initial render if window is available
        if (typeof window !== 'undefined') {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Lock body scroll when menu is open
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

    // Define navigation sections based on Auth state
    const navigationSections: NavSection[] = isAuthenticated
        ? [
            {
                title: 'Account',
                size: 'large',
                links: [
                    { label: 'Dashboard', href: user?.role === 'collector' ? '/collector/dashboard' : '/dashboard', icon: LayoutDashboard },
                    { label: 'Logout', onClick: () => { logout(); onClose(); }, icon: LogOut },
                ],
            },
        ]
        : [
            {
                title: 'Services', // Grouping CTA's
                size: 'large',
                links: [
                    { label: 'Have Your Waste Collected', href: '/auth?signup=true', icon: Trash2 }, // Specific waste icon
                    { label: 'Become a Collector', href: '/auth?signup=true&role=collector', icon: Truck },
                    { label: 'Login', href: '/auth', icon: LogIn }, // Moved Login here
                ],
            },
            {
                title: 'Explore', // Grouping Navs
                size: 'medium',
                links: [
                    { label: 'Home', href: '/', icon: Home }, // Moved Home here
                    { label: 'How It Works', href: '/how-it-works', icon: HelpCircle },
                ],
            },
        ];

    // Helper to calculate card style
    const getCardStyle = (size: string, index: number) => {
        // Simplified responsive sizing logic for mobile focus
        const isMobile = dimensions.width < 768;

        const width = isMobile ? '100%' : '45%'; // Cards take full width on mobile
        const height = 'auto';

        return {
            width: width,
            minHeight: '120px',
            padding: '24px',
            backgroundColor: cardColors[index % cardColors.length],
        };
    };

    // Animation Config
    // Standard circular reveal animation
    const clipPathOrigin = `calc(100% - 40px) 40px`;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={overlayRef}
                    className="fixed inset-0 flex flex-col z-[60]" // Higher z-index than header
                    initial={{ clipPath: `circle(0% at ${clipPathOrigin})` }}
                    animate={{ clipPath: `circle(150% at ${clipPathOrigin})` }}
                    exit={{ clipPath: `circle(0% at ${clipPathOrigin})` }}
                    transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    {/* Background Image Layer - NO BLUR, NO TINT */}
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: 'url(/hero.jpeg)',
                        }}
                    />

                    {/* Close Button */}
                    <motion.button
                        className="absolute top-5 right-4 md:top-6 md:right-6 z-20 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors border border-white/30"
                        onClick={toggleMenu}
                        initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                    >
                        <X size={24} strokeWidth={2.5} />
                    </motion.button>

                    {/* Navigation Container */}
                    <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden p-6 pt-24 pb-12 flex flex-col justify-center items-center">
                        {/* Header Elements: Logo/Title */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-center mb-10"
                        >
                            <h2 className="text-4xl font-bold text-white tracking-tight leading-none mb-1">Mbalit</h2>
                            <p className="text-emerald-100 text-sm tracking-widest font-medium uppercase">Waste Made Easy</p>
                        </motion.div>

                        <div className="w-full max-w-lg flex flex-col gap-4">
                            {navigationSections.map((section, sectionIndex) => (
                                <motion.div
                                    key={section.title}
                                    style={getCardStyle(section.size, sectionIndex)}
                                    className="rounded-[32px] flex flex-col justify-between shadow-lg relative overflow-hidden backdrop-blur-md border border-white/20 hover:scale-[1.02] transition-transform duration-300 group mx-auto"
                                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        transition: {
                                            delay: 0.1 + sectionIndex * 0.1,
                                            type: 'spring',
                                            stiffness: 100,
                                            damping: 15
                                        }
                                    }}
                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                >
                                    {/* Glass reflection effect */}
                                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/20 to-transparent pointer-events-none" />

                                    <div className="relative z-10">
                                        <h3 className="text-white/90 text-xs font-bold uppercase tracking-widest mb-6 ml-1 flex items-center gap-3">
                                            {section.title}
                                            <div className="h-[1px] flex-1 bg-white/40" />
                                        </h3>
                                        <div className="flex flex-col gap-4">
                                            {section.links.map((link, linkIndex) => (
                                                <div key={linkIndex}>
                                                    {link.onClick ? (
                                                        <button
                                                            onClick={link.onClick}
                                                            className="text-2xl sm:text-3xl font-bold text-white hover:text-white/80 transition-colors text-left flex items-center gap-4 w-full group/link"
                                                        >
                                                            {link.icon && <link.icon className="w-6 h-6 sm:w-8 sm:h-8 opacity-70 group-hover/link:opacity-100 transition-opacity" />}
                                                            <span>{link.label}</span>
                                                        </button>
                                                    ) : (
                                                        <Link
                                                            href={link.href || '#'}
                                                            onClick={toggleMenu}
                                                            className="text-2xl sm:text-3xl font-bold text-white hover:text-white/80 transition-colors flex items-center gap-4 w-full group/link"
                                                        >
                                                            {link.icon && <link.icon className="w-6 h-6 sm:w-8 sm:h-8 opacity-70 group-hover/link:opacity-100 transition-opacity" />}
                                                            <span>{link.label}</span>
                                                        </Link>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Decorative bottom icon */}
                                    <div className="absolute bottom-4 right-4 opacity-10">
                                        <Truck size={60} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CapsuleNav;
export { CapsuleNav };
