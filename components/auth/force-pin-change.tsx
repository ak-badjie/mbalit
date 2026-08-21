'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Loader2, LogOut, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DialPad } from '@/components/ui/dial-pad';

/**
 * ForcePinChange — the gate a driver hits the first time they sign in.
 *
 * An organization admin creates the driver's account with a temporary PIN and
 * reads it out to them. That PIN has been spoken aloud and probably written
 * down, so it must not survive first use: while `user.mustChangePin` is true
 * this component replaces the entire app, and there is no way past it other
 * than choosing a new PIN (or signing out).
 *
 * It sits inside PinLock, so by the time it renders the session is already
 * unlocked and the user has proven they know the temporary PIN — which is why
 * we don't ask for it again here.
 */
export function ForcePinChange({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;
    if (!user) return <>{children}</>;
    if (user.mustChangePin !== true) return <>{children}</>;

    return <PinChangeScreen firstName={user.name?.split(' ')[0]} />;
}

function PinChangeScreen({ firstName }: { firstName?: string }) {
    const { completeForcedPinChange, logout } = useAuth();
    const [stage, setStage] = useState<'create' | 'confirm'>('create');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const current = stage === 'create' ? newPin : confirmPin;

    const handleChange = async (value: string) => {
        if (saving) return;
        setError(null);

        if (stage === 'create') {
            setNewPin(value);
            if (value.length === 6) {
                setTimeout(() => setStage('confirm'), 200);
            }
            return;
        }

        setConfirmPin(value);
        if (value.length !== 6) return;

        if (value !== newPin) {
            setError('Those PINs don’t match. Start again.');
            setNewPin('');
            setConfirmPin('');
            setStage('create');
            return;
        }

        setSaving(true);
        try {
            await completeForcedPinChange(value);
            // The user doc snapshot clears `mustChangePin`, which unmounts
            // this screen and reveals the app underneath.
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save your PIN. Try again.');
            setNewPin('');
            setConfirmPin('');
            setStage('create');
        } finally {
            setSaving(false);
        }
    };

    const goBack = () => {
        setError(null);
        setConfirmPin('');
        setStage('create');
    };

    return (
        <div className="h-screen-safe overflow-hidden bg-white flex flex-col">
            <div className="flex-shrink-0 flex items-center px-5 pt-10 pb-2 safe-area-pt">
                {stage === 'confirm' ? (
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={goBack}
                        className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full hover:bg-gray-50 text-[#0E7A3B]"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </motion.button>
                ) : (
                    <div className="w-10 h-10" />
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-4">
                    <KeyRound className="w-6 h-6" />
                </div>

                <h1 className="text-[26px] font-extrabold text-[#0F1A14] leading-tight">
                    {stage === 'create'
                        ? `Choose your own PIN${firstName ? `, ${firstName}` : ''}`
                        : 'Confirm your new PIN'}
                </h1>
                <p className="text-sm text-gray-500 mt-2 leading-snug max-w-sm">
                    {stage === 'create'
                        ? 'The PIN your organization gave you is temporary. Pick a 6-digit PIN only you know — you’ll use it every time you sign in.'
                        : 'Enter the same 6 digits once more so we know it’s right.'}
                </p>

                <div className="flex gap-2.5 justify-start mt-6 mb-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => {
                        const filled = !!current[i];
                        const isActive = i === current.length;
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
                    <p className="mb-2 text-sm text-red-600">{error}</p>
                )}

                <div className="flex items-start gap-2 mb-4">
                    <Shield className="w-4 h-4 text-[#0E7A3B] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-500">
                        Never share your PIN with anyone — not even your manager or MBalit support.
                    </p>
                </div>

                {saving ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-[#0E7A3B]" />
                        <p className="text-gray-600 font-medium">Saving your PIN…</p>
                    </div>
                ) : (
                    <DialPad value={current} onChange={handleChange} maxLength={6} showLetters={false} />
                )}
            </div>

            <div className="flex-shrink-0 px-5 pb-5 pt-2 safe-area-pb text-center">
                <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Not you? Sign out
                </button>
            </div>
        </div>
    );
}

export default ForcePinChange;
