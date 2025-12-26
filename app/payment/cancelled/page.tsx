'use client';

import { useEffect } from 'react';

// This page is opened in a POPUP window when payment is cancelled
// It signals the parent window and closes
export default function PaymentCancelledPage() {
    useEffect(() => {
        // Signal parent window that payment was cancelled
        if (window.opener) {
            window.opener.postMessage({
                type: 'PAYMENT_CANCELLED',
            }, window.location.origin);

            // Close this popup after a short delay
            setTimeout(() => {
                window.close();
            }, 1500);
        } else {
            // If no opener, redirect home
            window.location.href = '/';
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-400 to-gray-600">
            <div className="text-center text-white">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
                <p className="text-white/80">Closing this window...</p>
            </div>
        </div>
    );
}
