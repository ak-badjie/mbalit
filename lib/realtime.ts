// Firebase Realtime Database utilities for live tracking
import { ref, set, onValue, off, update, get, push, serverTimestamp, runTransaction, query, orderByChild, equalTo } from 'firebase/database';
import { realtimeDb } from './firebase';
import { GeoLocation } from '@/types';

// ============================================
// COLLECTOR LOCATION TRACKING
// ============================================

// Update collector's live location (called every few seconds when online)
export async function updateCollectorLocation(
    collectorId: string,
    location: GeoLocation
): Promise<void> {
    const locationRef = ref(realtimeDb, `collectors/${collectorId}/location`);
    await set(locationRef, {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: location.formattedAddress || '',
        timestamp: serverTimestamp(),
    });
}

// Update collector's online status
export async function setCollectorOnlineStatus(
    collectorId: string,
    isOnline: boolean
): Promise<void> {
    const statusRef = ref(realtimeDb, `collectors/${collectorId}/status`);
    await set(statusRef, {
        online: isOnline,
        lastSeen: serverTimestamp(),
    });
}

// Subscribe to a collector's live location (for customer tracking)
export function subscribeToCollectorLocation(
    collectorId: string,
    callback: (location: GeoLocation | null) => void
): () => void {
    const locationRef = ref(realtimeDb, `collectors/${collectorId}/location`);

    const unsubscribe = onValue(locationRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            callback({
                lat: data.lat,
                lng: data.lng,
                formattedAddress: data.formattedAddress,
            });
        } else {
            callback(null);
        }
    });

    // Return cleanup function
    return () => off(locationRef);
}

// ============================================
// JOB MANAGEMENT
// ============================================

export interface RealtimeJob {
    id: string;
    customerId: string;
    customerEmail: string;
    customerPhone: string;
    customerName?: string;
    customerProfileImage?: string;
    collectorId?: string;
    collectorName?: string;
    collectorPhone?: string;
    wasteType?: string; // Legacy single type, optional
    wasteTypes?: string[]; // New multi-select array
    wasteSize?: string; // Legacy, optional
    bucketCount?: number;
    largeBinCount?: number;
    pickupLocation: GeoLocation;
    plusCode?: string;
    manualAddress?: string;
    amount: number;
    tipAmount?: number;
    paymentStatus: 'pending' | 'paid' | 'failed';
    paymentIntentId?: string;
    status: 'pending' | 'assigned' | 'accepted' | 'arrived' | 'en_route' | 'in_progress' | 'awaiting_payment' | 'completed' | 'cancelled';
    createdAt: object;
    assignedAt?: object;
    completedAt?: object;
}

// Create a new job (after payment success)
export async function createJob(jobData: Omit<RealtimeJob, 'id' | 'createdAt'>): Promise<string> {
    const jobsRef = ref(realtimeDb, 'jobs');
    const newJobRef = push(jobsRef);

    await set(newJobRef, {
        ...jobData,
        id: newJobRef.key,
        createdAt: serverTimestamp(),
    });

    return newJobRef.key!;
}

// Subscribe to job updates (for both customer and collector)
export function subscribeToJob(
    jobId: string,
    callback: (job: RealtimeJob | null) => void
): () => void {
    const jobRef = ref(realtimeDb, `jobs/${jobId}`);

    const unsubscribe = onValue(jobRef, (snapshot) => {
        callback(snapshot.val());
    });

    return () => off(jobRef);
}

// Update job status
export async function updateJobStatus(
    jobId: string,
    status: RealtimeJob['status'],
    additionalData?: Partial<RealtimeJob>
): Promise<void> {
    const jobRef = ref(realtimeDb, `jobs/${jobId}`);
    await update(jobRef, {
        status,
        ...additionalData,
        ...(status === 'completed' ? { completedAt: serverTimestamp() } : {}),
    });
}

// Assign collector to job — uses an atomic transaction so that if two
// collectors hit "Accept" simultaneously, exactly one wins.
// Returns true on successful claim, false if another collector got there first.
export async function assignCollectorToJob(
    jobId: string,
    collectorId: string,
    collectorName?: string,
    collectorPhone?: string
): Promise<boolean> {
    const jobRef = ref(realtimeDb, `jobs/${jobId}`);

    const result = await runTransaction(jobRef, (currentJob) => {
        if (!currentJob) {
            // Job doesn't exist (or already removed) — abort by returning undefined
            return;
        }
        // If already claimed by someone else, abort the transaction
        if (currentJob.collectorId && currentJob.collectorId !== collectorId) {
            return;
        }
        // If status has moved past 'pending'/'assigned' (e.g., cancelled, completed), abort
        if (currentJob.status !== 'pending' && currentJob.status !== 'assigned') {
            return;
        }

        currentJob.collectorId = collectorId;
        if (collectorName) currentJob.collectorName = collectorName;
        if (collectorPhone) currentJob.collectorPhone = collectorPhone;
        currentJob.status = 'assigned';
        currentJob.assignedAt = serverTimestamp();
        return currentJob;
    });

    if (!result.committed) {
        return false;
    }

    // Set collector's active-job pointer only if we actually won the claim
    const collectorRef = ref(realtimeDb, `collectors/${collectorId}/activeJob`);
    await set(collectorRef, jobId);
    return true;
}

// ============================================
// AVAILABLE JOBS FOR COLLECTORS
// ============================================

// Get pending jobs for auto-assignment
export function subscribeToPendingJobs(
    callback: (jobs: RealtimeJob[]) => void
): () => void {
    const jobsRef = ref(realtimeDb, 'jobs');

    const unsubscribe = onValue(jobsRef, (snapshot) => {
        const jobs: RealtimeJob[] = [];
        snapshot.forEach((child) => {
            const job = child.val();
            if (job.status === 'pending' || job.status === 'assigned') {
                jobs.push(job);
            }
        });
        callback(jobs);
    });

    return () => off(jobsRef);
}

// Subscribe to a customer's active job
export function subscribeToCustomerActiveJob(
    customerId: string,
    callback: (job: RealtimeJob | null) => void
): () => void {
    const jobsRef = ref(realtimeDb, 'jobs');
    const q = query(jobsRef, orderByChild('customerId'), equalTo(customerId));

    const unsubscribe = onValue(q, (snapshot) => {
        let activeJob: RealtimeJob | null = null;
        snapshot.forEach((child) => {
            const job = child.val() as RealtimeJob;
            // Consider active if it's not completed or cancelled
            if (job.status !== 'completed' && job.status !== 'cancelled') {
                // If there are multiple (shouldn't happen), grab the newest or just the first
                if (!activeJob || (job.createdAt > activeJob.createdAt)) {
                    activeJob = job;
                }
            }
        });
        callback(activeJob);
    });

    return () => off(q);
}

// Subscribe to collector's assigned job — keeps a live subscription on the
// nested job ref so changes (status updates, customer cancellation, etc.)
// propagate to the collector's UI in real time.
export function subscribeToCollectorActiveJob(
    collectorId: string,
    callback: (job: RealtimeJob | null) => void
): () => void {
    const activeJobRef = ref(realtimeDb, `collectors/${collectorId}/activeJob`);
    let currentJobRef: ReturnType<typeof ref> | null = null;

    const detachJobListener = () => {
        if (currentJobRef) {
            off(currentJobRef);
            currentJobRef = null;
        }
    };

    onValue(activeJobRef, (snapshot) => {
        const jobId = snapshot.val();
        // Tear down any prior nested job listener before attaching a new one
        detachJobListener();

        if (!jobId) {
            callback(null);
            return;
        }

        const jobRef = ref(realtimeDb, `jobs/${jobId}`);
        currentJobRef = jobRef;
        onValue(jobRef, (jobSnap) => {
            callback(jobSnap.val());
        });
    });

    return () => {
        off(activeJobRef);
        detachJobListener();
    };
}

// Clear collector's active job (after completion)
export async function clearCollectorActiveJob(collectorId: string): Promise<void> {
    const activeJobRef = ref(realtimeDb, `collectors/${collectorId}/activeJob`);
    await set(activeJobRef, null);
}

// ============================================
// ONLINE COLLECTORS FOR AUTO-MATCHING
// ============================================

// Get all online collectors
export async function getOnlineCollectors(): Promise<Array<{ id: string; location: GeoLocation }>> {
    const collectorsRef = ref(realtimeDb, 'collectors');
    const snapshot = await get(collectorsRef);

    const onlineCollectors: Array<{ id: string; location: GeoLocation }> = [];

    snapshot.forEach((child) => {
        const data = child.val();
        if (data.status?.online && data.location && !data.activeJob) {
            onlineCollectors.push({
                id: child.key!,
                location: {
                    lat: data.location.lat,
                    lng: data.location.lng,
                    formattedAddress: data.location.formattedAddress,
                },
            });
        }
    });

    return onlineCollectors;
}

// Subscribe to online collectors (for admin/monitoring)
export function subscribeToOnlineCollectors(
    callback: (collectors: Array<{ id: string; location: GeoLocation; hasActiveJob: boolean }>) => void
): () => void {
    const collectorsRef = ref(realtimeDb, 'collectors');

    const unsubscribe = onValue(collectorsRef, (snapshot) => {
        const collectors: Array<{ id: string; location: GeoLocation; hasActiveJob: boolean }> = [];

        snapshot.forEach((child) => {
            const data = child.val();
            if (data.status?.online && data.location) {
                collectors.push({
                    id: child.key!,
                    location: {
                        lat: data.location.lat,
                        lng: data.location.lng,
                        formattedAddress: data.location.formattedAddress,
                    },
                    hasActiveJob: !!data.activeJob,
                });
            }
        });

        callback(collectors);
    });

    return () => off(collectorsRef);
}

// =====================================
// PAYMENT REQUESTS (Real-time)
// =====================================

export interface PaymentRequest {
    id: string;
    subscriptionId?: string;
    jobId?: string;
    collectorId: string;
    collectorName: string;
    customerId: string;
    originalAmount: number;
    requestedAmount: number;
    adjustmentReason?: string;
    counterOfferAmount?: number;
    counterOfferBy?: 'customer' | 'collector';
    counterOfferReason?: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'counter_offer';
    createdAt: number;
    confirmedAt?: number;
}

// Collector creates a payment request when arriving at location
export async function createPaymentRequest(
    collectorId: string,
    collectorName: string,
    customerId: string,
    originalAmount: number,
    requestedAmount: number,
    adjustmentReason?: string,
    subscriptionId?: string,
    jobId?: string,
): Promise<string> {
    const requestId = `pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const requestRef = ref(realtimeDb, `paymentRequests/${customerId}/${requestId}`);

    await set(requestRef, {
        id: requestId,
        subscriptionId: subscriptionId || null,
        jobId: jobId || null,
        collectorId,
        collectorName,
        customerId,
        originalAmount,
        requestedAmount,
        adjustmentReason: adjustmentReason || null,
        status: 'pending',
        createdAt: Date.now(),
    });

    return requestId;
}

// Customer listens for incoming payment requests
export function subscribeToPaymentRequests(
    customerId: string,
    callback: (requests: PaymentRequest[]) => void
): () => void {
    const requestsRef = ref(realtimeDb, `paymentRequests/${customerId}`);

    const unsubscribe = onValue(requestsRef, (snapshot) => {
        const requests: PaymentRequest[] = [];

        snapshot.forEach((child) => {
            const data = child.val();
            if (data.status === 'pending' || data.status === 'counter_offer') {
                requests.push(data as PaymentRequest);
            }
        });

        callback(requests);
    });

    return () => off(requestsRef);
}

// Subscribe to a single payment request (used by collector/org to detect
// when the customer confirms or declines, so the trip auto-completes).
export function subscribeToPaymentRequest(
    customerId: string,
    requestId: string,
    callback: (request: PaymentRequest | null) => void
): () => void {
    const requestRef = ref(realtimeDb, `paymentRequests/${customerId}/${requestId}`);

    const unsubscribe = onValue(requestRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val() as PaymentRequest);
        } else {
            callback(null);
        }
    });

    return () => off(requestRef);
}

// Customer confirms payment
export async function confirmPaymentRequest(
    customerId: string,
    requestId: string
): Promise<void> {
    const requestRef = ref(realtimeDb, `paymentRequests/${customerId}/${requestId}`);
    const snapshot = await new Promise<any>((resolve) => {
        onValue(requestRef, (snap) => {
            resolve(snap);
        }, { onlyOnce: true });
    });

    if (snapshot.exists()) {
        await set(requestRef, {
            ...snapshot.val(),
            status: 'confirmed',
            confirmedAt: Date.now(),
        });
    }
}

// Customer sends a counter-offer
export async function counterOfferPaymentRequest(
    customerId: string,
    requestId: string,
    counterAmount: number,
    reason?: string
): Promise<void> {
    const requestRef = ref(realtimeDb, `paymentRequests/${customerId}/${requestId}`);
    const snapshot = await new Promise<any>((resolve) => {
        onValue(requestRef, (snap) => {
            resolve(snap);
        }, { onlyOnce: true });
    });

    if (snapshot.exists()) {
        await set(requestRef, {
            ...snapshot.val(),
            status: 'counter_offer',
            counterOfferAmount: counterAmount,
            counterOfferBy: 'customer',
            counterOfferReason: reason || null,
        });
    }
}

// Collector accepts the customer's counter-offer (updates amount and confirms)
export async function acceptCounterOffer(
    customerId: string,
    requestId: string
): Promise<void> {
    const requestRef = ref(realtimeDb, `paymentRequests/${customerId}/${requestId}`);
    const snapshot = await new Promise<any>((resolve) => {
        onValue(requestRef, (snap) => {
            resolve(snap);
        }, { onlyOnce: true });
    });

    if (snapshot.exists()) {
        const data = snapshot.val();
        await set(requestRef, {
            ...data,
            requestedAmount: data.counterOfferAmount || data.requestedAmount,
            status: 'pending', // back to pending so customer can now pay
            counterOfferAmount: null,
            counterOfferBy: null,
            counterOfferReason: null,
        });
    }
}

// Cancel payment request
export async function cancelPaymentRequest(
    customerId: string,
    requestId: string
): Promise<void> {
    const requestRef = ref(realtimeDb, `paymentRequests/${customerId}/${requestId}`);
    const snapshot = await new Promise<any>((resolve) => {
        onValue(requestRef, (snap) => {
            resolve(snap);
        }, { onlyOnce: true });
    });

    if (snapshot.exists()) {
        await set(requestRef, {
            ...snapshot.val(),
            status: 'cancelled',
        });
    }
}
