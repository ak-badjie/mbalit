'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Check, Loader2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

/**
 * Settings card that lets users add, verify, resend, or remove a recovery
 * email. The recovery email unlocks the self-service "Email me a reset link"
 * option in the Forgot-PIN flow. See lib/auth-context.tsx for the underlying
 * Firebase Auth integration.
 */
export function RecoveryEmailSection() {
    const { user, addRecoveryEmail, resendRecoveryEmailVerification, removeRecoveryEmail } = useAuth();
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState<null | 'add' | 'resend' | 'remove'>(null);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);

    if (!user) return null;

    const onFile = !!user.recoveryEmail;
    const verified = !!user.recoveryEmailVerified;

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setInfo(null);
        setBusy('add');
        try {
            await addRecoveryEmail(email);
            setInfo(`Verification link sent to ${email.trim().toLowerCase()}. Check your inbox.`);
            setEmail('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add recovery email.');
        } finally {
            setBusy(null);
        }
    };

    const handleResend = async () => {
        setError(null);
        setInfo(null);
        setBusy('resend');
        try {
            await resendRecoveryEmailVerification();
            setInfo(`Verification link resent to ${user.recoveryEmail}.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not resend verification email.');
        } finally {
            setBusy(null);
        }
    };

    const handleRemove = async () => {
        setError(null);
        setInfo(null);
        if (!window.confirm('Remove your recovery email? You will no longer be able to reset your PIN by email.')) {
            return;
        }
        setBusy('remove');
        try {
            await removeRecoveryEmail();
            setInfo('Recovery email removed.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not remove recovery email.');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4">
                Recovery email
            </h3>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-gray-100 text-gray-600">
                        <Mail className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900">
                            {onFile ? user.recoveryEmail : 'No recovery email on file'}
                        </p>
                        <p className="text-sm text-gray-500">
                            {onFile
                                ? verified
                                    ? 'Verified — you can reset your PIN by email.'
                                    : 'Not verified yet. Click the link we sent you.'
                                : 'Add an email so you can reset your PIN yourself if you forget it.'}
                        </p>
                    </div>
                    {onFile && verified && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                            <Check className="w-3 h-3" /> Verified
                        </span>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}
                {info && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <p className="text-sm text-emerald-700">{info}</p>
                    </div>
                )}

                {!onFile && (
                    <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
                        <input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                        />
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            type="submit"
                            disabled={busy === 'add' || !email}
                            className="px-4 py-3 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-50 flex items-center justify-center min-w-28"
                        >
                            {busy === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send link'}
                        </motion.button>
                    </form>
                )}

                {onFile && (
                    <div className="flex flex-wrap gap-2">
                        {!verified && (
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleResend}
                                disabled={busy === 'resend'}
                                className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {busy === 'resend' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Resend verification'}
                            </motion.button>
                        )}
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={handleRemove}
                            disabled={busy === 'remove'}
                            className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-gray-50"
                        >
                            {busy === 'remove' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <X className="w-4 h-4" /> Remove
                                </>
                            )}
                        </motion.button>
                    </div>
                )}
            </div>
        </div>
    );
}
