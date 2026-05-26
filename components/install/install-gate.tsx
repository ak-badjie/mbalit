'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { InstallPlatform, InstallState } from './install-ui';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Lazy-load the heavy framer-motion install UI ONLY when the gate decides to
// render it. Keeping it out of the static graph (so RootLayout never pulls
// framer-motion through this file) avoids Turbopack HMR issues where the
// module factory gets invalidated mid-update and the app crashes with
// "module factory is not available".
const InstallUI = dynamic(
    () => import('./install-ui').then((m) => m.InstallUI),
    { ssr: false, loading: () => null }
);

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: ReadonlyArray<string>;
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

function detectPlatform(): InstallPlatform {
    if (typeof navigator === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Macintosh|Windows|Linux/.test(ua)) return 'desktop';
    return 'unknown';
}

function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
    const iosStandalone = (window.navigator as any).standalone === true;
    return !!(displayModeStandalone || iosStandalone);
}

/**
 * InstallGate — the entire app is gated behind PWA installation.
 *
 * - In standalone (installed) mode, this is transparent and children render normally.
 * - In a browser tab, it lazy-loads InstallUI which shows a platform-aware
 *   install walkthrough (iOS Add-to-Home-Screen flow, Android/Chromium
 *   beforeinstallprompt button).
 */
export function InstallGate({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const [standalone, setStandalone] = useState(false);
    const [platform, setPlatform] = useState<InstallPlatform>('unknown');
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [installState, setInstallState] = useState<InstallState>('idle');
    const [requireStandalone, setRequireStandalone] = useState<boolean | null>(null);

    useEffect(() => {
        setMounted(true);
        setStandalone(isStandalone());
        setPlatform(detectPlatform());

        const checkSettings = async () => {
            try {
                const settingDoc = await getDoc(doc(db, 'settings', 'app'));
                if (settingDoc.exists()) {
                    setRequireStandalone(settingDoc.data().requireStandaloneDevice !== false);
                } else {
                    setRequireStandalone(true);
                }
            } catch (e) {
                console.error("Failed to fetch app settings", e);
                setRequireStandalone(true);
            }
        };
        checkSettings();

        const onBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        const onInstalled = () => {
            setStandalone(true);
            setInstallState('accepted');
        };
        const mq = window.matchMedia('(display-mode: standalone)');
        const onDisplayChange = () => setStandalone(isStandalone());

        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);
        mq.addEventListener?.('change', onDisplayChange);

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
            mq.removeEventListener?.('change', onDisplayChange);
        };
    }, []);

    // Hydration guard: render nothing until we know the standalone state, so
    // we never flash the login screen for a user who actually has the PWA
    // installed (or flash the install gate for a standalone user).
    if (!mounted || requireStandalone === null) return null;
    if (standalone || !requireStandalone) return <>{children}</>;

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        setInstallState('prompting');
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setInstallState(choice.outcome === 'accepted' ? 'accepted' : 'dismissed');
        setDeferredPrompt(null);
    };

    return (
        <InstallUI
            platform={platform}
            hasPrompt={!!deferredPrompt}
            installState={installState}
            onInstall={handleInstall}
        />
    );
}

export default InstallGate;
