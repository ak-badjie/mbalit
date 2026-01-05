'use client';

/**
 * Agency Subscription Management
 * Allows agencies to create subscription plans and users to subscribe
 * Platform takes 30%, agency gets 70%
 */

import {
    doc,
    collection,
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    deleteDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { AgencySubscriptionPlan, UserAgencySubscription } from '@/types';

const PLATFORM_FEE_PERCENTAGE = 0.30; // 30% platform cut
const AGENCY_SHARE_PERCENTAGE = 0.70; // 70% to agency

// ============================================
// SUBSCRIPTION PLAN MANAGEMENT (Agency Owner)
// ============================================

/**
 * Create a new subscription plan for an agency
 */
export async function createSubscriptionPlan(
    agencyId: string,
    planData: {
        name: string;
        description?: string;
        frequency: 'weekly' | 'biweekly' | 'monthly';
        bucketCount: number;
        trashBagCount: number;
        largeBinCount: number;
        price: number;
    }
): Promise<AgencySubscriptionPlan> {
    const platformFee = Math.round(planData.price * PLATFORM_FEE_PERCENTAGE);
    const agencyEarnings = planData.price - platformFee;

    const planRef = await addDoc(collection(db, 'agencySubscriptionPlans'), {
        agencyId,
        name: planData.name,
        description: planData.description || '',
        frequency: planData.frequency,
        bucketCount: planData.bucketCount,
        trashBagCount: planData.trashBagCount,
        largeBinCount: planData.largeBinCount,
        price: planData.price,
        platformFee,
        agencyEarnings,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return {
        id: planRef.id,
        agencyId,
        ...planData,
        platformFee,
        agencyEarnings,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

/**
 * Get all subscription plans for an agency
 */
export async function getAgencyPlans(agencyId: string): Promise<AgencySubscriptionPlan[]> {
    const plansRef = collection(db, 'agencySubscriptionPlans');
    const q = query(plansRef, where('agencyId', '==', agencyId));
    const snapshot = await getDocs(q);

    const plans: AgencySubscriptionPlan[] = [];
    snapshot.forEach((doc) => {
        const data = doc.data();
        plans.push({
            id: doc.id,
            agencyId: data.agencyId,
            name: data.name,
            description: data.description,
            frequency: data.frequency,
            bucketCount: data.bucketCount,
            trashBagCount: data.trashBagCount,
            largeBinCount: data.largeBinCount,
            price: data.price,
            platformFee: data.platformFee,
            agencyEarnings: data.agencyEarnings,
            isActive: data.isActive,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        });
    });

    return plans;
}

/**
 * Update a subscription plan
 */
export async function updateSubscriptionPlan(
    planId: string,
    updates: Partial<Pick<AgencySubscriptionPlan, 'name' | 'description' | 'frequency' | 'bucketCount' | 'trashBagCount' | 'largeBinCount' | 'price' | 'isActive'>>
): Promise<void> {
    const planRef = doc(db, 'agencySubscriptionPlans', planId);

    const updateData: Record<string, unknown> = {
        ...updates,
        updatedAt: serverTimestamp(),
    };

    // Recalculate fees if price changed
    if (updates.price !== undefined) {
        updateData.platformFee = Math.round(updates.price * PLATFORM_FEE_PERCENTAGE);
        updateData.agencyEarnings = updates.price - (updateData.platformFee as number);
    }

    await updateDoc(planRef, updateData);
}

/**
 * Delete a subscription plan
 */
export async function deleteSubscriptionPlan(planId: string): Promise<void> {
    const planRef = doc(db, 'agencySubscriptionPlans', planId);
    await deleteDoc(planRef);
}

// ============================================
// USER SUBSCRIPTIONS
// ============================================

/**
 * Subscribe user to an agency plan
 */
export async function subscribeToAgencyPlan(
    userId: string,
    planId: string
): Promise<UserAgencySubscription> {
    // Get plan details
    const planRef = doc(db, 'agencySubscriptionPlans', planId);
    const planDoc = await getDoc(planRef);

    if (!planDoc.exists()) {
        throw new Error('Plan not found');
    }

    const planData = planDoc.data();

    // Calculate next pickup date based on frequency
    const nextPickupDate = calculateNextPickupDate(planData.frequency);

    const subscriptionRef = await addDoc(collection(db, 'userAgencySubscriptions'), {
        userId,
        agencyId: planData.agencyId,
        planId,
        planName: planData.name,
        status: 'active',
        nextPickupDate: Timestamp.fromDate(nextPickupDate),
        pickupsCompleted: 0,
        totalPaid: 0,
        startedAt: serverTimestamp(),
    });

    return {
        id: subscriptionRef.id,
        userId,
        agencyId: planData.agencyId,
        planId,
        planName: planData.name,
        status: 'active',
        nextPickupDate,
        pickupsCompleted: 0,
        totalPaid: 0,
        startedAt: new Date(),
    };
}

/**
 * Get user's active subscriptions
 */
export async function getUserSubscriptions(userId: string): Promise<UserAgencySubscription[]> {
    const subsRef = collection(db, 'userAgencySubscriptions');
    const q = query(subsRef, where('userId', '==', userId), where('status', '==', 'active'));
    const snapshot = await getDocs(q);

    const subscriptions: UserAgencySubscription[] = [];
    snapshot.forEach((doc) => {
        const data = doc.data();
        subscriptions.push({
            id: doc.id,
            userId: data.userId,
            agencyId: data.agencyId,
            planId: data.planId,
            planName: data.planName,
            status: data.status,
            nextPickupDate: data.nextPickupDate?.toDate() || new Date(),
            pickupsCompleted: data.pickupsCompleted,
            totalPaid: data.totalPaid,
            startedAt: data.startedAt?.toDate() || new Date(),
            pausedAt: data.pausedAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate(),
        });
    });

    return subscriptions;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
    const subRef = doc(db, 'userAgencySubscriptions', subscriptionId);
    await updateDoc(subRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
    });
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(subscriptionId: string): Promise<void> {
    const subRef = doc(db, 'userAgencySubscriptions', subscriptionId);
    await updateDoc(subRef, {
        status: 'paused',
        pausedAt: serverTimestamp(),
    });
}

/**
 * Resume a paused subscription
 */
export async function resumeSubscription(subscriptionId: string): Promise<void> {
    const subRef = doc(db, 'userAgencySubscriptions', subscriptionId);
    const subDoc = await getDoc(subRef);

    if (!subDoc.exists()) {
        throw new Error('Subscription not found');
    }

    const data = subDoc.data();
    const nextPickupDate = calculateNextPickupDate(data.frequency || 'weekly');

    await updateDoc(subRef, {
        status: 'active',
        nextPickupDate: Timestamp.fromDate(nextPickupDate),
        pausedAt: null,
    });
}

/**
 * Get agency's subscribers
 */
export async function getAgencySubscribers(agencyId: string): Promise<UserAgencySubscription[]> {
    const subsRef = collection(db, 'userAgencySubscriptions');
    const q = query(subsRef, where('agencyId', '==', agencyId), where('status', '==', 'active'));
    const snapshot = await getDocs(q);

    const subscriptions: UserAgencySubscription[] = [];
    snapshot.forEach((doc) => {
        const data = doc.data();
        subscriptions.push({
            id: doc.id,
            userId: data.userId,
            agencyId: data.agencyId,
            planId: data.planId,
            planName: data.planName,
            status: data.status,
            nextPickupDate: data.nextPickupDate?.toDate() || new Date(),
            pickupsCompleted: data.pickupsCompleted,
            totalPaid: data.totalPaid,
            startedAt: data.startedAt?.toDate() || new Date(),
        });
    });

    return subscriptions;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateNextPickupDate(frequency: 'weekly' | 'biweekly' | 'monthly'): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
        case 'weekly':
            next.setDate(now.getDate() + 7);
            break;
        case 'biweekly':
            next.setDate(now.getDate() + 14);
            break;
        case 'monthly':
            next.setMonth(now.getMonth() + 1);
            break;
    }

    return next;
}
