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

    if (user?.onboardingComplete === false) {
        if (typeof window !== 'undefined') {
            window.location.href = '/auth?continue=onboarding';
        }
        return null;
    }

    return (
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-white">
            <div className="hidden md:block">
                <Header />
            </div>

            <main className="flex-1 overflow-y-auto md:pt-20 pb-24 md:pb-8">
                {children}
            </main>

            <MbBottomNav items={RESIDENT_NAV} />
        </div>
    );
}
