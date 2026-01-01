// Real-Time Payment Negotiation System for Mbalit
// Uses Firebase Realtime Database for instant offer/response

import { ref, set, onValue, off, update, remove, push } from 'firebase/database';
import {
    doc,
    setDoc,
    updateDoc,
    getDoc,
    collection,
    serverTimestamp,
} from 'firebase/firestore';
import { db, realtimeDb } from './firebase';
import { PaymentOffer, PaymentOfferStatus, PickupRequest } from '@/types';
import { calculatePlatformFee, calculateCollectorShare } from './waste-config';
import { creditWallet } from './firestore';
import { creditAgencyWallet } from './agencies';

// =====================================
// PAYMENT OFFER CREATION
// =====================================

// Create a payment offer (customer initiates)
export async function createPaymentOffer(
    requestId: string,
    customerId: string,
    collectorId: string,
    baseAmount: number,
    tipAmount: number = 0
): Promise<string> {
    const totalAmount = baseAmount + tipAmount;

    // Create in Firestore for persistence
    const offerRef = doc(collection(db, 'paymentOffers'));
    const offerData: Omit<PaymentOffer, 'id'> = {
        requestId,
        customerId,
        collectorId,
        baseAmount,
        tipAmount,
        totalAmount,
        status: 'pending',
        createdAt: new Date(),
    };

    await setDoc(offerRef, {
        ...offerData,
        createdAt: serverTimestamp(),
    });

    // Create in Realtime DB for real-time updates
    const realtimeRef = ref(realtimeDb, `paymentOffers/${requestId}`);
    await set(realtimeRef, {
        id: offerRef.id,
        requestId,
        customerId,
        collectorId,
        baseAmount,
        tipAmount,
        totalAmount,
        status: 'pending',
        createdAt: Date.now(),
    });

    // Update request status
    await updateDoc(doc(db, 'requests', requestId), {
        status: 'awaiting_payment',
        tipAmount,
        updatedAt: serverTimestamp(),
    });

    // Notify collector
    await createPaymentNotification(
        collectorId,
        'Payment Offer Received',
        `You have received a payment offer of D${totalAmount.toLocaleString()}`,
        requestId,
        offerRef.id
    );

    return offerRef.id;
}

// =====================================
// PAYMENT OFFER RESPONSE
// =====================================

// Collector responds to payment offer
export async function respondToPaymentOffer(
    offerId: string,
    requestId: string,
    accept: boolean,
    rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const status: PaymentOfferStatus = accept ? 'accepted' : 'rejected';

        // Update Firestore
        await updateDoc(doc(db, 'paymentOffers', offerId), {
            status,
            rejectionReason: rejectionReason || null,
            respondedAt: serverTimestamp(),
        });

        // Update Realtime DB
        const realtimeRef = ref(realtimeDb, `paymentOffers/${requestId}`);
        await update(realtimeRef, {
            status,
            rejectionReason: rejectionReason || null,
            respondedAt: Date.now(),
        });

        if (accept) {
            // Process the payment
            const offerDoc = await getDoc(doc(db, 'paymentOffers', offerId));
            if (offerDoc.exists()) {
                const offer = offerDoc.data();
                await processPaymentAfterAcceptance(
                    requestId,
                    offer.customerId,
                    offer.collectorId,
                    offer.totalAmount,
                    offer.tipAmount
                );
            }
        } else {
            // Notify customer of rejection
            const offerDoc = await getDoc(doc(db, 'paymentOffers', offerId));
            if (offerDoc.exists()) {
                const offer = offerDoc.data();
                await createPaymentNotification(
                    offer.customerId,
                    'Payment Offer Declined',
                    rejectionReason || 'The collector declined your payment offer.',
                    requestId,
                    offerId
                );
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Error responding to payment offer:', error);
        return { success: false, error: 'Failed to respond to offer' };
    }
}

// =====================================
// REAL-TIME SUBSCRIPTIONS
// =====================================

// Subscribe to payment offer updates (for both customer and collector)
export function subscribeToPaymentOffer(
    requestId: string,
    callback: (offer: PaymentOffer | null) => void
): () => void {
    const offerRef = ref(realtimeDb, `paymentOffers/${requestId}`);

    const listener = onValue(offerRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            callback({
                id: data.id,
                requestId: data.requestId,
                customerId: data.customerId,
                collectorId: data.collectorId,
                baseAmount: data.baseAmount,
                tipAmount: data.tipAmount,
                totalAmount: data.totalAmount,
                status: data.status,
                rejectionReason: data.rejectionReason,
                createdAt: new Date(data.createdAt),
                respondedAt: data.respondedAt ? new Date(data.respondedAt) : undefined,
            });
        } else {
            callback(null);
        }
    });

    // Return unsubscribe function
    return () => off(offerRef, 'value', listener);
}

// =====================================
// PAYMENT PROCESSING
// =====================================

// Process payment after collector accepts
async function processPaymentAfterAcceptance(
    requestId: string,
    customerId: string,
    collectorId: string,
    totalAmount: number,
    tipAmount: number
): Promise<void> {
    const platformFee = calculatePlatformFee(totalAmount);
    const collectorShare = calculateCollectorShare(totalAmount);

    // Get request to check for agency
    const requestDoc = await getDoc(doc(db, 'requests', requestId));
    const request = requestDoc.data() as PickupRequest;
    const agencyId = request?.agencyId;

    // Create payment record
    const paymentRef = doc(collection(db, 'payments'));
    await setDoc(paymentRef, {
        requestId,
        customerId,
        collectorId,
        agencyId: agencyId || null,
        amount: totalAmount,
        tipAmount,
        platformFee,
        collectorAmount: collectorShare,
        currency: 'GMD',
        status: 'completed', // Assuming instant payment for now
        method: 'in_app',
        createdAt: serverTimestamp(),
        completedAt: serverTimestamp(),
    });

    // Update request to completed
    await updateDoc(doc(db, 'requests', requestId), {
        status: 'completed',
        finalPrice: totalAmount,
        tipAmount,
        platformFee,
        collectorEarnings: collectorShare,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Credit the appropriate wallet
    if (agencyId) {
        // Payment goes to agency wallet
        await creditAgencyWallet(
            agencyId,
            collectorShare,
            `Pickup completed - Request #${requestId.slice(0, 8)}`,
            requestId
        );
    } else {
        // Payment goes to individual collector wallet
        await creditWallet(
            collectorId,
            collectorShare,
            `Pickup completed - Request #${requestId.slice(0, 8)}`,
            paymentRef.id
        );
    }

    // Record platform fee
    const platformFeeRef = doc(collection(db, 'platformFees'));
    await setDoc(platformFeeRef, {
        paymentId: paymentRef.id,
        requestId,
        amount: platformFee,
        createdAt: serverTimestamp(),
    });

    // Clean up real-time data
    const realtimeRef = ref(realtimeDb, `paymentOffers/${requestId}`);
    await remove(realtimeRef);

    // Notify both parties
    await createPaymentNotification(
        customerId,
        'Payment Successful',
        `Your payment of D${totalAmount.toLocaleString()} was successful. Thank you!`,
        requestId
    );

    await createPaymentNotification(
        collectorId,
        'Payment Received',
        `D${collectorShare.toLocaleString()} has been added to your wallet.`,
        requestId
    );
}

// =====================================
// UPDATE PAYMENT OFFER
// =====================================

// Customer updates their offer (new price or tip)
export async function updatePaymentOffer(
    offerId: string,
    requestId: string,
    newBaseAmount: number,
    newTipAmount: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const totalAmount = newBaseAmount + newTipAmount;

        // Update Firestore
        await updateDoc(doc(db, 'paymentOffers', offerId), {
            baseAmount: newBaseAmount,
            tipAmount: newTipAmount,
            totalAmount,
            status: 'pending', // Reset to pending
            respondedAt: null,
            updatedAt: serverTimestamp(),
        });

        // Update Realtime DB
        const realtimeRef = ref(realtimeDb, `paymentOffers/${requestId}`);
        await update(realtimeRef, {
            baseAmount: newBaseAmount,
            tipAmount: newTipAmount,
            totalAmount,
            status: 'pending',
            respondedAt: null,
            updatedAt: Date.now(),
        });

        // Notify collector of updated offer
        const offerDoc = await getDoc(doc(db, 'paymentOffers', offerId));
        if (offerDoc.exists()) {
            const offer = offerDoc.data();
            await createPaymentNotification(
                offer.collectorId,
                'Updated Payment Offer',
                `New offer: D${totalAmount.toLocaleString()}`,
                requestId,
                offerId
            );
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating payment offer:', error);
        return { success: false, error: 'Failed to update offer' };
    }
}

// =====================================
// CANCEL PAYMENT OFFER
// =====================================

// Customer cancels the offer
export async function cancelPaymentOffer(
    offerId: string,
    requestId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Update Firestore
        await updateDoc(doc(db, 'paymentOffers', offerId), {
            status: 'expired',
            updatedAt: serverTimestamp(),
        });

        // Remove from Realtime DB
        const realtimeRef = ref(realtimeDb, `paymentOffers/${requestId}`);
        await remove(realtimeRef);

        // Update request status back to arrived
        await updateDoc(doc(db, 'requests', requestId), {
            status: 'arrived',
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Error canceling payment offer:', error);
        return { success: false, error: 'Failed to cancel offer' };
    }
}

// =====================================
// HELPER FUNCTIONS
// =====================================

// Create payment-related notification
async function createPaymentNotification(
    userId: string,
    title: string,
    message: string,
    requestId?: string,
    offerId?: string
): Promise<void> {
    const notifRef = doc(collection(db, 'notifications'));
    await setDoc(notifRef, {
        userId,
        title,
        message,
        type: 'payment_offer',
        read: false,
        data: {
            requestId,
            offerId,
        },
        createdAt: serverTimestamp(),
    });
}

// Get current payment offer for a request
export async function getPaymentOffer(requestId: string): Promise<PaymentOffer | null> {
    const realtimeRef = ref(realtimeDb, `paymentOffers/${requestId}`);

    return new Promise((resolve) => {
        onValue(realtimeRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                resolve({
                    id: data.id,
                    requestId: data.requestId,
                    customerId: data.customerId,
                    collectorId: data.collectorId,
                    baseAmount: data.baseAmount,
                    tipAmount: data.tipAmount,
                    totalAmount: data.totalAmount,
                    status: data.status,
                    rejectionReason: data.rejectionReason,
                    createdAt: new Date(data.createdAt),
                    respondedAt: data.respondedAt ? new Date(data.respondedAt) : undefined,
                });
            } else {
                resolve(null);
            }
            off(realtimeRef);
        }, { onlyOnce: true });
    });
}
