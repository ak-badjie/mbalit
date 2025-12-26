// Firebase Realtime Database utilities for live tracking
import { ref, set, onValue, off, update, get, push, serverTimestamp } from 'firebase/database';
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
    collectorId?: string;
    collectorName?: string;
    collectorPhone?: string;
    wasteType: string;
    wasteSize: string;
    pickupLocation: GeoLocation;
    plusCode?: string;
    manualAddress?: string;
    amount: number;
    paymentStatus: 'pending' | 'paid' | 'failed';
    paymentIntentId?: string;
    status: 'pending' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
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

// Assign collector to job
export async function assignCollectorToJob(
    jobId: string,
    collectorId: string
): Promise<void> {
    const jobRef = ref(realtimeDb, `jobs/${jobId}`);
    await update(jobRef, {
        collectorId,
        status: 'assigned',
        assignedAt: serverTimestamp(),
    });

    // Also update collector's active job
    const collectorRef = ref(realtimeDb, `collectors/${collectorId}/activeJob`);
    await set(collectorRef, jobId);
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

// Subscribe to collector's assigned job
export function subscribeToCollectorActiveJob(
    collectorId: string,
    callback: (job: RealtimeJob | null) => void
): () => void {
    const activeJobRef = ref(realtimeDb, `collectors/${collectorId}/activeJob`);

    const unsubscribe = onValue(activeJobRef, async (snapshot) => {
        const jobId = snapshot.val();
        if (jobId) {
            const jobRef = ref(realtimeDb, `jobs/${jobId}`);
            const jobSnapshot = await get(jobRef);
            callback(jobSnapshot.val());
        } else {
            callback(null);
        }
    });

    return () => off(activeJobRef);
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
