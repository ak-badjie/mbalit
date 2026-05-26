'use client';

import React, { useState } from 'react';
import { X, DollarSign, ArrowRight, MessageSquare, Loader2 } from 'lucide-react';
import {
    PaymentRequest,
    confirmPaymentRequest,
    cancelPaymentRequest,
    counterOfferPaymentRequest,
} from '@/lib/realtime';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface CustomerPaymentModalProps {
    request: PaymentRequest;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    onClose: () => void;
    onPaid: () => void;
}

export default function CustomerPaymentModal({
    request,
    customerName,
    customerEmail,
    customerPhone,
    onClose,
    onPaid,
}: CustomerPaymentModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCounterOffer, setShowCounterOffer] = useState(false);
    const [counterAmount, setCounterAmount] = useState('');
    const [counterReason, setCounterReason] = useState('');
    const [error, setError] = useState('');

    const handlePay = async () => {
        setIsProcessing(true);
        setError('');
        try {
            const functions = getFunctions(app);
            const createPayment = httpsCallable(functions, 'createPayment');

            const response = await createPayment({
                amount: request.requestedAmount,
                currency: 'GMD',
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                customerId: request.customerId,
                collectorId: request.collectorId,
                metadata: {
                    jobId: request.jobId,
                    subscriptionId: request.subscriptionId,
                    paymentRequestId: request.id,
                },
            });

            const data = response.data as any;
            if (data?.success && data?.paymentUrl) {
                // Mark the payment request as confirmed
                await confirmPaymentRequest(request.customerId, request.id);
                // Redirect to Modem Pay checkout
                window.open(data.paymentUrl, '_blank');
                onPaid();
            } else {
                setError('Failed to initiate payment. Please try again.');
            }
        } catch (err: any) {
            console.error('Payment error:', err);
            setError(err.message || 'Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecline = async () => {
        setIsProcessing(true);
        try {
            await cancelPaymentRequest(request.customerId, request.id);
            onClose();
        } catch (err) {
            console.error('Failed to decline:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCounterOffer = async () => {
        const amt = Number(counterAmount.replace(/,/g, ''));
        if (!amt || amt <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        if (amt >= request.requestedAmount) {
            setError('Counter-offer must be less than the requested amount');
            return;
        }
        setIsProcessing(true);
        setError('');
        try {
            await counterOfferPaymentRequest(
                request.customerId,
                request.id,
                amt,
                counterReason
            );
            setShowCounterOffer(false);
            onClose();
        } catch (err: any) {
            console.error('Counter-offer error:', err);
            setError(err.message || 'Failed to send counter-offer');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => !isProcessing && onClose()}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
                {/* Close button */}
                <button
                    onClick={() => !isProcessing && onClose()}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                >
                    <X className="w-4 h-4 text-gray-600" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-[#E8F6EE] flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-[#0E7A3B]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-[#0F1A14]">Payment Request</h3>
                        <p className="text-sm text-gray-500">From {request.collectorName}</p>
                    </div>
                </div>

                {/* Amount breakdown */}
                <div className="bg-[#F9FAFB] rounded-2xl p-4 mb-4 space-y-3">
                    {request.originalAmount !== request.requestedAmount && (
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Original Price</span>
                            <span className="text-sm text-gray-400 line-through">
                                D{request.originalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-[#0F1A14]">Requested Amount</span>
                        <span className="text-xl font-extrabold text-[#0E7A3B]">
                            D{request.requestedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    {request.adjustmentReason && (
                        <div className="pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                                <span className="font-semibold">Reason:</span> {request.adjustmentReason}
                            </p>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {showCounterOffer ? (
                    /* Counter-offer form */
                    <div className="space-y-3 mb-4">
                        <label className="text-sm font-bold text-[#0F1A14] block">Your Offer</label>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-[#0E7A3B] bg-[#F1FAF4]">
                            <span className="text-xl font-extrabold text-[#0E7A3B]">D</span>
                            <input
                                inputMode="numeric"
                                value={counterAmount}
                                onChange={(e) => setCounterAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                                placeholder="0.00"
                                className="flex-1 bg-transparent outline-none text-xl font-extrabold text-[#0F1A14] placeholder-gray-300"
                                autoFocus
                            />
                        </div>
                        <input
                            type="text"
                            value={counterReason}
                            onChange={(e) => setCounterReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0E7A3B]"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowCounterOffer(false)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-sm text-gray-600 hover:bg-gray-50"
                                disabled={isProcessing}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCounterOffer}
                                disabled={isProcessing || !counterAmount}
                                className="flex-1 py-3 rounded-xl bg-[#0F1A14] text-white font-semibold text-sm hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>Send Offer</>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Action buttons */
                    <div className="space-y-2">
                        <button
                            onClick={handlePay}
                            disabled={isProcessing}
                            className="w-full py-3.5 rounded-xl bg-[#0E7A3B] text-white font-bold text-base hover:bg-[#0a6230] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Pay D{request.requestedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setShowCounterOffer(true)}
                            disabled={isProcessing}
                            className="w-full py-3 rounded-xl border-2 border-[#0E7A3B] text-[#0E7A3B] font-semibold text-sm hover:bg-[#F1FAF4] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Counter Offer
                        </button>

                        <button
                            onClick={handleDecline}
                            disabled={isProcessing}
                            className="w-full py-3 rounded-xl text-gray-500 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            Decline
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
