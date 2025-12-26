import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Webhook secret for verifying Modem Pay signatures
const MODEM_PAY_WEBHOOK_SECRET = process.env.MODEM_PAY_WEBHOOK_SECRET || '';

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!MODEM_PAY_WEBHOOK_SECRET) {
        console.warn('Webhook secret not configured, skipping verification');
        return true; // Skip verification in development
    }

    const expectedSignature = crypto
        .createHmac('sha256', MODEM_PAY_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

export async function POST(request: NextRequest) {
    try {
        const payload = await request.text();
        const signature = request.headers.get('x-modem-pay-signature') || '';

        // Verify signature in production
        if (process.env.NODE_ENV === 'production') {
            if (!verifyWebhookSignature(payload, signature)) {
                console.error('Invalid webhook signature');
                return NextResponse.json(
                    { success: false, error: 'Invalid signature' },
                    { status: 401 }
                );
            }
        }

        const event = JSON.parse(payload);

        console.log('Received Modem Pay webhook:', event);

        // Handle different event types
        switch (event.event) {
            case 'payment.success':
                await handlePaymentSuccess(event.data);
                break;

            case 'payment.failed':
                await handlePaymentFailed(event.data);
                break;

            case 'payment.pending':
                await handlePaymentPending(event.data);
                break;

            default:
                console.log('Unhandled event type:', event.event);
        }

        return NextResponse.json({ success: true, received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json(
            { success: false, error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

// Handle successful payment
async function handlePaymentSuccess(data: {
    reference: string;
    amount: number;
    transaction_id: string;
    metadata?: Record<string, unknown>;
}) {
    console.log('Payment successful:', data);

    const { reference, amount, transaction_id, metadata } = data;

    // Import Firebase Admin SDK functions dynamically
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');

    // Initialize Firebase Admin if not already initialized
    if (getApps().length === 0) {
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    }

    const adminDb = getFirestore();

    try {
        // 1. Update payment status in Firestore
        await adminDb.collection('payments').doc(reference).update({
            status: 'completed',
            transactionId: transaction_id,
            completedAt: FieldValue.serverTimestamp(),
        });

        // 2. Get payment details to find collector
        const paymentDoc = await adminDb.collection('payments').doc(reference).get();
        const paymentData = paymentDoc.data();

        if (paymentData?.collectorId) {
            // 3. Credit collector's wallet (after platform fee)
            const platformFee = amount * 0.10; // 10% platform fee
            const collectorAmount = amount - platformFee;

            const walletRef = adminDb.collection('wallets').doc(paymentData.collectorId);
            const walletDoc = await walletRef.get();

            if (walletDoc.exists) {
                await walletRef.update({
                    balance: FieldValue.increment(collectorAmount),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            } else {
                await walletRef.set({
                    balance: collectorAmount,
                    currency: 'GMD',
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }

            // 4. Record wallet transaction
            await adminDb.collection('walletTransactions').add({
                walletId: paymentData.collectorId,
                type: 'credit',
                amount: collectorAmount,
                description: `Payment for pickup #${paymentData.pickupRequestId || reference}`,
                transactionId: transaction_id,
                createdAt: FieldValue.serverTimestamp(),
            });

            // 5. Update pickup request status
            if (paymentData.pickupRequestId) {
                await adminDb.collection('pickupRequests').doc(paymentData.pickupRequestId).update({
                    status: 'paid',
                    paidAt: FieldValue.serverTimestamp(),
                });
            }
        }

        console.log('Payment processed successfully:', reference);
    } catch (error) {
        console.error('Error processing payment success:', error);
        throw error;
    }
}

// Handle failed payment
async function handlePaymentFailed(data: {
    reference: string;
    reason: string;
}) {
    console.log('Payment failed:', data);

    // TODO: Implement actual logic
    // 1. Update payment status in database
    // 2. Notify customer of failed payment
    // 3. Allow retry
}

// Handle pending payment
async function handlePaymentPending(data: {
    reference: string;
}) {
    console.log('Payment pending:', data);

    // TODO: Implement actual logic
    // 1. Update payment status
    // 2. Set timeout for expiration
}

// Also handle GET for webhook test/verification
export async function GET() {
    return NextResponse.json({
        success: true,
        message: 'Modem Pay webhook endpoint is active',
        timestamp: new Date().toISOString(),
    });
}
