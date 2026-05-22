'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Share,
    Plus,
    Download,
    Smartphone,
    ChevronDown,
    Sparkles,
    Check,
} from 'lucide-react';

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: ReadonlyArray<string>;
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

function detectPlatform(): Platform {
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
 * When the page is loaded inside an installed standalone PWA the gate is
 * transparent and children render normally. When loaded in a browser tab the
 * user sees a beautifully animated install walkthrough that matches their
 * platform: iOS users get the Share → Add-to-Home-Screen flow, Android &
 * desktop Chromium users get a single "Install" button hooked into the
 * `beforeinstallprompt` event.
 */
export function InstallGate({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const [standalone, setStandalone] = useState(false);
    const [platform, setPlatform] = useState<Platform>('unknown');
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [installState, setInstallState] = useState<'idle' | 'prompting' | 'accepted' | 'dismissed'>('idle');

    useEffect(() => {
        setMounted(true);
        setStandalone(isStandalone());
        setPlatform(detectPlatform());

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
    if (!mounted) return null;
    if (standalone) return <>{children}</>;

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        setInstallState('prompting');
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setInstallState(choice.outcome === 'accepted' ? 'accepted' : 'dismissed');
        setDeferredPrompt(null);
    };

    return (
        <div className="relative min-h-[100dvh] overflow-hidden bg-white">
            {/* Hero background using the landing image */}
            <div className="absolute inset-0 -z-0">
                <img
                    src="/illustrations/landing-hero.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/40 to-white" />
            </div>

            <div className="relative z-10 flex flex-col min-h-[100dvh]">
                {/* Brand block */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, type: 'spring' }}
                    className="flex flex-col items-center text-center pt-12 sm:pt-16 px-6"
                >
                    <img src="/logo.png" alt="MBalit" className="w-[96px] h-[96px] object-contain drop-shadow-sm" />
                    <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0E7A3B] leading-none drop-shadow-sm">
                        MBalit
                    </h1>
                    <p className="mt-3 text-lg sm:text-xl font-bold text-[#0F1A14]">
                        Smart Waste. <span className="text-[#1FA653]">Clean Future.</span>
                    </p>
                    <p className="mt-2 text-sm text-gray-600 max-w-xs">
                        To get the best experience, install MBalit on your device.
                    </p>
                </motion.div>

                {/* Bottom install card */}
                <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="mt-auto bg-white rounded-t-[28px] shadow-[0_-12px_36px_rgba(15,26,20,0.08)] px-6 pt-6 pb-8 space-y-5"
                >
                    {installState === 'accepted' ? (
                        <AcceptedView />
                    ) : platform === 'ios' ? (
                        <IosInstructions />
                    ) : platform === 'android' || platform === 'desktop' ? (
                        <PromptInstructions
                            hasPrompt={!!deferredPrompt}
                            onInstall={handleInstall}
                            installState={installState}
                            platform={platform}
                        />
                    ) : (
                        <UnknownInstructions />
                    )}
                </motion.div>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// iOS — Add to Home Screen walkthrough
// ──────────────────────────────────────────────────────────────────────

function IosInstructions() {
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setActiveStep((s) => (s + 1) % 3), 2400);
        return () => clearInterval(id);
    }, []);

    return (
        <>
            <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F6EE] text-[#0E7A3B] font-semibold text-xs mb-2">
                    <Smartphone className="w-3.5 h-3.5" />
                    iPhone / iPad
                </div>
                <h2 className="text-xl font-extrabold text-[#0F1A14]">Add MBalit to your Home Screen</h2>
                <p className="text-sm text-gray-500 mt-1">Three quick taps in Safari and you&apos;re done.</p>
            </div>

            <div className="space-y-3">
                <IosStep
                    number={1}
                    active={activeStep === 0}
                    title="Tap the Share button"
                    description="Find it at the bottom of Safari."
                    icon={<Share className="w-5 h-5" strokeWidth={2.2} />}
                />
                <IosStep
                    number={2}
                    active={activeStep === 1}
                    title="Scroll and tap “Add to Home Screen”"
                    description="It's in the bottom row of the share sheet."
                    icon={<Plus className="w-5 h-5" strokeWidth={2.2} />}
                />
                <IosStep
                    number={3}
                    active={activeStep === 2}
                    title="Tap “Add” in the top right"
                    description="MBalit pops onto your home screen — open it from there."
                    icon={<Check className="w-5 h-5" strokeWidth={2.5} />}
                />
            </div>

            <NotInSafariHint />
        </>
    );
}

function IosStep({
    number,
    title,
    description,
    icon,
    active,
}: {
    number: number;
    title: string;
    description: string;
    icon: React.ReactNode;
    active: boolean;
}) {
    return (
        <motion.div
            animate={{
                scale: active ? 1.02 : 1,
                boxShadow: active
                    ? '0 10px 30px rgba(14,122,59,0.15)'
                    : '0 1px 0 rgba(15,26,20,0.04)',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`flex items-center gap-3 p-3 rounded-2xl border ${
                active ? 'border-[#0E7A3B] bg-[#F1FAF4]' : 'border-gray-100 bg-white'
            }`}
        >
            <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                    active ? 'bg-[#0E7A3B] text-white' : 'bg-[#E8F6EE] text-[#0E7A3B]'
                }`}
            >
                {number}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[#0F1A14] text-sm">{title}</h3>
                <p className="text-xs text-gray-500 truncate">{description}</p>
            </div>
            <motion.div
                animate={{ scale: active ? [1, 1.15, 1] : 1 }}
                transition={{ duration: 0.8, repeat: active ? Infinity : 0 }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    active ? 'bg-[#0E7A3B] text-white' : 'bg-[#E8F6EE] text-[#0E7A3B]'
                }`}
            >
                {icon}
            </motion.div>
        </motion.div>
    );
}

function NotInSafariHint() {
    if (typeof navigator === 'undefined') return null;
    const ua = navigator.userAgent;
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isSafari) return null;
    return (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <ChevronDown className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0 rotate-180" />
            <p className="text-xs text-amber-800">
                For best results, open this page in <span className="font-semibold">Safari</span>. Add-to-Home-Screen only works there on iOS.
            </p>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Android + desktop Chromium — one-tap install via beforeinstallprompt
// ──────────────────────────────────────────────────────────────────────

function PromptInstructions({
    hasPrompt,
    onInstall,
    installState,
    platform,
}: {
    hasPrompt: boolean;
    onInstall: () => void;
    installState: 'idle' | 'prompting' | 'accepted' | 'dismissed';
    platform: Platform;
}) {
    return (
        <>
            <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F6EE] text-[#0E7A3B] font-semibold text-xs mb-2">
                    <Download className="w-3.5 h-3.5" />
                    {platform === 'android' ? 'Android' : 'Chromium'}
                </div>
                <h2 className="text-xl font-extrabold text-[#0F1A14]">Install MBalit</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Get the app on your home screen for instant access.
                </p>
            </div>

            {/* Preview card showing what the icon will look like */}
            <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-[#F1FAF4] to-white border border-[#D2F4E1]"
            >
                <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-white shadow-[0_8px_24px_rgba(14,122,59,0.18)] flex items-center justify-center overflow-hidden">
                        <img src="/logo.png" alt="MBalit icon" className="w-16 h-16 object-contain" />
                    </div>
                    <motion.div
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                        className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#0E7A3B] flex items-center justify-center"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                </div>
                <p className="font-bold text-sm text-[#0F1A14] mt-1">MBalit</p>
                <p className="text-[11px] text-gray-500">This is how it&apos;ll look on your home screen.</p>
            </motion.div>

            {/* Install CTA */}
            <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onInstall}
                disabled={!hasPrompt || installState === 'prompting'}
                className="w-full py-4 rounded-2xl bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-bold inline-flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(14,122,59,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {installState === 'prompting' ? (
                    <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        Installing…
                    </span>
                ) : (
                    <>
                        <Download className="w-5 h-5" />
                        {hasPrompt ? 'Install MBalit' : 'Waiting for your browser…'}
                    </>
                )}
            </motion.button>

            {installState === 'dismissed' && (
                <p className="text-xs text-gray-500 text-center">
                    No worries — tap the button above whenever you&apos;re ready.
                </p>
            )}

            {!hasPrompt && (
                <details className="text-xs text-gray-500 mt-1">
                    <summary className="cursor-pointer font-semibold text-[#0E7A3B]">
                        Not seeing the install option?
                    </summary>
                    <div className="mt-2 space-y-2 pl-1">
                        <p>Open this page in <span className="font-semibold">Chrome</span> or another Chromium browser.</p>
                        <p>Then look for the <span className="font-semibold">⋮</span> menu and choose <span className="font-semibold">“Install app”</span> or <span className="font-semibold">“Add to Home screen.”</span></p>
                    </div>
                </details>
            )}
        </>
    );
}

function UnknownInstructions() {
    return (
        <>
            <div className="text-center">
                <h2 className="text-xl font-extrabold text-[#0F1A14]">Install MBalit</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Look for the <span className="font-semibold">“Install app”</span> or <span className="font-semibold">“Add to Home Screen”</span> option in your browser menu.
                </p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#F1FAF4] border border-[#D2F4E1]">
                <img src="/logo.png" alt="MBalit" className="w-14 h-14" />
                <p className="font-bold text-sm text-[#0F1A14]">MBalit</p>
                <p className="text-[11px] text-gray-500">Smart Waste. Clean Future.</p>
            </div>
        </>
    );
}

function AcceptedView() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring' }}
            className="text-center py-4"
        >
            <div className="w-16 h-16 rounded-full bg-[#0E7A3B] flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
            <h2 className="text-xl font-extrabold text-[#0F1A14]">You&apos;re all set!</h2>
            <p className="text-sm text-gray-500 mt-1">
                Open MBalit from your home screen to continue.
            </p>
        </motion.div>
    );
}

export default InstallGate;
