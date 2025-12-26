import { GeoLocation } from '@/types';

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Track if Google Maps script is loaded
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

// Load Google Maps API using dynamic script injection
export async function loadGoogleMaps(): Promise<typeof google> {
    // If already loaded, return immediately
    if (isLoaded && typeof google !== 'undefined') {
        return google;
    }

    // If currently loading, wait for it
    if (loadPromise) {
        await loadPromise;
        return google;
    }

    // Start loading
    loadPromise = new Promise<void>((resolve, reject) => {
        // Check if already loaded by another script
        if (typeof google !== 'undefined' && google.maps) {
            isLoaded = true;
            resolve();
            return;
        }

        // Create script element
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=__googleMapsCallback`;
        script.async = true;
        script.defer = true;

        // Define callback
        (window as unknown as Record<string, unknown>).__googleMapsCallback = () => {
            isLoaded = true;
            resolve();
            delete (window as unknown as Record<string, unknown>).__googleMapsCallback;
        };

        script.onerror = () => {
            reject(new Error('Failed to load Google Maps API'));
        };

        document.head.appendChild(script);
    });

    await loadPromise;
    return google;
}

// Calculate distance between two points using Haversine formula
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

// Format distance for display
export function formatDistance(km: number): string {
    if (km < 1) {
        return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
}

// Estimate time based on distance (average speed ~30 km/h in city)
export function estimateTime(distanceKm: number): string {
    const speedKmH = 30; // Average speed in city
    const timeHours = distanceKm / speedKmH;
    const timeMinutes = Math.round(timeHours * 60);

    if (timeMinutes < 1) {
        return '< 1 min';
    }
    if (timeMinutes < 60) {
        return `${timeMinutes} min`;
    }
    const hours = Math.floor(timeMinutes / 60);
    const mins = timeMinutes % 60;
    return `${hours}h ${mins}m`;
}

// Geocode an address to coordinates
export async function geocodeAddress(address: string): Promise<GeoLocation | null> {
    try {
        await loadGoogleMaps();
        const geocoder = new google.maps.Geocoder();

        return new Promise((resolve) => {
            geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location;
                    resolve({
                        lat: location.lat(),
                        lng: location.lng(),
                        address: address,
                        formattedAddress: results[0].formatted_address,
                    });
                } else {
                    resolve(null);
                }
            });
        });
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Geocode a Google Plus Code to coordinates
// Plus Codes look like "4HMQ+3C Banjul" or "8FVC9G8F+5W"
export async function geocodePlusCode(plusCode: string): Promise<GeoLocation | null> {
    // Validate Plus Code format (basic check)
    const plusCodePattern = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}(\s+.+)?$/i;
    const globalCodePattern = /^[23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{2}$/i;

    const trimmedCode = plusCode.trim();

    if (!plusCodePattern.test(trimmedCode) && !globalCodePattern.test(trimmedCode)) {
        // Still try geocoding - Google is lenient with formats
        console.log('Plus Code format may be non-standard, attempting geocode anyway:', trimmedCode);
    }

    try {
        await loadGoogleMaps();
        const geocoder = new google.maps.Geocoder();

        return new Promise((resolve) => {
            // Google Geocoder accepts Plus Codes directly
            geocoder.geocode({ address: trimmedCode }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location;
                    console.log('Plus Code geocoded successfully:', {
                        input: trimmedCode,
                        lat: location.lat(),
                        lng: location.lng(),
                        formatted: results[0].formatted_address,
                    });
                    resolve({
                        lat: location.lat(),
                        lng: location.lng(),
                        address: trimmedCode,
                        formattedAddress: results[0].formatted_address,
                    });
                } else {
                    console.error('Plus Code geocoding failed:', status);
                    resolve(null);
                }
            });
        });
    } catch (error) {
        console.error('Plus Code geocoding error:', error);
        return null;
    }
}

// Reverse geocode coordinates to address
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
        await loadGoogleMaps();
        const geocoder = new google.maps.Geocoder();

        return new Promise((resolve) => {
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    resolve(results[0].formatted_address);
                } else {
                    resolve(null);
                }
            });
        });
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

// Get distance and duration using Distance Matrix API
export async function getDistanceMatrix(
    origin: GeoLocation,
    destination: GeoLocation
): Promise<{ distance: number; duration: string } | null> {
    try {
        await loadGoogleMaps();
        const service = new google.maps.DistanceMatrixService();

        return new Promise((resolve) => {
            service.getDistanceMatrix(
                {
                    origins: [{ lat: origin.lat, lng: origin.lng }],
                    destinations: [{ lat: destination.lat, lng: destination.lng }],
                    travelMode: google.maps.TravelMode.DRIVING,
                },
                (response, status) => {
                    if (status === 'OK' && response) {
                        const result = response.rows[0]?.elements[0];
                        if (result && result.status === 'OK') {
                            resolve({
                                distance: result.distance.value / 1000, // Convert to km
                                duration: result.duration.text,
                            });
                        } else {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Distance Matrix error:', error);
        return null;
    }
}

// Watch user's position with high accuracy
export function watchPosition(
    onSuccess: (position: GeoLocation) => void,
    onError?: (error: GeolocationPositionError) => void
): number | null {
    if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        return null;
    }

    return navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            const address = await reverseGeocode(latitude, longitude);

            onSuccess({
                lat: latitude,
                lng: longitude,
                formattedAddress: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            });
        },
        onError,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000,
        }
    );
}

// Stop watching position
export function clearWatch(watchId: number): void {
    if (navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
    }
}
