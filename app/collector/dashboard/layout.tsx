'use client';

import React from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { MbBottomNav, COLLECTOR_NAV } from '@/components/ui/mb-bottom-nav';
import { LoadingScreen } from '@/components/ui/truck-logo';
import { DynamicIslandProvider } from '@/components/ui/dynamic-island';

export default function CollectorDashboardLayout({
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

    if (user?.role !== 'collector') {
        if (typeof window !== 'undefined') {
            window.location.href = '/dashboard';
        }
        return null;
    }

    return (
        <DynamicIslandProvider>
            <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-[#F1FAF4] via-white to-[#ECFDF3]">
                <main className="pb-24 md:pb-8 h-full overflow-y-auto">
                    {children}
                </main>
                <MbBottomNav items={COLLECTOR_NAV} />
            </div>
        </DynamicIslandProvider>
    );
}
