'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Download,
    Smartphone,
    ChevronDown,
    Sparkles,
    Check,
} from 'lucide-react';

export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'unknown';
export type InstallState = 'idle' | 'prompting' | 'accepted' | 'dismissed';

interface InstallUIProps {
    platform: InstallPlatform;
    hasPrompt: boolean;
    installState: InstallState;
    onInstall: () => void;
}

/**
 * Heavy install-walkthrough UI. Split out from InstallGate so the layout's
 * static import graph doesn't pull framer-motion in — InstallGate lazy-loads
 * this module with next/dynamic + ssr:false. That isolates Turbopack HMR
 * churn around framer-motion so the rest of the app stays stable.
 */
export function InstallUI({ platform, hasPrompt, installState, onInstall }: InstallUIProps) {
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
                            hasPrompt={hasPrompt}
                            onInstall={onInstall}
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
    const [step, setStep] = useState(0);
    const TOTAL = 4;

    useEffect(() => {
        const id = setInterval(() => setStep((s) => (s + 1) % TOTAL), 2600);
        return () => clearInterval(id);
    }, []);

    const captions = [
        { title: 'Tap the Share button', description: 'Find it at the bottom of Safari.' },
        { title: 'Tap “Add to Home Screen”', description: 'It’s in the bottom row of the share sheet.' },
        { title: 'Tap “Add” to confirm', description: 'Top right corner of the dialog.' },
        { title: 'You’re done!', description: 'MBalit now lives on your home screen.' },
    ];

    return (
        <>
            <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F6EE] text-[#0E7A3B] font-semibold text-xs mb-2">
                    <Smartphone className="w-3.5 h-3.5" />
                    iPhone / iPad
                </div>
                <h2 className="text-xl font-extrabold text-[#0F1A14]">Add MBalit to your Home Screen</h2>
                <p className="text-sm text-gray-500 mt-1">Watch the steps below — three quick taps in Safari.</p>
            </div>

            <IosInstallMockup step={step} />

            <div className="text-center">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <p className="font-bold text-[#0F1A14] text-sm">
                        <span className="text-[#0E7A3B]">{step + 1}.</span> {captions[step].title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{captions[step].description}</p>
                </motion.div>

                <div className="flex items-center justify-center gap-1.5 mt-3">
                    {Array.from({ length: TOTAL }).map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setStep(i)}
                            aria-label={`Step ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all ${
                                i === step ? 'w-6 bg-[#0E7A3B]' : 'w-1.5 bg-gray-200'
                            }`}
                        />
                    ))}
                </div>
            </div>

            <NotInSafariHint />
        </>
    );
}

function IosInstallMockup({ step }: { step: number }) {
    return (
        <div className="flex justify-center">
            <div
                className="relative bg-[#1A1A1A] rounded-[36px] p-2 shadow-[0_20px_50px_rgba(15,26,20,0.18)]"
                style={{ width: 220, height: 380 }}
            >
                <div className="relative w-full h-full bg-[#F2F4F7] rounded-[28px] overflow-hidden">
                    <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-1.5 text-[10px] font-semibold text-gray-900">
                        <span>9:41</span>
                        <span className="absolute left-1/2 -translate-x-1/2 top-1 w-16 h-3 rounded-full bg-[#1A1A1A]" />
                        <span className="flex items-center gap-0.5">
                            <span>•••</span>
                            <span>📶</span>
                        </span>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 0 && <SafariScreen key="safari" tapShare />}
                        {step === 1 && <ShareSheetScreen key="sheet" tapAddToHome />}
                        {step === 2 && <AddModalScreen key="modal" tapAdd />}
                        {step === 3 && <HomeScreen key="home" />}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function SafariScreen({ tapShare }: { tapShare?: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col pt-7"
        >
            <div className="mx-3 my-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 flex items-center gap-1.5 text-[10px] text-gray-500">
                <span className="w-3 h-3 rounded-full bg-[#0E7A3B]/15 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0E7A3B]" />
                </span>
                <span className="font-semibold text-gray-700">mbalit.app</span>
            </div>

            <div className="flex-1 bg-white flex flex-col items-center justify-center px-4 text-center">
                <img src="/logo.png" alt="" className="w-12 h-12 object-contain mb-1" />
                <span className="font-extrabold text-[#0E7A3B] text-base leading-none">MBalit</span>
                <span className="text-[9px] text-gray-500 mt-1">Smart Waste. Clean Future.</span>
            </div>

            <div className="relative h-9 bg-[#F8F8F8] border-t border-gray-200 flex items-center justify-around px-3">
                <SafariNavBtn>{'<'}</SafariNavBtn>
                <SafariNavBtn dim>{'>'}</SafariNavBtn>
                <ShareGlyph highlighted={tapShare} />
                <SafariNavBtn>≡</SafariNavBtn>
                <SafariNavBtn>▢</SafariNavBtn>
            </div>

            <div className="h-2.5 flex items-center justify-center">
                <div className="w-16 h-1 rounded-full bg-black/70" />
            </div>

            {tapShare && <TapPointer style={{ left: 88, bottom: 38 }} />}
        </motion.div>
    );
}

function SafariNavBtn({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
    return <span className={`text-base ${dim ? 'text-gray-300' : 'text-[#007AFF]'}`}>{children}</span>;
}

function ShareGlyph({ highlighted }: { highlighted?: boolean }) {
    return (
        <motion.div
            animate={highlighted ? { scale: [1, 1.18, 1] } : { scale: 1 }}
            transition={{ duration: 1, repeat: highlighted ? Infinity : 0 }}
            className={`relative w-7 h-7 rounded-md flex items-center justify-center ${
                highlighted ? 'bg-[#0E7A3B]/15 ring-2 ring-[#0E7A3B]' : ''
            }`}
        >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path d="M12 3 v12" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 7 l4-4 4 4" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M6 11 V19 a2 2 0 0 0 2 2 h8 a2 2 0 0 0 2-2 v-8" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
        </motion.div>
    );
}

function ShareSheetScreen({ tapAddToHome }: { tapAddToHome?: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col pt-7"
        >
            <div className="absolute inset-0 bg-black/30" />

            <motion.div
                initial={{ y: 220 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                className="absolute inset-x-1.5 bottom-1.5 rounded-2xl bg-[#F2F4F7] shadow-[0_-8px_24px_rgba(15,26,20,0.18)] overflow-hidden"
            >
                <div className="flex items-center gap-2 p-2.5 bg-white">
                    <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center border border-gray-200">
                        <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[10px] text-gray-900 truncate">MBalit</p>
                        <p className="text-[9px] text-gray-500 truncate">mbalit.app — Options ▾</p>
                    </div>
                </div>

                <div className="flex gap-3 px-2.5 py-2.5 bg-white border-t border-gray-200 overflow-hidden">
                    <FakeAppIcon color="#34C759" letter="W" />
                    <FakeAppIcon color="#FF3B30" letter="M" />
                    <FakeAppIcon color="#5AC8FA" letter="✉" />
                    <FakeAppIcon color="#AF52DE" letter="N" />
                </div>

                <div className="bg-white border-t border-gray-200">
                    <SheetRow icon="📋" label="Copy" />
                    <SheetRow
                        icon={<Plus className="w-3.5 h-3.5" />}
                        label="Add to Home Screen"
                        highlighted={tapAddToHome}
                    />
                    <SheetRow icon="🔖" label="Add Bookmark" />
                </div>

                <div className="bg-white border-t border-gray-200 px-3 py-2 text-center">
                    <span className="text-[11px] font-semibold text-[#007AFF]">Cancel</span>
                </div>
            </motion.div>

            {tapAddToHome && <TapPointer style={{ left: 130, bottom: 88 }} />}
        </motion.div>
    );
}

function FakeAppIcon({ color, letter }: { color: string; letter: string }) {
    return (
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px]"
                style={{ background: color }}
            >
                {letter}
            </div>
            <span className="text-[7px] text-gray-500">App</span>
        </div>
    );
}

function SheetRow({
    icon,
    label,
    highlighted,
}: {
    icon: React.ReactNode;
    label: string;
    highlighted?: boolean;
}) {
    return (
        <motion.div
            animate={highlighted ? { backgroundColor: ['#FFFFFF', '#E8F6EE', '#FFFFFF'] } : {}}
            transition={{ duration: 1.5, repeat: highlighted ? Infinity : 0 }}
            className={`flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 ${
                highlighted ? 'bg-[#E8F6EE]' : ''
            }`}
        >
            <span className={`text-[10px] font-semibold ${highlighted ? 'text-[#0E7A3B]' : 'text-gray-900'}`}>
                {label}
            </span>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] ${
                highlighted ? 'bg-[#0E7A3B] text-white' : 'bg-gray-100 text-gray-700'
            }`}>
                {icon}
            </div>
        </motion.div>
    );
}

function AddModalScreen({ tapAdd }: { tapAdd?: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pt-7"
        >
            <div className="absolute inset-0 bg-black/40" />

            <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 22 }}
                className="absolute inset-x-3 top-9 rounded-xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.2)] overflow-hidden"
            >
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <span className="text-[11px] font-semibold text-[#007AFF]">Cancel</span>
                    <span className="text-[11px] font-bold text-gray-900">Add to Home Screen</span>
                    <motion.span
                        animate={tapAdd ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                        transition={{ duration: 1, repeat: tapAdd ? Infinity : 0 }}
                        className={`text-[11px] font-bold ${tapAdd ? 'text-[#0E7A3B]' : 'text-[#007AFF]'}`}
                    >
                        Add
                    </motion.span>
                </div>

                <div className="flex items-center gap-2.5 p-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <img src="/logo.png" alt="" className="w-10 h-10 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-xs">MBalit</p>
                        <p className="text-[9px] text-gray-500 truncate">mbalit.app</p>
                    </div>
                </div>

                <div className="px-3 pb-2 text-[9px] text-gray-500 leading-snug">
                    A shortcut to MBalit will be added to your Home Screen.
                </div>
            </motion.div>

            {tapAdd && <TapPointer style={{ right: 18, top: 50 }} />}
        </motion.div>
    );
}

function HomeScreen() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pt-7"
            style={{ background: 'linear-gradient(180deg, #BFE3CF 0%, #ECFDF3 60%, #FFFFFF 100%)' }}
        >
            <div className="grid grid-cols-4 gap-2 px-3 pt-2">
                <HomeAppIcon color="#34C759" letter="P" name="Phone" />
                <HomeAppIcon color="#007AFF" letter="✉" name="Mail" />
                <HomeAppIcon color="#AF52DE" letter="🎵" name="Music" />
                <HomeAppIcon color="#FF9500" letter="📷" name="Camera" />

                <HomeAppIcon color="#5AC8FA" letter="🌤" name="Weather" />
                <HomeAppIcon color="#FF3B30" letter="❤" name="Health" />
                <motion.div
                    initial={{ scale: 0, rotate: -10, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 18 }}
                    className="flex flex-col items-center gap-0.5"
                >
                    <div className="relative">
                        <div className="w-9 h-9 rounded-[10px] bg-white shadow-[0_4px_10px_rgba(14,122,59,0.25)] flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
                        </div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.45, type: 'spring', stiffness: 350 }}
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#0E7A3B] flex items-center justify-center"
                        >
                            <Sparkles className="w-2 h-2 text-white" />
                        </motion.div>
                    </div>
                    <span className="text-[7px] font-semibold text-gray-900">MBalit</span>
                </motion.div>
                <HomeAppIcon color="#8E8E93" letter="⚙" name="Settings" />
            </div>

            <div className="absolute inset-x-3 bottom-9 text-center">
                <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-[10px] font-bold text-[#0E7A3B]"
                >
                    Open from your home screen.
                </motion.p>
            </div>

            <div className="absolute inset-x-0 bottom-1.5 h-2.5 flex items-center justify-center">
                <div className="w-16 h-1 rounded-full bg-black/70" />
            </div>
        </motion.div>
    );
}

function HomeAppIcon({ color, letter, name }: { color: string; letter: string; name: string }) {
    return (
        <div className="flex flex-col items-center gap-0.5">
            <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-bold text-[12px]"
                style={{ background: color }}
            >
                {letter}
            </div>
            <span className="text-[7px] text-gray-700">{name}</span>
        </div>
    );
}

function TapPointer({ style }: { style: React.CSSProperties }) {
    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1, 1.05, 1], opacity: [0, 1, 1, 1, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.4 }}
            className="absolute z-40 pointer-events-none"
            style={style}
        >
            <div className="w-7 h-7 rounded-full bg-[#0E7A3B] flex items-center justify-center shadow-[0_4px_12px_rgba(14,122,59,0.45)]">
                <div className="w-2 h-2 rounded-full bg-white" />
            </div>
            <motion.div
                initial={{ scale: 0.6, opacity: 0.5 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-[#0E7A3B]"
            />
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
    installState: InstallState;
    platform: InstallPlatform;
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

export default InstallUI;
