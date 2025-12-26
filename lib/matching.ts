import { GeoLocation, WasteType, PickupRequest, Collector } from '@/types';
import {
    findNearestCollector,
    assignCollectorToRequest,
    updateRequestStatus,
    getPickupRequest
} from './firestore';

// Matching Algorithm Result
export interface MatchResult {
    success: boolean;
    collector?: Collector;
    distance?: number;
    estimatedArrival?: string;
    error?: string;
}

// Auto-match a request with the nearest available collector
export async function autoMatchCollector(
    requestId: string,
    customerLocation: GeoLocation,
    wasteType: WasteType
): Promise<MatchResult> {
    try {
        // Find nearest available collector who handles this waste type
        const match = await findNearestCollector(customerLocation, wasteType);

        if (!match) {
            return {
                success: false,
                error: 'No collectors available for this waste type right now',
            };
        }

        const { collector, distance } = match;

        // Assign the collector to the request
        await assignCollectorToRequest(requestId, collector.id, distance);

        // Calculate estimated arrival (average 30 km/h in city)
        const estimatedMinutes = Math.round((distance / 30) * 60);
        const estimatedArrival = estimatedMinutes < 60
            ? `${estimatedMinutes} min`
            : `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`;

        return {
            success: true,
            collector,
            distance,
            estimatedArrival,
        };
    } catch (error) {
        console.error('Auto-match error:', error);
        return {
            success: false,
            error: 'Failed to match with a collector',
        };
    }
}

// Retry matching after some time if no collector was found
export async function retryMatch(
    requestId: string,
    maxRetries: number = 3,
    retryDelayMs: number = 30000
): Promise<MatchResult> {
    const request = await getPickupRequest(requestId);

    if (!request || request.status !== 'pending') {
        return {
            success: false,
            error: 'Request not found or already processed',
        };
    }

    for (let i = 0; i < maxRetries; i++) {
        const match = await autoMatchCollector(
            requestId,
            request.pickupLocation,
            request.wasteType
        );

        if (match.success) {
            return match;
        }

        // Wait before retrying
        if (i < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
    }

    // All retries exhausted
    await updateRequestStatus(requestId, 'cancelled', {
        cancelReason: 'No collectors available after multiple attempts',
    });

    return {
        success: false,
        error: 'No collectors available. Please try again later.',
    };
}

// Calculate price based on distance and waste type
export function calculateMatchPrice(
    basePrice: number,
    distanceKm: number,
    perKmRate: number = 10
): number {
    const distanceCost = distanceKm * perKmRate;
    return Math.round(basePrice + distanceCost);
}
