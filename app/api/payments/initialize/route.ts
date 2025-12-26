import { NextRequest, NextResponse } from 'next/server';

// Modem Pay configuration (server-side only) - Set in .env
const MODEM_PAY_CLIENT_ID = process.env.MODEM_PAY_CLIENT_ID || '';
const MODEM_PAY_SECRET_KEY = process.env.MODEM_PAY_SECRET_KEY || '';
const MODEM_PAY_API_URL = 'https://api.modem-pay.com'; // Replace with actual Modem Pay API URL

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { amount, currency = 'GMD', metadata } = body;

        if (!amount || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid amount' },
                { status: 400 }
            );
        }

        // Generate unique transaction reference
        const reference = `MBALIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Initialize payment with Modem Pay
        // Note: Replace with actual Modem Pay API implementation
        const paymentResponse = await fetch(`${MODEM_PAY_API_URL}/payments/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MODEM_PAY_SECRET_KEY}`,
                'X-Client-ID': MODEM_PAY_CLIENT_ID,
            },
            body: JSON.stringify({
                amount,
                currency,
                reference,
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/modem-pay`,
                metadata: {
                    ...metadata,
                    source: 'mbalit_web',
                },
            }),
        });

        // For development/testing, simulate a response
        if (!paymentResponse.ok) {
            // Simulate successful payment initialization for testing
            return NextResponse.json({
                success: true,
                data: {
                    reference,
                    payment_url: `https://pay.modem-pay.com/checkout/${reference}`,
                    status: 'pending',
                    amount,
                    currency,
                },
            });
        }

        const paymentData = await paymentResponse.json();

        return NextResponse.json({
            success: true,
            data: paymentData,
        });
    } catch (error) {
        console.error('Payment initialization error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to initialize payment' },
            { status: 500 }
        );
    }
}
