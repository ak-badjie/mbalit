'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, CreditCard, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ref, onValue, off } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (orderId: string) => void;
    paymentUrl: string;
    orderId: string;
    amount: number;
    currency?: string;
}

type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed';

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    paymentUrl,
    orderId,
    amount,
    currency = 'GMD',
}) => {
    const [status, setStatus] = useState<PaymentStatus>('pending');
    const [paymentWindowOpened, setPaymentWindowOpened] = useState(false);
    const popupRef = useRef<Window | null>(null);

    // Open payment in popup window
    const openPaymentPopup = () => {
        const width = 500;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        popupRef.current = window.open(
            paymentUrl,
            'ModemPayPayment',
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        setPaymentWindowOpened(true);
        setStatus('processing');

        // Check if popup was blocked
        if (!popupRef.current || popupRef.current.closed) {
            alert('Popup blocked! Please allow popups for this site to complete payment.');
            return;
        }

        // Monitor popup close
        const checkPopup = setInterval(() => {
            if (popupRef.current?.closed) {
                clearInterval(checkPopup);
                // Popup closed - status will be updated via Realtime DB
            }
        }, 500);
    };

    // Subscribe to payment status in Realtime Database
    useEffect(() => {
        if (!isOpen || !orderId) return;

        const jobRef = ref(realtimeDb, `jobs/${orderId}`);

        const unsubscribe = onValue(jobRef, (snapshot) => {
            const job = snapshot.val();
            if (job) {
                if (job.paymentStatus === 'paid' || job.paymentStatus === 'completed') {
                    setStatus('success');
                    // Close popup if still open
                    if (popupRef.current && !popupRef.current.closed) {
                        popupRef.current.close();
                    }
                    // Delay to show success animation
                    setTimeout(() => {
                        onSuccess(orderId);
                    }, 2000);
                } else if (job.paymentStatus === 'failed') {
                    setStatus('failed');
                }
            }
        });

        return () => {
            off(jobRef);
        };
    }, [isOpen, orderId, onSuccess]);

    // Listen for postMessage from popup window
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Verify origin
            if (event.origin !== window.location.origin) return;

            if (event.data?.type === 'PAYMENT_COMPLETE') {
                console.log('Payment complete message received:', event.data);
                if (event.data.status === 'completed') {
                    setStatus('success');
                    // Close popup if still open
                    if (popupRef.current && !popupRef.current.closed) {
                        popupRef.current.close();
                    }
                    // Delay to show success animation
                    setTimeout(() => {
                        onSuccess(orderId);
                    }, 2000);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [orderId, onSuccess]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (popupRef.current && !popupRef.current.closed) {
                popupRef.current.close();
            }
        };
    }, []);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Close button */}
                    {status !== 'processing' && status !== 'success' && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    )}

                    {/* Wave Animation Header */}
                    <div className="relative h-48 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 overflow-hidden">
                        {/* Wave SVG Animation */}
                        <svg
                            className="absolute bottom-0 left-0 w-full"
                            viewBox="0 0 1440 200"
                            preserveAspectRatio="none"
                        >
                            <motion.path
                                d="M0,100 C280,180 720,20 1440,100 L1440,200 L0,200 Z"
                                fill="white"
                                className="dark:fill-gray-900"
                                animate={{
                                    d: [
                                        "M0,100 C280,180 720,20 1440,100 L1440,200 L0,200 Z",
                                        "M0,100 C280,20 720,180 1440,100 L1440,200 L0,200 Z",
                                        "M0,100 C280,180 720,20 1440,100 L1440,200 L0,200 Z",
                                    ],
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            />
                        </svg>

                        {/* Centered Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                animate={status === 'processing' ? {
                                    scale: [1, 1.1, 1],
                                    rotate: [0, 5, -5, 0]
                                } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                {status === 'pending' && (
                                    <CreditCard className="w-20 h-20 text-white drop-shadow-lg" />
                                )}
                                {status === 'processing' && (
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-full border-4 border-white/30 animate-ping absolute" />
                                        <Loader2 className="w-20 h-20 text-white animate-spin" />
                                    </div>
                                )}
                                {status === 'success' && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 200 }}
                                    >
                                        <CheckCircle className="w-20 h-20 text-white drop-shadow-lg" />
                                    </motion.div>
                                )}
                                {status === 'failed' && (
                                    <XCircle className="w-20 h-20 text-white drop-shadow-lg" />
                                )}
                            </motion.div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {status === 'pending' && (
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Complete Payment
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    Pay {currency} {amount.toLocaleString()} to confirm your pickup
                                </p>

                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Amount</span>
                                        <span className="text-2xl font-bold text-emerald-600">
                                            {currency} {amount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Wave Logo */}
                                <div className="flex items-center justify-center mb-4">
                                    <img
                                        src="/wave.png"
                                        alt="Pay with Wave"
                                        className="h-12 object-contain"
                                    />
                                </div>

                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={openPaymentPopup}
                                    rightIcon={<ExternalLink className="w-5 h-5" />}
                                    className="w-full bg-[#1DC8EE] hover:bg-[#1ab8db]"
                                >
                                    Pay with Wave
                                </Button>

                                <p className="text-xs text-gray-400 mt-4">
                                    A new window will open for secure payment via Wave
                                </p>
                            </div>
                        )}

                        {status === 'processing' && (
                            <div className="text-center py-4">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Processing Payment
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-4">
                                    Please complete payment in the popup window
                                </p>
                                <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    Waiting for confirmation...
                                </div>

                                {paymentWindowOpened && (
                                    <button
                                        onClick={openPaymentPopup}
                                        className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 underline"
                                    >
                                        Popup not showing? Click here to reopen
                                    </button>
                                )}
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="text-center py-4">
                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
                                >
                                    Payment Successful! 🎉
                                </motion.h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Redirecting to tracking page...
                                </p>
                            </div>
                        )}

                        {status === 'failed' && (
                            <div className="text-center py-4">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Payment Failed
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    Something went wrong. Please try again.
                                </p>
                                <div className="flex gap-3">
                                    <Button
                                        variant="secondary"
                                        onClick={onClose}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => {
                                            setStatus('pending');
                                            setPaymentWindowOpened(false);
                                        }}
                                        className="flex-1"
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PaymentModal;
