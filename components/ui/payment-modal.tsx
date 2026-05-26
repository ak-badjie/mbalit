'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, CreditCard, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

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

    // Subscribe to payment status in Firestore
    useEffect(() => {
        if (!isOpen || !orderId) return;

        const unsubscribe = onSnapshot(doc(db, 'payments', orderId), (snapshot) => {
            if (snapshot.exists()) {
                const payment = snapshot.data();
                if (payment.status === 'completed' || payment.status === 'paid') {
                    setStatus('success');
                    // Close popup if still open
                    if (popupRef.current && !popupRef.current.closed) {
                        popupRef.current.close();
                    }
                    // Delay to show success animation
                    setTimeout(() => {
                        onSuccess(orderId);
                    }, 2000);
                } else if (payment.status === 'failed') {
                    setStatus('failed');
                }
            }
        });

        return () => unsubscribe();
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
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-md mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Close button */}
                    {status !== 'processing' && status !== 'success' && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors z-10"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    )}

                    {/* Wave Animation Header */}
                    <div className="relative h-32 sm:h-48 shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0E7A3B 0%, #0a5c2c 50%, #074d24 100%)' }}>
                        {/* Wave SVG Animation */}
                        <svg
                            className="absolute bottom-0 left-0 w-full"
                            viewBox="0 0 1440 200"
                            preserveAspectRatio="none"
                        >
                            <motion.path
                                d="M0,100 C280,180 720,20 1440,100 L1440,200 L0,200 Z"
                                fill="white"
                                className=""
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
                                        className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl"
                                    >
                                        <div className="w-20 h-20 -m-2">
                                            <DotLottieReact src="/success.lottie" autoplay loop={false} />
                                        </div>
                                    </motion.div>
                                )}
                                {status === 'failed' && (
                                    <XCircle className="w-20 h-20 text-white drop-shadow-lg" />
                                )}
                            </motion.div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-6 overflow-y-auto">
                        {status === 'pending' && (
                            <div className="text-center">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                                    Complete Payment
                                </h2>
                                <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">
                                    Pay {currency} {amount.toLocaleString()} to confirm your pickup
                                </p>

                                <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Amount</span>
                                        <span className="text-xl sm:text-2xl font-bold" style={{ color: '#0E7A3B' }}>
                                            {currency} {amount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Payment Methods Grid */}
                                <div className="mb-6">
                                    <p className="text-sm text-gray-500  mb-3">
                                        Supported Payment Methods
                                    </p>
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                        {/* Wave */}
                                        <div className="bg-white border border-gray-200 rounded-xl p-2 flex flex-col items-center justify-center">
                                            <img
                                                src="https://www.wave.com/img/nav-logo.png"
                                                alt="Wave"
                                                className="h-8 w-auto object-contain mb-1"
                                            />
                                            <span className="text-[10px] text-gray-500">Wave</span>
                                        </div>

                                        {/* AfriMoney */}
                                        <div className="bg-white border border-gray-200 rounded-xl p-2 flex flex-col items-center justify-center">
                                            <img
                                                src="https://slcb.com/admin/gallery/751_20230511.jpg"
                                                alt="AfriMoney"
                                                className="h-8 w-auto object-contain mb-1"
                                            />
                                            <span className="text-[10px] text-gray-500">AfriMoney</span>
                                        </div>

                                        {/* QMoney */}
                                        <div className="bg-white border border-gray-200 rounded-xl p-2 flex flex-col items-center justify-center">
                                            <img
                                                src="/qmoneylogo.png"
                                                alt="QMoney"
                                                className="h-8 w-auto object-contain mb-1"
                                            />
                                            <span className="text-[10px] text-gray-500">QMoney</span>
                                        </div>

                                        {/* Yonna Wallet */}
                                        <div className="bg-white border border-gray-200 rounded-xl p-2 flex flex-col items-center justify-center">
                                            <img
                                                src="/yonnawalletlogo.png"
                                                alt="Yonna Wallet"
                                                className="h-8 w-auto object-contain mb-1"
                                            />
                                            <span className="text-[10px] text-gray-500">Yonna</span>
                                        </div>

                                        {/* APS Wallet */}
                                        <div className="bg-white border border-gray-200 rounded-xl p-2 flex flex-col items-center justify-center">
                                            <img
                                                src="https://apsinternational.com/wp-content/uploads/2022/05/APS-logo.svg"
                                                alt="APS Wallet"
                                                className="h-8 w-auto object-contain mb-1"
                                            />
                                            <span className="text-[10px] text-gray-500">APS Wallet</span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={openPaymentPopup}
                                    rightIcon={<ExternalLink className="w-5 h-5" />}
                                    className="w-full !bg-[#0E7A3B] hover:!bg-[#0a5c2c] text-white"
                                >
                                    Proceed to Pay
                                </Button>

                                <p className="text-xs text-gray-400 mt-4">
                                    A new window will open for secure payment
                                </p>
                            </div>
                        )}

                        {status === 'processing' && (
                            <div className="text-center py-4">
                                <h2 className="text-2xl font-bold text-gray-900  mb-2">
                                    Processing Payment
                                </h2>
                                <p className="text-gray-500  mb-4">
                                    Please complete payment in the popup window
                                </p>
                                <div className="flex items-center justify-center gap-2 text-sm" style={{ color: '#0E7A3B' }}>
                                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#0E7A3B' }} />
                                    Waiting for confirmation...
                                </div>

                                {paymentWindowOpened && (
                                    <button
                                        onClick={openPaymentPopup}
                                        className="mt-4 text-sm underline" style={{ color: '#0E7A3B' }}
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
                                    className="text-2xl font-bold text-gray-900  mb-2"
                                >
                                    Payment Successful! 🎉
                                </motion.h2>
                                <p className="text-gray-500 ">
                                    Redirecting to tracking page...
                                </p>
                            </div>
                        )}

                        {status === 'failed' && (
                            <div className="text-center py-4">
                                <h2 className="text-2xl font-bold text-gray-900  mb-2">
                                    Payment Failed
                                </h2>
                                <p className="text-gray-500  mb-6">
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
                                        className="flex-1 !bg-[#0E7A3B] hover:!bg-[#0a5c2c]"
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
