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

// Initialize payment with Modem Pay via API route
export async function initializePayment(
    amount: number,
    currency: string = 'GMD',
    metadata?: Record<string, unknown>
): Promise<PaymentIntentResult> {
    try {
        const customer = metadata as { email?: string; phone?: string; name?: string } | undefined;

        // Call our API route to create the payment intent
        const response = await fetch('/api/payments/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount,
                currency,
                customer_name: customer?.name || 'Customer',
                customer_email: customer?.email || '',
                customer_phone: customer?.phone || '',
                metadata: {
                    ...metadata,
                    source: 'mbalit_web',
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create payment');
        }

        const result = await response.json();

        console.log('Payment API raw response:', result);

        // Generate fallback id if API doesn't return one
        const paymentId = result.id || result.reference || `mbalit_${Date.now()}`;

        return {
            id: paymentId,
            status: 'pending',
            paymentUrl: result.payment_url,
            amount: result.amount || amount,
            currency: result.currency || currency,
        };
    } catch (error) {
        console.error('Payment initialization error:', error);
        throw error;
    }
}

// Verify payment status (client-side check)
export async function verifyPayment(paymentIntentId: string): Promise<{ status: string; paid: boolean }> {
    try {
        const response = await fetch(`/api/payments/verify/${paymentIntentId}`);

        if (!response.ok) {
            throw new Error('Failed to verify payment');
        }

        return await response.json();
    } catch (error) {
        console.error('Payment verification error:', error);
        throw error;
    }
}
