// Modem Pay Integration for Mbalit
// Uses the official modem-pay SDK from npm

// Configuration - Keys should be set in .env file
export const MODEM_PAY_CONFIG = {
    publicKey: process.env.NEXT_PUBLIC_MODEM_PAY_PUBLIC_KEY || '',
    secretKey: process.env.MODEM_PAY_SECRET_KEY || '',
    environment: (process.env.NODE_ENV === 'production' ? 'live' : 'test') as 'test' | 'live',
    webhookUrl: '/api/webhooks/modem-pay',
    checkoutUrl: process.env.NODE_ENV === 'production'
        ? 'https://checkout.modempay.com/api/pay'
        : 'https://test.checkout.modempay.com/api/pay',
};

export interface PaymentIntentResult {
    id: string;
    status: 'pending' | 'completed' | 'failed';
    paymentUrl: string;
    amount: number;
    currency: string;
}

// Payment methods supported
export const PAYMENT_METHODS = [
    {
        id: 'wave',
        name: 'Wave',
        icon: '📱',
        description: 'Pay with Wave Mobile Money',
    },
    {
        id: 'orange_money',
        name: 'Orange Money',
        icon: '🍊',
        description: 'Pay with Orange Money',
    },
    {
        id: 'qmoney',
        name: 'QMoney',
        icon: '💰',
        description: 'Pay with QMoney',
    },
    {
        id: 'afrimoney',
        name: 'AfriMoney',
        icon: '🌍',
        description: 'Pay with AfriMoney',
    },
    {
        id: 'card',
        name: 'Credit/Debit Card',
        icon: '💳',
        description: 'Pay with Visa or Mastercard',
    },
];

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

// Initialize payment with Modem Pay via Firebase Functions
export async function initializePayment(
    amount: number,
    currency: string = 'GMD',
    metadata?: Record<string, unknown>
): Promise<PaymentIntentResult> {
    try {
        const customer = metadata as { email?: string; phone?: string; name?: string } | undefined;

        const functions = getFunctions(app);
        const createPayment = httpsCallable(functions, 'createPayment');

        const response = await createPayment({
            amount,
            currency,
            customer_name: customer?.name || 'Customer',
            customer_email: customer?.email || '',
            customer_phone: customer?.phone || '',
            metadata: {
                ...metadata,
                source: 'mbalit_web',
            },
        });

        const result = response.data as any;
        console.log('Payment function result:', result);

        if (!result || !result.success) {
            throw new Error(result?.message || 'Failed to create payment');
        }

        // Generate fallback id if API doesn't return one
        const paymentId = result.id || result.reference || `mbalit_${Date.now()}`;

        return {
            id: paymentId,
            status: 'pending',
            paymentUrl: result.paymentUrl,
            amount: result.amount || amount,
            currency: result.currency || currency,
        };
    } catch (error) {
        console.error('Payment initialization error:', error);
        throw error;
    }
}

