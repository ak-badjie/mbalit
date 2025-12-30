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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Desktop Header - hidden on mobile */}
            <div className="hidden md:block">
                <Header />
            </div>

            {/* Mobile-optimized content area */}
            <main className="md:pt-20 pb-24 md:pb-8">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
