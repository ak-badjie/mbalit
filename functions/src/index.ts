import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import ModemPay from 'modem-pay';

import * as crypto from 'crypto';

// Initialize Firebase Admin
admin.initializeApp();

// Use environment variables for API Keys
const MODEM_PAY_SECRET_KEY = process.env.MODEM_PAY_SECRET_KEY || '';
const MODEM_PAY_WEBHOOK_SECRET = process.env.MODEM_PAY_WEBHOOK_SECRET || '';

const modempay = new ModemPay(MODEM_PAY_SECRET_KEY);

// ----------------------------------------------------------------------------
// 1. Create Payment Intent (For users paying for subscriptions/pickups)
// ----------------------------------------------------------------------------
export const createPayment = onCall(async (request) => {
    const { data } = request;
    // Requires authentication? We'll leave it open for guest checkout if needed, or check context.auth
    const { amount, currency = 'GMD', customer_name, customer_email, customer_phone, metadata } = data;

    if (!amount || amount <= 0) {
        throw new HttpsError('invalid-argument', 'Invalid amount');
    }

    try {
        const paymentData = {
            amount,
            currency,
            customer_name,
            customer_email,
            customer_phone,
            metadata
        };

        const response = await modempay.payments.create(paymentData);
        return {
            success: true,
            paymentUrl: response.data?.payment_url,
            reference: response.data?.reference
        };
    } catch (error: any) {
        console.error('Payment creation error:', error);
        throw new HttpsError('internal', error.message || 'Failed to create payment');
    }
});

// ----------------------------------------------------------------------------
// 2. Request Withdrawal (Payout via Transfer)
// ----------------------------------------------------------------------------
export const requestWithdrawal = onCall(async (request) => {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to withdraw');
    }

    const { amount, network, account_number, beneficiary_name } = data;

    if (!amount || amount <= 0) {
        throw new HttpsError('invalid-argument', 'Invalid withdrawal amount');
    }
    if (!network || !['wave', 'afrimoney', 'aps'].includes(network.toLowerCase())) {
        throw new HttpsError('invalid-argument', 'Invalid or unsupported network');
    }
    if (!account_number) {
        throw new HttpsError('invalid-argument', 'Account/Phone number is required');
    }

    const userId = auth.uid;

    try {
        // Here you would typically check the user's wallet balance in Firestore
        const db = admin.firestore();
        const walletRef = db.collection('wallets').doc(userId);
        const walletDoc = await walletRef.get();
        
        if (!walletDoc.exists) {
            throw new HttpsError('failed-precondition', 'Wallet not found');
        }
        const currentBalance = walletDoc.data()?.available_balance || 0;
        if (currentBalance < amount) {
            throw new HttpsError('failed-precondition', 'Insufficient balance');
        }

        const transferData = {
            amount,
            currency: 'GMD',
            network,
            account_number,
            beneficiary_name: beneficiary_name || 'Mbalit User'
        };

        // Initiate payout to the user's mobile money account
        const response = await modempay.transfers.initiate(transferData);

        // Deduct the requested amount locally pending settlement
        await walletRef.update({
            available_balance: currentBalance - amount
        });

        return {
            success: true,
            reference: response.data?.reference,
            message: 'Withdrawal initiated successfully'
        };
    } catch (error: any) {
        console.error('Withdrawal error:', error);
        throw new HttpsError('internal', error.message || 'Withdrawal failed');
    }
});

// ----------------------------------------------------------------------------
// 3. Modem Pay Webhook Handler (HTTPS Endpoint)
// ----------------------------------------------------------------------------
export const modemPayWebhook = onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    // Modem Pay uses an HMAC SHA512 signature in the x-modem-signature header
    const signature = req.headers['x-modem-signature'] as string;
    
    if (!signature) {
        console.error('Missing Modem Pay signature header');
        res.status(401).send('Missing signature');
        return;
    }

    // Verify signature using the raw body
    const hash = crypto.createHmac('sha512', MODEM_PAY_WEBHOOK_SECRET)
                       .update(JSON.stringify(req.body))
                       .digest('hex');

    if (hash !== signature) {
        console.error('Invalid signature');
        res.status(401).send('Invalid signature');
        return;
    }

    try {
        const payload = req.body;
        // In production, we should verify the signature. We use the raw request body string.
        // const signature = req.headers['x-modem-signature'] as string;
        // const secret = process.env.MODEM_WEBHOOK_SECRET || '';
        // const event = modempay.webhooks.composeEventDetails(JSON.stringify(payload), signature, secret);

        // For now, we will parse the JSON directly
        const event = payload;

        console.log('Received Webhook:', event.event, event.payload?.id);

        if (event.event === 'charge.succeeded' || event.event === 'payment.success') {
            const data = event.payload || event.data;
            const paymentId = data.reference || data.id || data.transaction_id;
            console.log('Payment succeeded:', paymentId);
            // Process the successful payment (e.g., mark job as paid in Firestore)
            // ...
        } else if (event.event === 'transfer.succeeded') {
            const data = event.payload || event.data;
            console.log('Transfer succeeded:', data.id);
            // Update withdrawal status to successful
            // ...
        } else if (event.event === 'transfer.failed') {
            const data = event.payload || event.data;
            console.log('Transfer failed:', data.id);
            // Refund the user's wallet
            // ...
        }

        res.status(200).send('Webhook received successfully');
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(400).send('Webhook Error');
    }
});
