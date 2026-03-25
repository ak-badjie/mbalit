'use client';

import React from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/ui/bottom-nav';
import { LoadingScreen } from '@/components/ui/truck-logo';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, isAuthenticated } = useRequireAuth('/auth');

    // Show loading screen while checking auth
    if (isLoading) {
        return <LoadingScreen duration={1500} onComplete={() => { }} />;
    }

    // Redirect happens in useRequireAuth if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    // Redirect collectors to their dashboard
    if (user?.role === 'collector') {
        if (typeof window !== 'undefined') {
            window.location.href = '/collector/dashboard';
        }
        return null;
    }

    // GATE-KEEPING: Redirect users who haven't completed onboarding
    if (user?.onboardingComplete === false) {
        if (typeof window !== 'undefined') {
            window.location.href = '/auth?continue=onboarding';
        }
        return null;
    }

    return (
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-gray-50">
            {/* Desktop Header - hidden on mobile */}
            <div className="hidden md:block">
                <Header />
            </div>

            {/* Mobile-optimized content area - scrollable */}
            <main className="flex-1 overflow-y-auto md:pt-20 pb-24 md:pb-8">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    );
}


