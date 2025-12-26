import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ref, update, get } from 'firebase/database';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase config for server-side
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

// Webhook secret for verifying Modem Pay signatures
const MODEM_PAY_WEBHOOK_SECRET = process.env.MODEM_PAY_WEBHOOK_SECRET || '';

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!MODEM_PAY_WEBHOOK_SECRET) {
        console.warn('Webhook secret not configured, skipping verification');
        return true; // Skip verification in development
    }

    try {
        const expectedSignature = crypto
            .createHmac('sha256', MODEM_PAY_WEBHOOK_SECRET)
            .update(payload)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
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
            case 'payment.completed':
                await handlePaymentSuccess(event.data);
                break;

            case 'payment.failed':
                await handlePaymentFailed(event.data);
                break;

            case 'payment.pending':
                await handlePaymentPending(event.data);
                break;

            default:
                console.log('Unhandled webhook event:', event.event);
        }

        return NextResponse.json({ success: true, received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { success: false, error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

// Handle successful payment
async function handlePaymentSuccess(data: {
    reference?: string;
    id?: string;
    transaction_id?: string;
    amount?: number;
    metadata?: Record<string, unknown>;
}) {
    console.log('Payment successful:', data);

    const paymentId = data.reference || data.id || data.transaction_id;
    if (!paymentId) {
        console.error('No payment ID in webhook data');
        return;
    }

    try {
        // Find and update the job with this payment ID
        const jobsRef = ref(db, 'jobs');
        const snapshot = await get(jobsRef);

        if (snapshot.exists()) {
            const jobs = snapshot.val();

            // Find the job with matching paymentIntentId
            for (const [jobId, job] of Object.entries(jobs)) {
                const jobData = job as { paymentIntentId?: string; paymentStatus?: string };
                if (jobData.paymentIntentId === paymentId ||
                    jobData.paymentIntentId?.includes(paymentId)) {

                    // Update job status
                    const jobRef = ref(db, `jobs/${jobId}`);
                    await update(jobRef, {
                        paymentStatus: 'paid',
                        transactionId: data.transaction_id || paymentId,
                        paidAt: new Date().toISOString(),
                    });

                    console.log('Job updated to paid:', jobId);
                    return;
                }
            }
        }

        console.log('No matching job found for payment:', paymentId);
    } catch (error) {
        console.error('Error processing payment success:', error);
        throw error;
    }
}

// Handle failed payment
async function handlePaymentFailed(data: {
    reference?: string;
    id?: string;
    reason?: string;
}) {
    console.log('Payment failed:', data);

    const paymentId = data.reference || data.id;
    if (!paymentId) return;

    try {
        // Find and update the job
        const jobsRef = ref(db, 'jobs');
        const snapshot = await get(jobsRef);

        if (snapshot.exists()) {
            const jobs = snapshot.val();

            for (const [jobId, job] of Object.entries(jobs)) {
                const jobData = job as { paymentIntentId?: string };
                if (jobData.paymentIntentId === paymentId) {
                    const jobRef = ref(db, `jobs/${jobId}`);
                    await update(jobRef, {
                        paymentStatus: 'failed',
                        failureReason: data.reason || 'Payment failed',
                    });
                    console.log('Job marked as payment failed:', jobId);
                    return;
                }
            }
        }
    } catch (error) {
        console.error('Error processing payment failure:', error);
    }
}

// Handle pending payment
async function handlePaymentPending(data: {
    reference?: string;
    id?: string;
}) {
    console.log('Payment pending:', data);
    // Payment is still pending, no action needed
}

// GET endpoint for webhook verification
export async function GET() {
    return NextResponse.json({
        success: true,
        message: 'Modem Pay webhook endpoint is active',
        timestamp: new Date().toISOString(),
    });
}
