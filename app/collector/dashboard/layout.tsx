'use client';

import React from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { CollectorBottomNav } from '@/components/ui/collector-bottom-nav';
import { LoadingScreen } from '@/components/ui/truck-logo';
import { DynamicIslandProvider } from '@/components/ui/dynamic-island';

export default function CollectorDashboardLayout({
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

    // Redirect non-collectors to their dashboard
    if (user?.role !== 'collector') {
        if (typeof window !== 'undefined') {
            window.location.href = '/dashboard';
        }
        return null;
    }

    return (
        <DynamicIslandProvider>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
                {/* Main content with padding for bottom nav */}
                <main className="pb-24 md:pb-8">
                    {children}
                </main>

                {/* Mobile Bottom Navigation */}
                <CollectorBottomNav />
            </div>
        </DynamicIslandProvider>
    );
}
