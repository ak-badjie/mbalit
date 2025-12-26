import { NextRequest, NextResponse } from 'next/server';
import ModemPay from 'modem-pay';

// Initialize ModemPay SDK with secret key from environment
const modempay = new ModemPay(
    process.env.MODEM_PAY_SECRET_KEY || ''
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { amount, currency = 'GMD', customer_name, customer_email, customer_phone, metadata } = body;

        if (!amount || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid amount' },
                { status: 400 }
            );
        }

        // Create payment intent using the ModemPay SDK
        const intent = await modempay.paymentIntents.create({
            amount,
            currency,
            customer_name,
            customer_email,
            customer_phone,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/cancelled`,
            metadata,
        });

        console.log('ModemPay payment intent created:', intent);

        return NextResponse.json({
            success: true,
            id: intent.data?.id,
            reference: intent.data?.id,
            payment_url: intent.data?.payment_link,
            amount: intent.data?.amount || amount,
            currency: intent.data?.currency || currency,
            status: intent.data?.status || 'pending',
        });
    } catch (error: unknown) {
        console.error('Payment creation error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create payment';
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
