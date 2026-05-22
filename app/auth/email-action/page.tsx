'use client';

/**
 * Firebase Auth email-action handler.
 *
 * Configured as the action URL in Firebase Console (Authentication →
 * Templates → Password reset → Customize action URL → set to
 * `${origin}/auth/email-action`). Two intents flow through here, both via
 * `mode=resetPassword` from Firebase's perspective:
 *   - intent=verify-recovery → mark recoveryEmail as verified, then send
 *     user back to settings.
 *   - intent=reset-pin       → collect a new 6-digit PIN, write the bcrypt
 *     hash to the user doc, log them in.
 *
 * The intent is carried on the continueUrl we pass to sendPasswordResetEmail
 * (see lib/auth-context.tsx).
 */

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DialPad } from '@/components/ui/dial-pad';

type Phase = 'verifying' | 'set-pin' | 'success-verify' | 'success-reset' | 'error';

function EmailActionInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { verifyRecoveryActionCode, completeRecoveryEmailVerification, completePinResetWithCode } = useAuth();

    const oobCode = searchParams.get('oobCode') || '';
    const mode = searchParams.get('mode') || '';
    // Firebase password-reset email links arrive at the configured action URL
    // with shape `?mode=resetPassword&oobCode=...&apiKey=...&continueUrl=<our url>&lang=...`.
    // The `intent` we set in ActionCodeSettings.url is therefore embedded
    // inside `continueUrl`, NOT at the top level. We accept either location
    // (top-level for direct/test navigation, continueUrl for real email links)
    // and fall back to `reset-pin` so a user with a stale link still gets a
    // safe path (verify-only is the privileged one — never default to it).
    const intent: 'verify-recovery' | 'reset-pin' = (() => {
        const top = searchParams.get('intent');
        if (top === 'verify-recovery' || top === 'reset-pin') return top;
        const cont = searchParams.get('continueUrl');
        if (cont) {
            try {
                const innerIntent = new URL(cont).searchParams.get('intent');
                if (innerIntent === 'verify-recovery' || innerIntent === 'reset-pin') return innerIntent;
            } catch {
                /* malformed continueUrl — fall through to default */
            }
        }
        return 'reset-pin';
    })();

    const [phase, setPhase] = useState<Phase>('verifying');
    const [email, setEmail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 1: verify the oobCode regardless of intent (proves the link is valid).
    useEffect(() => {
        let cancelled = false;
        if (!oobCode || (mode && mode !== 'resetPassword')) {
            setError('This link is invalid or has expired.');
            setPhase('error');
            return;
        }
        (async () => {
            try {
                if (intent === 'verify-recovery') {
                    // For verification we go ahead and consume the code now —
                    // there's nothing else for the user to do.
                    await completeRecoveryEmailVerification(oobCode);
                    if (!cancelled) {
                        setPhase('success-verify');
                    }
                } else {
                    // For PIN reset, just verify (don't consume) so we can
                    // collect the new PIN first.
                    const { email: e } = await verifyRecoveryActionCode(oobCode);
                    if (!cancelled) {
                        setEmail(e);
                        setPhase('set-pin');
                    }
                }
            } catch (err) {
                if (cancelled) return;
                const code = (err as { code?: string })?.code || '';
                const rawMsg = err instanceof Error ? err.message : '';
                let msg = 'This link is invalid or has expired.';
                if (code === 'auth/expired-action-code') msg = 'This link has expired. Please request a new one.';
                else if (code === 'auth/invalid-action-code') msg = 'This link is invalid or has already been used.';
                else if (code === 'auth/user-disabled') msg = 'This account has been disabled.';
                else if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
                    msg = 'Email recovery is not enabled for this app. Please contact support.';
                } else if (rawMsg && !rawMsg.startsWith('Firebase:')) {
                    msg = rawMsg;
                }
                setError(msg);
                setPhase('error');
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [oobCode, mode, intent]);

    const submitNewPin = async (val: string) => {
        if (!/^\d{6}$/.test(val)) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await completePinResetWithCode(oobCode, val);
            setPhase('success-reset');
        } catch (err) {
            const code = (err as { code?: string })?.code || '';
            const rawMsg = err instanceof Error ? err.message : '';
            let msg = 'Could not reset your PIN. Please try again.';
            if (code === 'auth/expired-action-code') msg = 'This link has expired. Please request a new one.';
            else if (code === 'auth/invalid-action-code') msg = 'This link is invalid or has already been used.';
            else if (rawMsg && !rawMsg.startsWith('Firebase:')) msg = rawMsg;
            setError(msg);
            setPhase('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-advance / auto-submit on the PIN dialpad.
    const handlePinChange = (val: string) => {
        setError(null);
        if (pinStep === 'create') {
            setNewPin(val);
            if (val.length === 6) setTimeout(() => setPinStep('confirm'), 200);
        } else {
            setConfirmPin(val);
            if (val.length === 6) {
                if (val !== newPin) {
                    setError('PINs do not match. Please try again.');
                    setConfirmPin('');
                } else {
                    submitNewPin(val);
                }
            }
        }
    };

    // Auto-redirect after success screens.
    useEffect(() => {
        if (phase === 'success-verify') {
            const t = setTimeout(() => router.replace('/dashboard/settings'), 2200);
            return () => clearTimeout(t);
        }
        if (phase === 'success-reset') {
            const t = setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2200);
            return () => clearTimeout(t);
        }
    }, [phase, router]);

    return (
        <div className="min-h-[100dvh] bg-white flex flex-col">
            <div className="flex items-center pt-14 px-6 mb-2">
                <button
                    onClick={() => router.push('/auth')}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100"
                    aria-label="Back to sign in"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
                <div className="flex-1 text-center font-semibold text-gray-900 pr-8">
                    {intent === 'verify-recovery' ? 'Verify recovery email' : 'Reset PIN'}
                </div>
            </div>

            <div className="flex-1 px-6 flex flex-col items-center justify-center pb-safe">
                {phase === 'verifying' && (
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-gray-900 mx-auto mb-4" />
                        <p className="text-gray-500">Checking your link…</p>
                    </div>
                )}

                {phase === 'error' && (
                    <div className="text-center max-w-sm">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <ShieldAlert className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Link problem</h1>
                        <p className="text-gray-500 mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/auth')}
                            className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl"
                        >
                            Back to sign in
                        </button>
                    </div>
                )}

                {phase === 'success-verify' && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                            <Check className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email verified</h1>
                        <p className="text-gray-500">You can now reset your PIN by email if you forget it.</p>
                    </motion.div>
                )}

                {phase === 'success-reset' && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                            <Check className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">PIN updated</h1>
                        <p className="text-gray-500">Signing you in…</p>
                    </motion.div>
                )}

                {phase === 'set-pin' && (
                    <div className="w-full max-w-sm">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {pinStep === 'create' ? 'Create new PIN' : 'Confirm new PIN'}
                            </h1>
                            <p className="text-gray-500">
                                {pinStep === 'create'
                                    ? `Resetting PIN for ${email}`
                                    : 'Enter your new 6-digit PIN again'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-sm text-red-600 text-center">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-4 justify-center mb-10">
                            {[0, 1, 2, 3, 4, 5].map((i) => {
                                const val = pinStep === 'create' ? newPin : confirmPin;
                                return (
                                    <div
                                        key={i}
                                        className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${
                                            val[i]
                                                ? 'border-gray-900 bg-gray-900'
                                                : error
                                                    ? 'border-red-300 bg-red-50'
                                                    : 'border-gray-200 bg-gray-50'
                                        }`}
                                    >
                                        {val[i] ? <div className="w-3 h-3 rounded-full bg-white" /> : null}
                                    </div>
                                );
                            })}
                        </div>

                        <DialPad
                            value={pinStep === 'create' ? newPin : confirmPin}
                            onChange={handlePinChange}
                            maxLength={6}
                            showLetters={true}
                        />

                        {isSubmitting && (
                            <div className="mt-6 flex justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-900" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function EmailActionPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[100dvh] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
                </div>
            }
        >
            <EmailActionInner />
        </Suspense>
    );
}
