'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    DollarSign,
    Check,
    XCircle,
    Loader2,
    Plus,
    Minus,
    Sparkles,
    ThumbsUp,
    ThumbsDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/waste-config';
import {
    createPaymentOffer,
    updatePaymentOffer,
    respondToPaymentOffer,
    subscribeToPaymentOffer,
    cancelPaymentOffer,
} from '@/lib/payment-negotiation';
import { PaymentOffer } from '@/types';

// =====================================
// CUSTOMER SIDE - Send Payment Offer
// =====================================

interface CustomerPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    requestId: string;
    collectorId: string;
    customerId: string;
    baseAmount: number;
}

export const CustomerPaymentModal: React.FC<CustomerPaymentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    requestId,
    collectorId,
    customerId,
    baseAmount,
}) => {
    const [tipAmount, setTipAmount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentOffer, setCurrentOffer] = useState<PaymentOffer | null>(null);
    const [offerId, setOfferId] = useState<string | null>(null);

    const tipPresets = [0, 25, 50, 100, 200];
    const totalAmount = baseAmount + tipAmount;

    // Subscribe to offer updates
    useEffect(() => {
        if (!requestId || !isOpen) return;

        const unsubscribe = subscribeToPaymentOffer(requestId, (offer) => {
            setCurrentOffer(offer);
            if (offer?.id) setOfferId(offer.id);

            // If accepted, trigger success
            if (offer?.status === 'accepted') {
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            }
        });

        return () => unsubscribe();
    }, [requestId, isOpen, onSuccess]);

    const handleSendOffer = async () => {
        setIsSubmitting(true);
        try {
            if (offerId && currentOffer?.status === 'rejected') {
                // Update existing offer after rejection
                await updatePaymentOffer(offerId, requestId, baseAmount, tipAmount);
            } else if (!currentOffer) {
                // Create new offer
                const id = await createPaymentOffer(
                    requestId,
                    customerId,
                    collectorId,
                    baseAmount,
                    tipAmount
                );
                setOfferId(id);
            }
        } catch (error) {
            console.error('Failed to send offer:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async () => {
        if (offerId) {
            await cancelPaymentOffer(offerId, requestId);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white">
                        <button
                            onClick={handleCancel}
                            className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold">Complete Payment</h2>
                        <p className="text-emerald-100 text-sm mt-1">
                            Confirm your payment to the collector
                        </p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Offer Status */}
                        {currentOffer?.status === 'pending' && (
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800"
                            >
                                <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                                <div>
                                    <p className="font-medium text-amber-800 dark:text-amber-200">
                                        Waiting for collector
                                    </p>
                                    <p className="text-sm text-amber-600 dark:text-amber-400">
                                        Your offer of {formatPrice(currentOffer.totalAmount)} is pending
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {currentOffer?.status === 'accepted' && (
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800"
                            >
                                <Check className="w-6 h-6 text-emerald-600" />
                                <div>
                                    <p className="font-medium text-emerald-800 dark:text-emerald-200">
                                        Payment Accepted! 🎉
                                    </p>
                                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                        Transaction complete. Thank you!
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {currentOffer?.status === 'rejected' && (
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800"
                            >
                                <div className="flex items-center gap-3">
                                    <XCircle className="w-5 h-5 text-red-600" />
                                    <p className="font-medium text-red-800 dark:text-red-200">
                                        Offer Declined
                                    </p>
                                </div>
                                {currentOffer.rejectionReason && (
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                                        "{currentOffer.rejectionReason}"
                                    </p>
                                )}
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    Adjust your offer and try again.
                                </p>
                            </motion.div>
                        )}

                        {/* Price breakdown */}
                        {(!currentOffer || currentOffer.status === 'rejected') && (
                            <>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Service Fee</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {formatPrice(baseAmount)}
                                        </span>
                                    </div>
                                </div>

                                {/* Tip Selector */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            Add a tip (optional)
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {tipPresets.map((preset) => (
                                            <button
                                                key={preset}
                                                onClick={() => setTipAmount(preset)}
                                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tipAmount === preset
                                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {preset === 0 ? 'No tip' : `D${preset}`}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom tip input */}
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <button
                                            onClick={() => setTipAmount(Math.max(0, tipAmount - 25))}
                                            className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                                        >
                                            <Minus size={18} />
                                        </button>
                                        <div className="flex-1 text-center">
                                            <span className="text-sm text-gray-500">Custom tip</span>
                                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                                {formatPrice(tipAmount)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setTipAmount(tipAmount + 25)}
                                            className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                            Total Payment
                                        </span>
                                        <span className="text-2xl font-bold text-emerald-600">
                                            {formatPrice(totalAmount)}
                                        </span>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <Button
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                    onClick={handleSendOffer}
                                    isLoading={isSubmitting}
                                    leftIcon={<DollarSign size={20} />}
                                >
                                    {currentOffer?.status === 'rejected'
                                        ? 'Send New Offer'
                                        : 'Send Payment Offer'}
                                </Button>
                            </>
                        )}

                        {currentOffer?.status === 'pending' && (
                            <Button
                                variant="ghost"
                                size="lg"
                                fullWidth
                                onClick={handleCancel}
                            >
                                Cancel Offer
                            </Button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// =====================================
// COLLECTOR SIDE - Accept/Reject Offer
// =====================================

interface CollectorPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    requestId: string;
}

export const CollectorPaymentModal: React.FC<CollectorPaymentModalProps> = ({
    isOpen,
    onClose,
    onComplete,
    requestId,
}) => {
    const [currentOffer, setCurrentOffer] = useState<PaymentOffer | null>(null);
    const [isResponding, setIsResponding] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

    // Subscribe to offer updates
    useEffect(() => {
        if (!requestId || !isOpen) return;

        const unsubscribe = subscribeToPaymentOffer(requestId, (offer) => {
            setCurrentOffer(offer);

            // If accepted, close after delay
            if (offer?.status === 'accepted') {
                setTimeout(() => {
                    onComplete();
                }, 1500);
            }
        });

        return () => unsubscribe();
    }, [requestId, isOpen, onComplete]);

    const handleAccept = async () => {
        if (!currentOffer) return;
        setIsResponding(true);
        try {
            await respondToPaymentOffer(currentOffer.id, requestId, true);
        } catch (error) {
            console.error('Failed to accept offer:', error);
        } finally {
            setIsResponding(false);
        }
    };

    const handleReject = async () => {
        if (!currentOffer) return;
        setIsResponding(true);
        try {
            await respondToPaymentOffer(
                currentOffer.id,
                requestId,
                false,
                rejectionReason || 'Offer too low'
            );
            setShowRejectForm(false);
            setRejectionReason('');
        } catch (error) {
            console.error('Failed to reject offer:', error);
        } finally {
            setIsResponding(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-5 text-white">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold">Payment Offer</h2>
                        <p className="text-purple-100 text-sm mt-1">
                            Customer wants to complete payment
                        </p>
                    </div>

                    <div className="p-6 space-y-6">
                        {!currentOffer && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                            </div>
                        )}

                        {currentOffer?.status === 'pending' && !showRejectForm && (
                            <>
                                {/* Offer Details */}
                                <div className="text-center space-y-2">
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Customer is offering
                                    </p>
                                    <p className="text-4xl font-bold text-gray-900 dark:text-white">
                                        {formatPrice(currentOffer.totalAmount)}
                                    </p>
                                    {currentOffer.tipAmount > 0 && (
                                        <p className="text-sm text-emerald-600">
                                            Includes D{currentOffer.tipAmount} tip! 🎉
                                        </p>
                                    )}
                                </div>

                                {/* Breakdown */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Base amount</span>
                                        <span className="text-gray-900 dark:text-white">
                                            {formatPrice(currentOffer.baseAmount)}
                                        </span>
                                    </div>
                                    {currentOffer.tipAmount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Tip</span>
                                            <span className="text-emerald-600 font-medium">
                                                +{formatPrice(currentOffer.tipAmount)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            Your earnings (70%)
                                        </span>
                                        <span className="font-bold text-emerald-600">
                                            {formatPrice(Math.round(currentOffer.totalAmount * 0.7))}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="ghost"
                                        size="lg"
                                        onClick={() => setShowRejectForm(true)}
                                        leftIcon={<ThumbsDown size={18} />}
                                        className="border border-red-200 text-red-600 hover:bg-red-50"
                                    >
                                        Decline
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={handleAccept}
                                        isLoading={isResponding}
                                        leftIcon={<ThumbsUp size={18} />}
                                    >
                                        Accept
                                    </Button>
                                </div>
                            </>
                        )}

                        {currentOffer?.status === 'pending' && showRejectForm && (
                            <>
                                <div className="space-y-3">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        Why are you declining?
                                    </p>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="e.g., Amount too low for the service"
                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 resize-none"
                                        rows={3}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="ghost"
                                        size="lg"
                                        onClick={() => setShowRejectForm(false)}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={handleReject}
                                        isLoading={isResponding}
                                        className="bg-red-500 hover:bg-red-600"
                                    >
                                        Confirm Decline
                                    </Button>
                                </div>
                            </>
                        )}

                        {currentOffer?.status === 'accepted' && (
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center py-6"
                            >
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    Payment Complete! 🎉
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {formatPrice(Math.round(currentOffer.totalAmount * 0.7))} added to your wallet
                                </p>
                            </motion.div>
                        )}

                        {currentOffer?.status === 'rejected' && (
                            <div className="text-center py-6">
                                <p className="text-gray-500 dark:text-gray-400">
                                    Waiting for customer to send a new offer...
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CustomerPaymentModal;
