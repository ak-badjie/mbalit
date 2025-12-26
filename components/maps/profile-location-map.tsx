'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader2, Check, Copy, AlertTriangle, RefreshCw, Navigation, Crosshair } from 'lucide-react';
import { loadGoogleMaps, reverseGeocode } from '@/lib/maps';
import { GeoLocation } from '@/types';
import { Button } from '@/components/ui/button';

interface ProfileLocationMapProps {
    location?: GeoLocation;
    onLocationChange?: (location: GeoLocation) => void;
    onPreciseLocationAcquired?: () => void; // Called when precise location is successfully obtained
    editable?: boolean;
    enableLiveTracking?: boolean;
    height?: string;
    className?: string;
}

export const ProfileLocationMap: React.FC<ProfileLocationMapProps> = ({
    location,
    onLocationChange,
    onPreciseLocationAcquired,
    editable = true,
    enableLiveTracking = true,
    height = '400px',
    className = '',
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const watchIdRef = useRef<number | null>(null);

    const [mapLoaded, setMapLoaded] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [preciseLocationAcquired, setPreciseLocationAcquired] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(location || null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const createInfoWindowContent = (address: string) => `
        <div style="padding: 12px; font-family: system-ui, sans-serif; max-width: 280px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #10b981, #14b8a6); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    </svg>
                </div>
                <strong style="color: #10b981; font-size: 14px;">📍 Precise Location</strong>
            </div>
            <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.5;">${address}</p>
        </div>
    `;

    // Update marker position on map
    const updateMarkerPosition = useCallback(async (lat: number, lng: number) => {
        const address = await reverseGeocode(lat, lng);

        const newLocation: GeoLocation = {
            lat,
            lng,
            formattedAddress: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        };

        setCurrentLocation(newLocation);
        onLocationChange?.(newLocation);

        if (markerRef.current && mapInstanceRef.current) {
            markerRef.current.setPosition({ lat, lng });
            mapInstanceRef.current.panTo({ lat, lng });
            mapInstanceRef.current.setZoom(19);

            if (infoWindowRef.current) {
                infoWindowRef.current.setContent(createInfoWindowContent(newLocation.formattedAddress || ''));
                infoWindowRef.current.open(mapInstanceRef.current, markerRef.current);
            }
        }
    }, [onLocationChange]);

    // Initialize map only (no GPS yet - wait for button click)
    useEffect(() => {
        const initMap = async () => {
            if (!mapRef.current) return;

            try {
                const google = await loadGoogleMaps();

                // Start with default center (Banjul, Gambia)
                const defaultCenter = location || { lat: 13.4549, lng: -16.5790 };

                const map = new google.maps.Map(mapRef.current, {
                    center: defaultCenter,
                    zoom: 15, // Lower zoom initially
                    mapTypeId: 'hybrid',
                    disableDefaultUI: false,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                    gestureHandling: 'greedy',
                    tilt: 0,
                    clickableIcons: false,
                });

                mapInstanceRef.current = map;

                // Create custom marker
                const markerIcon = {
                    url: 'data:image/svg+xml,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
                            <circle cx="30" cy="30" r="20" fill="#10b981" fill-opacity="0.3">
                                <animate attributeName="r" values="15;25;15" dur="2s" repeatCount="indefinite"/>
                                <animate attributeName="fill-opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite"/>
                            </circle>
                            <circle cx="30" cy="30" r="12" fill="#10b981" stroke="#ffffff" stroke-width="3"/>
                            <circle cx="30" cy="30" r="5" fill="#ffffff"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(60, 60),
                    anchor: new google.maps.Point(30, 30),
                };

                markerRef.current = new google.maps.Marker({
                    position: defaultCenter,
                    map: map,
                    draggable: false,
                    icon: markerIcon,
                    title: 'Your Location',
                    visible: false, // Hidden until precise location is acquired
                });

                infoWindowRef.current = new google.maps.InfoWindow({
                    content: createInfoWindowContent('Waiting for precise location...'),
                });

                setMapLoaded(true);
            } catch (err) {
                console.error('Error initializing map:', err);
                setLocationError('Failed to load map');
            }
        };

        initMap();

        return () => {
            if (markerRef.current) markerRef.current.setMap(null);
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    // Get precise location when button is clicked
    const handleGetPreciseLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                console.log(`Precise location acquired: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);

                await updateMarkerPosition(latitude, longitude);

                // Show the marker now
                if (markerRef.current) {
                    markerRef.current.setVisible(true);
                }

                setPreciseLocationAcquired(true);
                setIsLocating(false);
                onPreciseLocationAcquired?.();

                // Start live tracking if enabled
                if (enableLiveTracking) {
                    watchIdRef.current = navigator.geolocation.watchPosition(
                        async (pos) => {
                            await updateMarkerPosition(pos.coords.latitude, pos.coords.longitude);
                        },
                        (err) => {
                            console.error('Watch position error:', err);
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 15000,
                            maximumAge: 5000
                        }
                    );
                }
            },
            (error) => {
                // If high accuracy fails, try with low accuracy as fallback
                if (error.code === error.TIMEOUT) {
                    console.log('High accuracy timed out, trying low accuracy...');
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            const { latitude, longitude } = position.coords;
                            console.log(`Low accuracy location acquired: ${latitude}, ${longitude}`);

                            await updateMarkerPosition(latitude, longitude);

                            if (markerRef.current) {
                                markerRef.current.setVisible(true);
                            }

                            setPreciseLocationAcquired(true);
                            setIsLocating(false);
                            onPreciseLocationAcquired?.();
                        },
                        (fallbackError) => {
                            setIsLocating(false);
                            switch (fallbackError.code) {
                                case fallbackError.PERMISSION_DENIED:
                                    setLocationError('Location access denied. Please enable location permissions in your browser settings.');
                                    break;
                                case fallbackError.POSITION_UNAVAILABLE:
                                    setLocationError('Location unavailable. Please check your GPS/location services.');
                                    break;
                                case fallbackError.TIMEOUT:
                                    setLocationError('Location request timed out. Please check your connection and try again.');
                                    break;
                                default:
                                    setLocationError('Unable to get your location. Please try again.');
                            }
                        },
                        {
                            enableHighAccuracy: false, // Use low accuracy as fallback
                            timeout: 30000, // 30 second timeout for fallback
                            maximumAge: 60000 // Allow cached location up to 1 minute
                        }
                    );
                    return;
                }

                setIsLocating(false);

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError('Location access denied. Please enable location permissions in your browser settings.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('Location unavailable. Please check your GPS/location services.');
                        break;
                    default:
                        setLocationError('Unable to get your location. Please try again.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 30000, // Increased to 30 seconds
                maximumAge: 0 // Force fresh location
            }
        );
    }, [enableLiveTracking, onPreciseLocationAcquired, updateMarkerPosition]);

    // Stop tracking when enableLiveTracking becomes false
    useEffect(() => {
        if (!enableLiveTracking && watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, [enableLiveTracking]);

    // Update marker when location prop changes externally (e.g., Plus Code)
    // When a Plus Code is entered, show it on the map immediately
    useEffect(() => {
        if (location && markerRef.current && mapInstanceRef.current && mapLoaded) {
            // Set the marker position
            markerRef.current.setPosition({ lat: location.lat, lng: location.lng });
            markerRef.current.setVisible(true);
            mapInstanceRef.current.panTo({ lat: location.lat, lng: location.lng });
            mapInstanceRef.current.setZoom(19);
            setCurrentLocation(location);

            // Mark as acquired - Plus Code is a valid location source
            setPreciseLocationAcquired(true);

            if (infoWindowRef.current) {
                infoWindowRef.current.setContent(createInfoWindowContent(location.formattedAddress || ''));
                infoWindowRef.current.open(mapInstanceRef.current, markerRef.current);
            }
        }
    }, [location, mapLoaded]);

    // Copy coordinates
    const handleCopyCoordinates = () => {
        if (currentLocation) {
            const coords = `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`;
            navigator.clipboard.writeText(coords);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className={`relative ${className}`}>
            {/* Map Container */}
            <div
                ref={mapRef}
                className={`w-full rounded-2xl overflow-hidden shadow-lg transition-all duration-500 ${!preciseLocationAcquired ? 'blur-sm' : ''}`}
                style={{ height }}
            />

            {/* Blur Overlay with Get Precise Location Button - Shows until precise location is acquired */}
            <AnimatePresence>
                {mapLoaded && !preciseLocationAcquired && !locationError && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-2xl z-10"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="flex flex-col items-center gap-4 p-6 bg-white/95 dark:bg-gray-900/95 rounded-2xl shadow-2xl max-w-sm mx-4"
                        >
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Crosshair className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                    Get Your Precise Location
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Click the button below to get your exact GPS location
                                </p>
                            </div>
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleGetPreciseLocation}
                                disabled={isLocating}
                                leftIcon={isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                                className="w-full"
                            >
                                {isLocating ? 'Getting Location...' : 'Get Precise Location'}
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading Overlay - Shows before map is loaded */}
            {!mapLoaded && !locationError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm rounded-2xl z-10">
                    <div className="flex flex-col items-center gap-3 text-white">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-sm font-medium">Loading map...</p>
                    </div>
                </div>
            )}

            {/* Location Error Overlay */}
            {locationError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-md rounded-2xl z-20">
                    <div className="flex flex-col items-center gap-4 text-white text-center max-w-sm p-6">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>
                        <h3 className="text-lg font-semibold">Location Error</h3>
                        <p className="text-sm text-gray-300">
                            {locationError}
                        </p>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleGetPreciseLocation}
                            leftIcon={<RefreshCw className="w-4 h-4" />}
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            )}

            {/* Location Info Card - Only show when precise location is acquired */}
            <AnimatePresence>
                {currentLocation && preciseLocationAcquired && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 shadow-2xl border border-gray-200 dark:border-gray-700 z-20"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                        Precise Location
                                    </h4>
                                    <Check className="w-4 h-4 text-emerald-500" />
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                                    {currentLocation.formattedAddress}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-gray-600 dark:text-gray-400">
                                        {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                                    </code>
                                    <button
                                        onClick={handleCopyCoordinates}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                    >
                                        {copied ? (
                                            <Check className="w-3 h-3 text-emerald-500" />
                                        ) : (
                                            <Copy className="w-3 h-3 text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            {/* Recalibrate button */}
                            <button
                                onClick={handleGetPreciseLocation}
                                disabled={isLocating}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                title="Recalibrate location"
                            >
                                {isLocating ? (
                                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4 text-gray-400" />
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfileLocationMap;
