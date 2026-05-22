'use client';

import React from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { MbBottomNav, RESIDENT_NAV } from '@/components/ui/mb-bottom-nav';
import { LoadingScreen } from '@/components/ui/truck-logo';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, isAuthenticated } = useRequireAuth();

    if (isLoading) {
        return <LoadingScreen duration={1500} onComplete={() => { }} />;
    }

    if (!isAuthenticated) {
        return null;
    }

    if (user?.role === 'collector') {
        if (typeof window !== 'undefined') {
            window.location.href = '/collector/dashboard';
        }
        return null;
    }

    // GATE-KEEPING: Redirect users who haven't completed onboarding.
    // Important: only act once the user doc has loaded AND the auth provider
    // has finished its first sync. Acting on a transient cache-first snapshot
    // (which can briefly carry pre-merge data) used to trap users in a signup
    // loop right after they completed their profile.
    if (!isLoading && user && user.onboardingComplete === false) {
        if (typeof window !== 'undefined') {
            window.location.href = '/auth?continue=onboarding';
        }
        return null;
    }

    return (
        <div className="min-h-[100dvh] bg-white">
            <div className="hidden md:block">
                <Header />
            </div>

            <main className="md:pt-20 pb-28">
                {children}
            </main>

            <MbBottomNav items={RESIDENT_NAV} />
        </div>
    );
}
