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
 * Full-viewport install walkthrough. No scrolling required — the brand block
 * and either the iOS phone mockup or the Android one-tap install card all fit
 * inside a single 100dvh viewport. Background is the MBalit wallpaper, not
 * plain white.
 */
export function InstallUI({ platform, hasPrompt, installState, onInstall }: InstallUIProps) {
    return (
        <div className="relative h-screen-safe overflow-hidden">
            {/* Wallpaper background */}
            <div className="absolute inset-0 -z-0">
                <img
                    src="/illustrations/landing-hero.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/30 to-white/85" />
            </div>

            <div className="relative z-10 flex flex-col h-full">
                {installState === 'accepted' ? (
                    <AcceptedView />
                ) : platform === 'ios' ? (
                    <IosFullScreen />
                ) : platform === 'android' || platform === 'desktop' ? (
                    <PromptFullScreen
                        hasPrompt={hasPrompt}
                        onInstall={onInstall}
                        installState={installState}
                        platform={platform}
                    />
                ) : (
                    <UnknownFullScreen />
                )}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Header used on every variant — fits the brand + "Add to Home Screen"
// callout into a compact, fixed-height block.
// ──────────────────────────────────────────────────────────────────────

function BrandHeader({ subtitle }: { subtitle?: React.ReactNode }) {
    return (
        <div className="px-6 pt-6 sm:pt-8 flex-shrink-0 text-center">
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="flex flex-col items-center"
            >
                <div className="inline-flex items-center gap-2">
                    <img src="/logo.png" alt="MBalit" className="w-10 h-10 object-contain drop-shadow-sm" />
                    <span className="text-2xl font-extrabold tracking-tight text-[#0E7A3B] drop-shadow-sm">
                        MBalit
                    </span>
                </div>
                {subtitle && <div className="mt-3">{subtitle}</div>}
            </motion.div>
        </div>
    );
}

function ShareIconBlue({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className={className}>
            <path d="M12 3 v12" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 7 l4-4 4 4" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M6 11 V19 a2 2 0 0 0 2 2 h8 a2 2 0 0 0 2-2 v-8" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
    );
}

// ──────────────────────────────────────────────────────────────────────
// iOS — full screen layout: header + phone mockup + caption
// ──────────────────────────────────────────────────────────────────────

function IosFullScreen() {
    const [step, setStep] = useState(0);
    const TOTAL = 4;

    useEffect(() => {
        const id = setInterval(() => setStep((s) => (s + 1) % TOTAL), 2600);
        return () => clearInterval(id);
    }, []);

    const captions = [
        { title: 'Tap the Share button', description: 'Find it at the bottom of Safari.' },
        { title: 'Tap “Add to Home Screen”', description: 'Bottom row of the share sheet.' },
        { title: 'Tap “Add” to confirm', description: 'Top right corner of the dialog.' },
        { title: 'You’re done!', description: 'Open MBalit from your home screen.' },
    ];

    return (
        <>
            <BrandHeader
                subtitle={
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur shadow-[0_4px_14px_rgba(15,26,20,0.08)] border border-white">
                        <span className="text-sm font-bold text-[#0F1A14]">Add MBalit to your Home Screen</span>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#E5F2FF]">
                            <ShareIconBlue />
                        </span>
                    </div>
                }
            />

            {/* Phone mockup — flex-1 so it always fills the available middle space */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4">
                <IosInstallMockup step={step} />
            </div>

            {/* Caption + dots — fixed footer */}
            <div className="px-6 pb-6 sm:pb-8 flex-shrink-0">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-center mb-3"
                >
                    <p className="font-bold text-[#0F1A14] text-sm">
                        <span className="text-[#0E7A3B]">{step + 1}.</span> {captions[step].title}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">{captions[step].description}</p>
                </motion.div>

                <div className="flex items-center justify-center gap-1.5 mb-3">
                    {Array.from({ length: TOTAL }).map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setStep(i)}
                            aria-label={`Step ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all ${
                                i === step ? 'w-6 bg-[#0E7A3B]' : 'w-1.5 bg-gray-300'
                            }`}
                        />
                    ))}
                </div>

                <NotInSafariHint />
            </div>
        </>
    );
}

function IosInstallMockup({ step }: { step: number }) {
    return (
        <div
            className="relative bg-[#1A1A1A] rounded-[32px] p-1.5 shadow-[0_20px_50px_rgba(15,26,20,0.22)]"
            style={{ width: 200, height: 340 }}
        >
            <div className="relative w-full h-full bg-[#F2F4F7] rounded-[26px] overflow-hidden">
                <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-1 text-[9px] font-semibold text-gray-900">
                    <span>9:41</span>
                    <span className="absolute left-1/2 -translate-x-1/2 top-0.5 w-14 h-2.5 rounded-full bg-[#1A1A1A]" />
                    <span>📶</span>
                </div>

                <AnimatePresence mode="wait">
                    {step === 0 && <SafariScreen key="safari" tapShare />}
                    {step === 1 && <ShareSheetScreen key="sheet" tapAddToHome />}
                    {step === 2 && <AddModalScreen key="modal" tapAdd />}
                    {step === 3 && <HomeScreen key="home" />}
                </AnimatePresence>
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
            className="absolute inset-0 flex flex-col pt-6"
        >
            <div className="mx-2 my-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 flex items-center gap-1.5 text-[9px] text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0E7A3B]/15 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-[#0E7A3B]" />
                </span>
                <span className="font-semibold text-gray-700">mbalit.app</span>
            </div>

            <div className="flex-1 bg-white flex flex-col items-center justify-center px-3 text-center">
                <img src="/logo.png" alt="" className="w-10 h-10 object-contain mb-1" />
                <span className="font-extrabold text-[#0E7A3B] text-sm leading-none">MBalit</span>
                <span className="text-[8px] text-gray-500 mt-1">Smart Waste. Clean Future.</span>
            </div>

            <div className="relative h-8 bg-[#F8F8F8] border-t border-gray-200 flex items-center justify-around px-2">
                <SafariNavBtn>{'<'}</SafariNavBtn>
                <SafariNavBtn dim>{'>'}</SafariNavBtn>
                <ShareGlyph highlighted={tapShare} />
                <SafariNavBtn>≡</SafariNavBtn>
                <SafariNavBtn>▢</SafariNavBtn>
            </div>

            <div className="h-2 flex items-center justify-center">
                <div className="w-14 h-1 rounded-full bg-black/70" />
            </div>

            {tapShare && <TapPointer style={{ left: 78, bottom: 32 }} />}
        </motion.div>
    );
}

function SafariNavBtn({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
    return <span className={`text-sm ${dim ? 'text-gray-300' : 'text-[#007AFF]'}`}>{children}</span>;
}

function ShareGlyph({ highlighted }: { highlighted?: boolean }) {
    return (
        <motion.div
            animate={highlighted ? { scale: [1, 1.18, 1] } : { scale: 1 }}
            transition={{ duration: 1, repeat: highlighted ? Infinity : 0 }}
            className={`relative w-6 h-6 rounded-md flex items-center justify-center ${
                highlighted ? 'bg-[#0E7A3B]/15 ring-2 ring-[#0E7A3B]' : ''
            }`}
        >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
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
            className="absolute inset-0 pt-6"
        >
            <div className="absolute inset-0 bg-black/30" />

            <motion.div
                initial={{ y: 200 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                className="absolute inset-x-1 bottom-1 rounded-2xl bg-[#F2F4F7] shadow-[0_-8px_24px_rgba(15,26,20,0.18)] overflow-hidden"
            >
                <div className="flex items-center gap-2 p-2 bg-white">
                    <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center border border-gray-200">
                        <img src="/logo.png" alt="" className="w-5 h-5 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[9px] text-gray-900 truncate">MBalit</p>
                        <p className="text-[8px] text-gray-500 truncate">mbalit.app — Options ▾</p>
                    </div>
                </div>

                <div className="flex gap-2 px-2 py-2 bg-white border-t border-gray-200 overflow-hidden">
                    <FakeAppIcon color="#34C759" letter="W" />
                    <FakeAppIcon color="#FF3B30" letter="M" />
                    <FakeAppIcon color="#5AC8FA" letter="✉" />
                    <FakeAppIcon color="#AF52DE" letter="N" />
                </div>

                <div className="bg-white border-t border-gray-200">
                    <SheetRow icon="📋" label="Copy" />
                    <SheetRow
                        icon={<Plus className="w-3 h-3" />}
                        label="Add to Home Screen"
                        highlighted={tapAddToHome}
                    />
                    <SheetRow icon="🔖" label="Add Bookmark" />
                </div>

                <div className="bg-white border-t border-gray-200 px-2 py-1.5 text-center">
                    <span className="text-[10px] font-semibold text-[#007AFF]">Cancel</span>
                </div>
            </motion.div>

            {tapAddToHome && <TapPointer style={{ left: 122, bottom: 78 }} />}
        </motion.div>
    );
}

function FakeAppIcon({ color, letter }: { color: string; letter: string }) {
    return (
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-[9px]"
                style={{ background: color }}
            >
                {letter}
            </div>
            <span className="text-[6px] text-gray-500">App</span>
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
            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-gray-100 last:border-b-0 ${
                highlighted ? 'bg-[#E8F6EE]' : ''
            }`}
        >
            <span className={`text-[9px] font-semibold ${highlighted ? 'text-[#0E7A3B]' : 'text-gray-900'}`}>
                {label}
            </span>
            <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] ${
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
            className="absolute inset-0 pt-6"
        >
            <div className="absolute inset-0 bg-black/40" />

            <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 22 }}
                className="absolute inset-x-2 top-8 rounded-xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.2)] overflow-hidden"
            >
                <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-200">
                    <span className="text-[10px] font-semibold text-[#007AFF]">Cancel</span>
                    <span className="text-[10px] font-bold text-gray-900">Add to Home Screen</span>
                    <motion.span
                        animate={tapAdd ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                        transition={{ duration: 1, repeat: tapAdd ? Infinity : 0 }}
                        className={`text-[10px] font-bold ${tapAdd ? 'text-[#0E7A3B]' : 'text-[#007AFF]'}`}
                    >
                        Add
                    </motion.span>
                </div>

                <div className="flex items-center gap-2 p-2.5">
                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-[11px]">MBalit</p>
                        <p className="text-[8px] text-gray-500 truncate">mbalit.app</p>
                    </div>
                </div>

                <div className="px-2.5 pb-2 text-[8px] text-gray-500 leading-snug">
                    A shortcut to MBalit will be added to your Home Screen.
                </div>
            </motion.div>

            {tapAdd && <TapPointer style={{ right: 12, top: 42 }} />}
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
            className="absolute inset-0 pt-6"
            style={{ background: 'linear-gradient(180deg, #BFE3CF 0%, #ECFDF3 60%, #FFFFFF 100%)' }}
        >
            <div className="grid grid-cols-4 gap-1.5 px-2.5 pt-2">
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
                        <div className="w-8 h-8 rounded-[8px] bg-white shadow-[0_4px_10px_rgba(14,122,59,0.25)] flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="" className="w-7 h-7 object-contain" />
                        </div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.45, type: 'spring', stiffness: 350 }}
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#0E7A3B] flex items-center justify-center"
                        >
                            <Sparkles className="w-1.5 h-1.5 text-white" />
                        </motion.div>
                    </div>
                    <span className="text-[6px] font-semibold text-gray-900">MBalit</span>
                </motion.div>
                <HomeAppIcon color="#8E8E93" letter="⚙" name="Settings" />
            </div>

            <div className="absolute inset-x-2 bottom-7 text-center">
                <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-[9px] font-bold text-[#0E7A3B]"
                >
                    Open from your home screen.
                </motion.p>
            </div>

            <div className="absolute inset-x-0 bottom-1 h-2 flex items-center justify-center">
                <div className="w-14 h-1 rounded-full bg-black/70" />
            </div>
        </motion.div>
    );
}

function HomeAppIcon({ color, letter, name }: { color: string; letter: string; name: string }) {
    return (
        <div className="flex flex-col items-center gap-0.5">
            <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white font-bold text-[10px]"
                style={{ background: color }}
            >
                {letter}
            </div>
            <span className="text-[6px] text-gray-700">{name}</span>
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
            <div className="w-6 h-6 rounded-full bg-[#0E7A3B] flex items-center justify-center shadow-[0_4px_12px_rgba(14,122,59,0.45)]">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
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
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-100">
            <ChevronDown className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0 rotate-180" />
            <p className="text-xs text-amber-800">
                Open this page in <span className="font-semibold">Safari</span> — Add-to-Home-Screen only works there on iOS.
            </p>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Android + desktop — full screen layout with prominent install button
// ──────────────────────────────────────────────────────────────────────

function PromptFullScreen({
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
            <BrandHeader
                subtitle={
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur shadow-[0_4px_14px_rgba(15,26,20,0.08)] border border-white">
                        <Download className="w-3.5 h-3.5 text-[#0E7A3B]" />
                        <span className="text-sm font-bold text-[#0F1A14]">
                            Install MBalit on {platform === 'android' ? 'Android' : 'your computer'}
                        </span>
                    </div>
                }
            />

            <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6">
                <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex flex-col items-center gap-2"
                >
                    <div className="relative">
                        <div className="w-24 h-24 rounded-[22px] bg-white shadow-[0_16px_36px_rgba(14,122,59,0.22)] flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="MBalit icon" className="w-20 h-20 object-contain" />
                        </div>
                        <motion.div
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                            className="absolute -top-1.5 -right-1.5 w-8 h-8 rounded-full bg-[#0E7A3B] flex items-center justify-center"
                        >
                            <Sparkles className="w-4 h-4 text-white" />
                        </motion.div>
                    </div>
                    <p className="font-bold text-base text-[#0F1A14] mt-1">MBalit</p>
                    <p className="text-xs text-gray-600 text-center max-w-[15rem]">
                        Tap install and MBalit pops onto your home screen.
                    </p>
                </motion.div>
            </div>

            <div className="px-6 pb-6 sm:pb-8 space-y-3 flex-shrink-0">
                <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={onInstall}
                    disabled={!hasPrompt || installState === 'prompting'}
                    className="w-full py-4 rounded-2xl bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-bold inline-flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(14,122,59,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {installState === 'prompting' ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            Installing…
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5" />
                            {hasPrompt ? 'Install MBalit' : 'Waiting for your browser…'}
                        </>
                    )}
                </motion.button>

                {installState === 'dismissed' && (
                    <p className="text-xs text-gray-600 text-center">
                        No worries — tap the button above whenever you&apos;re ready.
                    </p>
                )}

                {!hasPrompt && (
                    <p className="text-xs text-gray-600 text-center">
                        Open in <span className="font-semibold">Chrome</span> and tap the <span className="font-semibold">⋮</span> menu →{' '}
                        <span className="font-semibold">Install app</span>.
                    </p>
                )}
            </div>
        </>
    );
}

function UnknownFullScreen() {
    return (
        <>
            <BrandHeader
                subtitle={
                    <p className="text-sm font-bold text-[#0F1A14] mt-2">
                        Add MBalit to your Home Screen
                    </p>
                }
            />
            <div className="flex-1 min-h-0 flex items-center justify-center px-6">
                <div className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white/90 backdrop-blur border border-white shadow-[0_10px_30px_rgba(15,26,20,0.08)]">
                    <img src="/logo.png" alt="MBalit" className="w-16 h-16" />
                    <p className="font-bold text-sm text-[#0F1A14]">MBalit</p>
                    <p className="text-[11px] text-gray-600 text-center max-w-[16rem]">
                        Look for the <span className="font-semibold">“Install app”</span> or{' '}
                        <span className="font-semibold">“Add to Home Screen”</span> option in your browser menu.
                    </p>
                </div>
            </div>
            <div className="h-6 flex-shrink-0" />
        </>
    );
}

function AcceptedView() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring' }}
            className="flex-1 flex flex-col items-center justify-center px-6 text-center"
        >
            <div className="w-20 h-20 rounded-full bg-[#0E7A3B] flex items-center justify-center mb-4 shadow-[0_10px_25px_rgba(14,122,59,0.35)]">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-extrabold text-[#0F1A14]">You&apos;re all set!</h2>
            <p className="text-sm text-gray-700 mt-2 max-w-xs">
                Open MBalit from your home screen to continue.
            </p>
        </motion.div>
    );
}

export default InstallUI;
