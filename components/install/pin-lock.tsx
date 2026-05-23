'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Shield, LogOut, Fingerprint, ScanFace } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DialPad } from '@/components/ui/dial-pad';
import { hasBiometricCredential, isBiometricSupported, verifyBiometric } from '@/lib/biometric';

const UNLOCKED_SESSION_KEY = 'mbalit_unlocked';

/**
 * Lock screen shown when a returning user re-opens the installed PWA.
 *
 * - If there is no signed-in user, we render `children` so the normal auth
 *   flow (the regular Sign Up / Log In page) takes over.
 * - If there IS a signed-in user but the current browser tab/session hasn't
 *   been unlocked yet, we render the PIN-entry lock screen.
 *
 * The unlock flag lives in sessionStorage so it survives navigation inside
 * the PWA but is cleared when the user closes the PWA / kills the tab.
 * `login()` and `createAccount()` both set this flag, so the first time a
 * brand-new user goes through signup they go straight into the app without
 * an extra PIN prompt.
 */
export function PinLock({ children }: { children: React.ReactNode }) {
    const { user, isLoading, verifyPin, logout } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [unlocked, setUnlocked] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window === 'undefined') return;

        const sync = () => {
            try {
                setUnlocked(window.sessionStorage.getItem(UNLOCKED_SESSION_KEY) === '1');
            } catch {
                /* sessionStorage unavailable — fail open so the user isn't stuck. */
                setUnlocked(true);
            }
        };
        sync();

        // Listen for unlock changes from auth-context (login / createAccount /
        // logout). Same-tab sessionStorage writes don't fire the native
        // 'storage' event, so the AuthProvider emits a custom event we listen
        // for. Without this, the user would see the PIN lock screen
        // immediately after they just entered their PIN on the login page.
        window.addEventListener('mbalit-unlock-changed', sync);
        // Storage event is still useful for cross-tab sync (rare, but cheap).
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener('mbalit-unlock-changed', sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    // Hydration guard so we don't flash the lock screen for an already-unlocked user.
    if (!mounted) return null;
    if (isLoading) return null;
    if (!user) return <>{children}</>;
    if (unlocked) return <>{children}</>;

    return (
        <PinEntry
            uid={user.id}
            phone={user.phone}
            displayName={user.name}
            onUnlock={async (pin) => {
                const ok = await verifyPin(pin);
                if (ok) setUnlocked(true);
                return ok;
            }}
            onBiometricUnlock={async () => {
                const ok = await verifyBiometric(user.id);
                if (ok) {
                    // Biometric is a presence check only — still set the
                    // session unlock flag so the rest of the app knows.
                    try { window.sessionStorage.setItem(UNLOCKED_SESSION_KEY, '1'); } catch { /* noop */ }
                    setUnlocked(true);
                }
                return ok;
            }}
            onSignOut={async () => {
                await logout();
            }}
        />
    );
}

interface PinEntryProps {
    uid: string;
    phone: string;
    displayName?: string;
    onUnlock: (pin: string) => Promise<boolean>;
    onBiometricUnlock: () => Promise<boolean>;
    onSignOut: () => Promise<void>;
}

function PinEntry({ uid, phone, displayName, onUnlock, onBiometricUnlock, onSignOut }: PinEntryProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricBusy, setBiometricBusy] = useState(false);
    const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Check biometric on mount, then auto-prompt once if the user enrolled
    // on this device. If they cancel, the regular PIN entry stays usable.
    useEffect(() => {
        let cancelled = false;
        let promptedOnce = false;
        (async () => {
            if (!hasBiometricCredential(uid)) return;
            const supported = await isBiometricSupported();
            if (cancelled) return;
            if (!supported) return;
            setBiometricAvailable(true);

            // Auto-trigger the OS prompt once on mount for a one-tap unlock,
            // but guard so we don't keep replaying it if the user dismisses.
            if (!promptedOnce) {
                promptedOnce = true;
                tryBiometric();
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid]);

    const tryBiometric = async () => {
        if (biometricBusy) return;
        setBiometricBusy(true);
        setError(null);
        try {
            const ok = await onBiometricUnlock();
            if (!ok) setError(null);
        } finally {
            setBiometricBusy(false);
        }
    };

    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    })();

    const handleChange = async (value: string) => {
        if (submitting) return;
        setPin(value);
        setError(null);
        if (value.length === 6) {
            setSubmitting(true);
            try {
                const ok = await onUnlock(value);
                if (!ok) {
                    setError('Incorrect PIN. Try again.');
                    setPin('');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not unlock right now.');
                setPin('');
            } finally {
                setSubmitting(false);
            }
        }
    };

    return (
        <div className="relative h-screen-safe overflow-hidden">
            {/* Wallpaper background */}
            <div className="absolute inset-0 -z-0">
                <img
                    src="/illustrations/landing-hero.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/35 to-white/85" />
            </div>

            <div className="relative z-10 flex flex-col h-full px-6 pt-6 sm:pt-8 pb-6">
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="flex flex-col items-center text-center flex-shrink-0"
                >
                    <div className="inline-flex items-center gap-2">
                        <img src="/logo.png" alt="MBalit" className="w-10 h-10 object-contain drop-shadow-sm" />
                        <span className="text-2xl font-extrabold tracking-tight text-[#0E7A3B] drop-shadow-sm">
                            MBalit
                        </span>
                    </div>
                </motion.div>

                <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                    <div className="text-center mb-5">
                        <p className="text-sm text-gray-700">{greeting}{displayName ? `, ${displayName.split(' ')[0]}` : ''}</p>
                        <h1 className="text-2xl font-extrabold text-[#0F1A14] mt-1">Enter your PIN</h1>
                        <p className="text-xs text-gray-600 mt-1">Unlock MBalit for {phone}</p>
                    </div>

                    {biometricAvailable && (
                        <button
                            type="button"
                            onClick={tryBiometric}
                            disabled={biometricBusy}
                            className="mb-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#D2F4E1] text-[#0E7A3B] font-bold text-sm shadow-[0_4px_14px_rgba(15,26,20,0.08)] hover:bg-[#F1FAF4] disabled:opacity-60"
                        >
                            {biometricBusy ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isIos ? (
                                <ScanFace className="w-4 h-4" />
                            ) : (
                                <Fingerprint className="w-4 h-4" />
                            )}
                            {isIos ? 'Unlock with Face ID' : 'Unlock with biometrics'}
                        </button>
                    )}

                    {/* PIN boxes */}
                    <div className="flex gap-2.5 justify-center mb-3">
                        {[0, 1, 2, 3, 4, 5].map((i) => {
                            const filled = !!pin[i];
                            const isActive = i === pin.length;
                            return (
                                <div
                                    key={i}
                                    className={`w-11 h-13 sm:w-12 sm:h-14 rounded-xl border-2 flex items-center justify-center transition-all text-xl font-bold
                                        ${error
                                            ? 'border-red-400 bg-red-50 text-red-600'
                                            : isActive && !filled
                                                ? 'border-[#0E7A3B] bg-white text-[#0E7A3B]'
                                                : filled
                                                    ? 'border-[#0E7A3B] bg-white text-[#0F1A14]'
                                                    : 'border-gray-200 bg-white text-gray-300'}
                                    `}
                                >
                                    {filled ? '•' : isActive ? (
                                        <span className="w-px h-6 bg-[#0E7A3B] animate-pulse" />
                                    ) : ''}
                                </div>
                            );
                        })}
                    </div>

                    {error && (
                        <p className="mt-1 mb-2 text-sm text-red-600 text-center">{error}</p>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                        <Shield className="w-3.5 h-3.5 text-[#0E7A3B]" />
                        <span>Never share your PIN with anyone — not even MBalit support.</span>
                    </div>

                    <div className="mt-4 w-full max-w-xs">
                        <DialPad value={pin} onChange={handleChange} maxLength={6} showLetters={false} />
                    </div>

                    {submitting && (
                        <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-600">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0E7A3B]" />
                            Verifying…
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 text-center">
                    <button
                        type="button"
                        onClick={onSignOut}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 hover:bg-white/60"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Not you? Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PinLock;
