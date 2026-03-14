'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
    subscribeToPaymentRequests,
    confirmPaymentRequest,
    cancelPaymentRequest,
    PaymentRequest,
} from '@/lib/realtime';
import { processSubscriptionPayment } from '@/lib/firestore';
import { formatPrice } from '@/lib/waste-config';

/**
 * PaymentNotification component - renders as a floating notification
 * when a collector requests payment from the user. Should be included
 * on the user dashboard page.
 */
export default function PaymentNotification() {
    const { user } = useAuth();
    const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
    const [currentRequest, setCurrentRequest] = useState<PaymentRequest | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<'success' | 'cancelled' | null>(null);

    // Listen for incoming payment requests
    useEffect(() => {
        if (!user?.id) return;

        const unsubscribe = subscribeToPaymentRequests(user.id, (requests) => {
            setPaymentRequests(requests);
            if (requests.length > 0 && !currentRequest) {
                setCurrentRequest(requests[0]);
            }
        });

        return () => unsubscribe();
    }, [user?.id, currentRequest]);

    const handleConfirm = async () => {
        if (!currentRequest || !user) return;
        setIsProcessing(true);

        try {
            // Confirm in realtime DB
            await confirmPaymentRequest(user.id, currentRequest.id);

            // Process payment with 70/30 split
            await processSubscriptionPayment(
                currentRequest.collectorId,
                user.id,
                currentRequest.requestedAmount,
                currentRequest.subscriptionId || undefined,
                currentRequest.jobId || undefined
            );

            setResult('success');
            setTimeout(() => {
                setCurrentRequest(null);
                setResult(null);
                // Show next pending if any
                const remaining = paymentRequests.filter(r => r.id !== currentRequest.id);
                if (remaining.length > 0) {
                    setCurrentRequest(remaining[0]);
                }
            }, 2500);
        } catch (err) {
            console.error('Payment confirmation failed:', err);
            alert('Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecline = async () => {
        if (!currentRequest || !user) return;

        try {
            await cancelPaymentRequest(user.id, currentRequest.id);
            setResult('cancelled');
            setTimeout(() => {
                setCurrentRequest(null);
                setResult(null);
                const remaining = paymentRequests.filter(r => r.id !== currentRequest.id);
                if (remaining.length > 0) {
                    setCurrentRequest(remaining[0]);
                }
            }, 1500);
        } catch (err) {
            console.error('Failed to cancel payment request:', err);
        }
    };

    if (!currentRequest) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -100, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -100, scale: 0.8 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="fixed top-4 left-4 right-4 z-50"
            >
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                    {result === 'success' ? (
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                                <Check className="w-6 h-6 text-emerald-600" />
                            </div>
                            <p className="font-bold text-gray-900">Payment Confirmed!</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {formatPrice(currentRequest.requestedAmount)} paid to {currentRequest.collectorName}
                            </p>
                        </div>
                    ) : result === 'cancelled' ? (
                        <div className="p-6 text-center">
                            <p className="font-medium text-gray-600">Payment declined</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/10 rounded-xl">
                                        <DollarSign className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">Payment Request</p>
                                        <p className="text-gray-400 text-xs">from {currentRequest.collectorName}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="p-5 space-y-3">
                                <div className="text-center">
                                    <p className="text-3xl font-black text-gray-900">
                                        {formatPrice(currentRequest.requestedAmount)}
                                    </p>
                                    {currentRequest.requestedAmount !== currentRequest.originalAmount && (
                                        <div className="flex items-center justify-center gap-1 mt-1">
                                            <AlertCircle className="w-3 h-3 text-amber-500" />
                                            <p className="text-xs text-amber-600">
                                                Adjusted from {formatPrice(currentRequest.originalAmount)}
                                                {currentRequest.adjustmentReason && ` · ${currentRequest.adjustmentReason}`}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-500">Collector receives (70%)</span>
                                        <span className="font-medium text-gray-900">
                                            {formatPrice(Math.round(currentRequest.requestedAmount * 0.7 * 100) / 100)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Platform fee (30%)</span>
                                        <span className="text-gray-400">
                                            {formatPrice(Math.round(currentRequest.requestedAmount * 0.3 * 100) / 100)}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-1">
                                    <button
                                        onClick={handleDecline}
                                        disabled={isProcessing}
                                        className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <X className="w-4 h-4" /> Decline
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={isProcessing}
                                        className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                        {isProcessing ? 'Processing...' : 'Confirm & Pay'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
