'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, User } from 'lucide-react';
import { MbButton } from '@/components/ui/mb-button';
import { SecureFooter } from '@/components/ui/secure-footer';
import { useAuth } from '@/lib/auth-context';

/**
 * Landing screen — full-bleed truck hero with the MBalit brand overlaid on
 * the sky. Only shown to UNAUTHENTICATED visitors. If there's already a
 * signed-in user (the PinLock has just unlocked, or they navigated back to
 * "/" inside the PWA), we redirect them straight to their dashboard so
 * they never see the Sign Up / Log In page a second time.
 */
export default function Home() {
    const router = useRouter();
    const { user, isLoading } = useAuth();

    // Already-signed-in users land here when the PWA's start_url ("/") opens
    // after the PinLock clears. Without this redirect, they'd see the
    // logo + Sign Up / Log In page again, have to tap "Log In", and only
    // then get bounced to their dashboard — confusing and slow.
    useEffect(() => {
        if (isLoading || !user) return;
        if (user.onboardingComplete === false) {
            // Half-finished signup → resume onboarding on /auth.
            router.replace('/auth?continue=onboarding');
            return;
        }
        const collectorType = 'collectorType' in user ? (user as { collectorType?: string }).collectorType : undefined;
        if (user.role === 'collector' && collectorType === 'organization') {
            router.replace('/organization/dashboard');
        } else if (user.role === 'collector') {
            router.replace('/collector/dashboard');
        } else {
            router.replace('/dashboard');
        }
    }, [user, isLoading, router]);

    // While auth state is still loading, or while the redirect for an
    // authenticated user is queueing, render nothing. Showing the landing
    // page even for a frame would cause the "logo + Sign Up flash" the
    // user reported.
    if (isLoading || user) return null;

    return (
        <div className="relative min-h-[100dvh] bg-white overflow-hidden flex flex-col">
            {/* Full-bleed hero (truck + city + trees) */}
            <div className="relative flex-1 min-h-0">
                <img
                    src="/illustrations/landing-hero.jpg"
                    alt="Waste collection truck"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Soft top fade for legibility behind the brand block */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 via-white/30 to-transparent pointer-events-none" />

                {/* Brand overlay */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, type: 'spring' }}
                    className="relative z-10 flex flex-col items-center text-center pt-14 sm:pt-16 px-6"
                >
                    <img
                        src="/logo.png"
                        alt="MBalit"
                        className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] object-contain drop-shadow-sm"
                    />
                    <h1 className="mt-2 text-5xl sm:text-6xl font-extrabold tracking-tight text-[#0E7A3B] leading-none drop-shadow-sm">
                        MBalit
                    </h1>
                    <p className="mt-4 text-xl sm:text-2xl font-bold text-[#0F1A14]">
                        Smart Waste. <span className="text-[#1FA653]">Clean Future.</span>
                    </p>
                    <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-xs">
                        Join thousands of partners who are building cleaner, greener cities.
                    </p>
                </motion.div>
            </div>

            {/* Bottom action card */}
            <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="relative z-10 -mt-6 bg-white rounded-t-[28px] shadow-[0_-12px_36px_rgba(15,26,20,0.08)] px-6 pt-6 pb-8 space-y-4"
            >
                <Link href="/auth?signup=true" className="block">
                    <MbButton
                        size="lg"
                        leftIcon={<User className="w-5 h-5" />}
                        rightIcon={<ArrowRight className="w-5 h-5" />}
                        className="justify-between"
                    >
                        Sign Up
                    </MbButton>
                </Link>

                <Link href="/auth" className="block">
                    <MbButton
                        size="lg"
                        variant="outline"
                        leftIcon={<Lock className="w-5 h-5" />}
                        rightIcon={<ArrowRight className="w-5 h-5" />}
                        className="justify-between"
                    >
                        Sign In
                    </MbButton>
                </Link>

                <SecureFooter className="pt-2" />
            </motion.div>
        </div>
    );
}
