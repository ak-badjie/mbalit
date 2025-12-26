'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ref, update } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';

// This page is opened in a POPUP window after payment completes
// It updates the job status and signals the parent window to close
function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const transactionId = searchParams.get('transaction_id');
    const status = searchParams.get('status');

    useEffect(() => {
        const handlePaymentComplete = async () => {
            console.log('Payment complete:', { transactionId, status });

            // Get the pending order from localStorage
            const orderData = localStorage.getItem('mbalit_active_order');
            if (orderData) {
                try {
                    const order = JSON.parse(orderData);
                    const jobId = order.id;

                    if (jobId && status === 'completed') {
                        // Update job status in Firebase
                        const jobRef = ref(realtimeDb, `jobs/${jobId}`);
                        await update(jobRef, {
                            paymentStatus: 'paid',
                            transactionId: transactionId,
                            paidAt: new Date().toISOString(),
                        });
                        console.log('Job updated to paid:', jobId);
                    }
                } catch (error) {
                    console.error('Error updating job:', error);
                }
            }

            // Signal parent window that payment is complete
            if (window.opener) {
                window.opener.postMessage({
                    type: 'PAYMENT_COMPLETE',
                    status: status,
                    transactionId: transactionId,
                }, window.location.origin);

                // Close this popup after a short delay
                setTimeout(() => {
                    window.close();
                }, 1000);
            } else {
                // If no opener (user navigated directly), redirect to tracking
                const orderData = localStorage.getItem('mbalit_active_order');
                if (orderData) {
                    const order = JSON.parse(orderData);
                    if (order.id) {
                        window.location.href = `/track/${order.id}`;
                    }
                }
            }
        };

        handlePaymentComplete();
    }, [transactionId, status]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500">
            <div className="text-center text-white">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
                <p className="text-white/80">Closing this window...</p>
            </div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500">
                <div className="text-center text-white">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Processing payment...</p>
                </div>
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
}
