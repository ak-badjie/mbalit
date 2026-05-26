import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
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
    const { amount, currency = 'GMD', customer_name, customer_email, customer_phone, metadata, customerId, collectorId } = data;

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

        const response = await modempay.paymentIntents.create(paymentData);
        const reference = response.data?.id;

        if (reference) {
            // Save to Firestore
            const db = admin.firestore();
            await db.collection('payments').doc(reference).set({
                reference,
                customerId: customerId || 'guest',
                collectorId: collectorId || null,
                amount,
                currency,
                status: 'pending',
                method: 'modem-pay',
                metadata: metadata || {},
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        return {
            success: true,
            paymentUrl: response.data?.payment_link,
            reference: reference
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

    const { amount, network, account_number, beneficiary_name, walletType, orgId } = data;

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
        const db = admin.firestore();
        const isOrg = walletType === 'organization';
        const targetId = isOrg ? orgId : userId;
        
        if (isOrg && !orgId) {
             throw new HttpsError('invalid-argument', 'Organization ID is required for org withdrawals');
        }

        const walletRef = isOrg 
            ? db.collection('organizations').doc(targetId) 
            : db.collection('wallets').doc(targetId);
        
        return await db.runTransaction(async (transaction) => {
            const walletDoc = await transaction.get(walletRef);
            
            if (!walletDoc.exists) {
                throw new HttpsError('failed-precondition', isOrg ? 'Organization not found' : 'Wallet not found');
            }
            
            const currentBalance = isOrg 
                ? (walletDoc.data()?.walletBalance || 0) 
                : (walletDoc.data()?.balance || 0);
                
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
            const idempotencyKey = `withdraw_${targetId}_${Date.now()}`;
            const response = await modempay.transfers.initiate(transferData, idempotencyKey);
            const reference = response.transfer_reference || response.id;

            if (!reference) {
                throw new Error("Failed to get reference from Modem Pay");
            }

            // Deduct the requested amount locally
            const newBalance = currentBalance - amount;
            if (isOrg) {
                 transaction.update(walletRef, {
                    walletBalance: newBalance,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                transaction.update(walletRef, {
                    balance: newBalance,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            // Create a pending transaction record
            const transRef = db.collection('walletTransactions').doc(reference);
            transaction.set(transRef, {
                walletId: targetId,
                walletType: isOrg ? 'organization' : 'individual',
                type: 'withdraw',
                amount: -amount,
                description: `Withdrawal to ${network} (${account_number})`,
                paymentMethod: network,
                phoneNumber: account_number,
                status: 'pending',
                balanceAfter: newBalance,
                reference: reference,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return {
                success: true,
                reference: reference,
                message: 'Withdrawal initiated successfully'
            };
        });
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

    const signature = req.headers['x-modem-signature'] as string;
    
    if (!signature) {
        console.error('Missing Modem Pay signature header');
        res.status(401).send('Missing signature');
        return;
    }

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
        const event = payload;

        console.log('Received Webhook:', event.event, event.payload?.id || event.data?.reference);
        const db = admin.firestore();

        if (event.event === 'charge.succeeded' || event.event === 'payment.success') {
            const data = event.payload || event.data;
            const paymentId = data.reference || data.id || data.transaction_id;
            console.log('Payment succeeded:', paymentId);
            
            // Mark payment as completed
            if (paymentId) {
                const paymentRef = db.collection('payments').doc(paymentId);
                const doc = await paymentRef.get();
                if (doc.exists) {
                    await paymentRef.update({
                        status: 'completed',
                        completedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    
                    // Credit collector if needed, or complete job
                    const paymentData = doc.data();
                    if (paymentData?.metadata?.jobId) {
                        await db.collection('jobs').doc(paymentData.metadata.jobId).update({
                            paymentStatus: 'paid'
                        });
                    }
                }
            }
        } else if (event.event === 'transfer.succeeded') {
            const data = event.payload || event.data;
            const reference = data.reference || data.id;
            console.log('Transfer succeeded:', reference);
            
            if (reference) {
                await db.collection('walletTransactions').doc(reference).update({
                    status: 'completed',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        } else if (event.event === 'transfer.failed') {
            const data = event.payload || event.data;
            const reference = data.reference || data.id;
            console.log('Transfer failed:', reference);
            
            if (reference) {
                await db.runTransaction(async (transaction) => {
                    const transRef = db.collection('walletTransactions').doc(reference);
                    const transDoc = await transaction.get(transRef);
                    
                    if (transDoc.exists && transDoc.data()?.status !== 'failed') {
                        const amount = Math.abs(transDoc.data()?.amount || 0);
                        const walletId = transDoc.data()?.walletId;
                        
                        // Mark transaction as failed
                        transaction.update(transRef, {
                            status: 'failed',
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        
                        // Refund wallet
                        if (walletId) {
                            const walletRef = db.collection('wallets').doc(walletId);
                            const walletDoc = await transaction.get(walletRef);
                            if (walletDoc.exists) {
                                transaction.update(walletRef, {
                                    balance: (walletDoc.data()?.balance || 0) + amount,
                                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                                });
                            }
                        }
                    }
                });
            }
        }

        res.status(200).send('Webhook received successfully');
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(400).send('Webhook Error');
    }
});

// ----------------------------------------------------------------------------
// 4. Send FCM Push Notifications when Notification document is created
// ----------------------------------------------------------------------------
export const sendPushNotification = onDocumentCreated('notifications/{notificationId}', async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const userId = data.userId;
    
    if (!userId) return;

    try {
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) return;
        
        const fcmTokens = userDoc.data()?.fcmTokens;
        
        if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) {
            console.log(`No FCM tokens found for user ${userId}`);
            return;
        }

        const payload = {
            notification: {
                title: data.title || 'Mbalit Notification',
                body: data.message || '',
            },
            data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                type: data.type || 'info',
                ...((data.data || {}) as Record<string, string>)
            }
        };

        const response = await admin.messaging().sendEachForMulticast({
            tokens: fcmTokens,
            ...payload
        });

        console.log(`Successfully sent ${response.successCount} messages; Failed ${response.failureCount}`);
        
        if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token' || resp.error?.code === 'messaging/registration-token-not-registered') {
                    invalidTokens.push(fcmTokens[idx]);
                }
            });
            
            if (invalidTokens.length > 0) {
                // Remove invalid tokens
                await db.collection('users').doc(userId).update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
                });
            }
        }
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
});
