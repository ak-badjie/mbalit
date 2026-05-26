'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
    subscribeToPaymentRequests,
    PaymentRequest,
} from '@/lib/realtime';
import CustomerPaymentModal from '@/components/ui/customer-payment-modal';

/**
 * PaymentNotification component - renders as a floating notification
 * when a collector requests payment from the user. Should be included
 * on the user dashboard page.
 */
export default function PaymentNotification() {
    const { user } = useAuth();
    const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
    const [currentRequest, setCurrentRequest] = useState<PaymentRequest | null>(null);

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

    if (!currentRequest) return null;

    // Provide the customer details from user context
    return (
        <CustomerPaymentModal
            request={currentRequest}
            customerName={user?.name || 'Customer'}
            customerEmail={user?.email || ''}
            customerPhone={user?.phone || ''}
            onClose={() => setCurrentRequest(null)}
            onPaid={() => setCurrentRequest(null)}
        />
    );
}
