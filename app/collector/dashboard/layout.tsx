'use client';

import React from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { MbBottomNav, COLLECTOR_NAV, COLLECTOR_DRIVER_NAV } from '@/components/ui/mb-bottom-nav';
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

    // Drivers under an organization don't have their own wallet — earnings
    // flow into the org's wallet, and the org pays them outside the platform.
    const isDriverUnderOrg =
        user && 'collectorType' in user && user.collectorType === 'organization_member';
    const navItems = isDriverUnderOrg ? COLLECTOR_DRIVER_NAV : COLLECTOR_NAV;

    return (
        <DynamicIslandProvider>
            <div className="min-h-[100dvh] bg-gradient-to-br from-[#F1FAF4] via-white to-[#ECFDF3]">
                <main className="pb-28">{children}</main>
                <MbBottomNav items={navItems} />
            </div>
        </DynamicIslandProvider>
    );
}
