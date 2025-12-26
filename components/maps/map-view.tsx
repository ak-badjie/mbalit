'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Loader2, Maximize2, Minimize2, Layers } from 'lucide-react';
import { loadGoogleMaps, calculateDistance, formatDistance, estimateTime } from '@/lib/maps';
import { GeoLocation } from '@/types';
import { Button } from '@/components/ui/button';

interface MapViewProps {
    center?: GeoLocation;
    customerLocation?: GeoLocation;
    collectorLocation?: GeoLocation;
    onLocationSelect?: (location: GeoLocation) => void;
    showRoute?: boolean;
    isTracking?: boolean;
    interactive?: boolean; // NEW: Controls if map is interactive (draggable, clickable)
    className?: string;
    height?: string;
}

export const MapView: React.FC<MapViewProps> = ({
    center,
    customerLocation,
    collectorLocation,
    onLocationSelect,
    showRoute = false,
    isTracking = false,
    interactive = false, // Default to non-interactive
    className = '',
    height = '400px',
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const customerMarkerRef = useRef<google.maps.Marker | null>(null);
    const collectorMarkerRef = useRef<google.maps.Marker | null>(null);
    const routeRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSatellite, setIsSatellite] = useState(false);
    const [distance, setDistance] = useState<string | null>(null);
    const [eta, setEta] = useState<string | null>(null);

    // Initialize map
    useEffect(() => {
        const initMap = async () => {
            if (!mapRef.current) return;

            try {
                const google = await loadGoogleMaps();

                const defaultCenter = center || { lat: 13.4549, lng: -16.5790 }; // Banjul, Gambia

                const map = new google.maps.Map(mapRef.current, {
                    center: defaultCenter,
                    zoom: 20, // Maximum zoom for precise location
                    mapTypeId: 'hybrid', // Satellite with labels (building names, streets)
                    disableDefaultUI: !interactive,
                    zoomControl: interactive,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: interactive,
                    gestureHandling: interactive ? 'cooperative' : 'none',
                    draggable: interactive,
                    scrollwheel: interactive,
                    disableDoubleClickZoom: !interactive,
                });

                mapInstanceRef.current = map;

                // Add click listener for location selection
                if (onLocationSelect) {
                    map.addListener('click', async (e: google.maps.MapMouseEvent) => {
                        if (e.latLng) {
                            const lat = e.latLng.lat();
                            const lng = e.latLng.lng();

                            // Reverse geocode to get address
                            const geocoder = new google.maps.Geocoder();
                            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                                const address = status === 'OK' && results?.[0]
                                    ? results[0].formatted_address
                                    : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

                                onLocationSelect({
                                    lat,
                                    lng,
                                    formattedAddress: address,
                                });
                            });
                        }
                    });
                }

                setIsLoading(false);
            } catch (err) {
                console.error('Error initializing map:', err);
                setError('Failed to load map. Please check your internet connection.');
                setIsLoading(false);
            }
        };

        initMap();

        return () => {
            // Cleanup
            if (customerMarkerRef.current) customerMarkerRef.current.setMap(null);
            if (collectorMarkerRef.current) collectorMarkerRef.current.setMap(null);
            if (routeRendererRef.current) routeRendererRef.current.setMap(null);
        };
    }, [center, onLocationSelect]);

    // Update customer marker
    useEffect(() => {
        if (!mapInstanceRef.current || !customerLocation) return;

        const google = window.google;
        if (!google) return;

        if (customerMarkerRef.current) {
            customerMarkerRef.current.setPosition({ lat: customerLocation.lat, lng: customerLocation.lng });
        } else {
            // Create a proper pin marker like Google Maps
            customerMarkerRef.current = new google.maps.Marker({
                position: { lat: customerLocation.lat, lng: customerLocation.lng },
                map: mapInstanceRef.current,
                title: 'Your Location',
                animation: google.maps.Animation.DROP,
                icon: {
                    url: 'data:image/svg+xml,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
                            <path fill="#10b981" stroke="#ffffff" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                            <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(48, 48),
                    anchor: new google.maps.Point(24, 48),
                },
            });

            // Create info window with "Your Location" label
            infoWindowRef.current = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 8px 12px; font-family: system-ui, sans-serif;">
                        <strong style="color: #10b981; font-size: 14px;">📍 Your Location</strong>
                        <p style="margin: 4px 0 0; font-size: 12px; color: #666;">Pickup point</p>
                    </div>
                `,
            });

            // Open info window on marker
            infoWindowRef.current.open(mapInstanceRef.current, customerMarkerRef.current);

            // Also open on click
            customerMarkerRef.current.addListener('click', () => {
                infoWindowRef.current?.open(mapInstanceRef.current, customerMarkerRef.current);
            });
        }

        // Center map on customer if no collector - zoom in very close
        if (!collectorLocation) {
            mapInstanceRef.current.panTo({ lat: customerLocation.lat, lng: customerLocation.lng });
            mapInstanceRef.current.setZoom(20); // Maximum zoom level
        }
    }, [customerLocation, collectorLocation]);

    // Update collector marker and calculate distance
    useEffect(() => {
        if (!mapInstanceRef.current || !collectorLocation) return;

        const google = window.google;
        if (!google) return;

        if (collectorMarkerRef.current) {
            // Animate marker position
            collectorMarkerRef.current.setPosition({ lat: collectorLocation.lat, lng: collectorLocation.lng });
        } else {
            // Create collector marker with truck icon
            collectorMarkerRef.current = new google.maps.Marker({
                position: { lat: collectorLocation.lat, lng: collectorLocation.lng },
                map: mapInstanceRef.current,
                title: 'Collector',
                icon: {
                    url: 'data:image/svg+xml,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5">
              <path d="M1 3h15v13H1z"/>
              <path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          `),
                    scaledSize: new google.maps.Size(40, 40),
                    anchor: new google.maps.Point(20, 20),
                },
            });
        }

        // Calculate distance if both locations exist
        if (customerLocation) {
            const dist = calculateDistance(
                customerLocation.lat,
                customerLocation.lng,
                collectorLocation.lat,
                collectorLocation.lng
            );
            setDistance(formatDistance(dist));
            setEta(estimateTime(dist));

            // Fit bounds to show both markers
            const bounds = new google.maps.LatLngBounds();
            bounds.extend({ lat: customerLocation.lat, lng: customerLocation.lng });
            bounds.extend({ lat: collectorLocation.lat, lng: collectorLocation.lng });
            mapInstanceRef.current.fitBounds(bounds, { padding: 80 });
        }
    }, [collectorLocation, customerLocation]);

    // Draw route between customer and collector
    useEffect(() => {
        if (!mapInstanceRef.current || !showRoute || !customerLocation || !collectorLocation) return;

        const google = window.google;
        if (!google) return;

        const directionsService = new google.maps.DirectionsService();

        if (!routeRendererRef.current) {
            routeRendererRef.current = new google.maps.DirectionsRenderer({
                map: mapInstanceRef.current,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: '#10b981',
                    strokeWeight: 4,
                    strokeOpacity: 0.8,
                },
            });
        }

        directionsService.route(
            {
                origin: { lat: collectorLocation.lat, lng: collectorLocation.lng },
                destination: { lat: customerLocation.lat, lng: customerLocation.lng },
                travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === 'OK' && result && routeRendererRef.current) {
                    routeRendererRef.current.setDirections(result);
                }
            }
        );
    }, [showRoute, customerLocation, collectorLocation]);

    // Center on user's current location
    const handleCenterOnUser = useCallback(() => {
        if (!navigator.geolocation || !mapInstanceRef.current) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                mapInstanceRef.current?.panTo({ lat: latitude, lng: longitude });
                mapInstanceRef.current?.setZoom(16);
            },
            (error) => {
                console.error('Error getting location:', error);
            }
        );
    }, []);

    // Toggle fullscreen
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <motion.div
            layout
            className={`
        relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800
        ${isFullscreen ? 'fixed inset-4 z-50' : ''}
        ${className}
      `}
            style={{ height: isFullscreen ? 'auto' : height }}
        >
            {/* Loading State */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                        <p className="text-sm text-gray-500">Loading map...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                    <div className="text-center p-6">
                        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-300">{error}</p>
                    </div>
                </div>
            )}

            {/* Map Container */}
            <div ref={mapRef} className="w-full h-full" />

            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCenterOnUser}
                    className="shadow-lg bg-white dark:bg-gray-800"
                >
                    <Navigation size={18} />
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                        setIsSatellite(!isSatellite);
                        if (mapInstanceRef.current) {
                            mapInstanceRef.current.setMapTypeId(
                                isSatellite ? 'roadmap' : 'satellite'
                            );
                        }
                    }}
                    className="shadow-lg bg-white dark:bg-gray-800"
                    title={isSatellite ? 'Switch to Map' : 'Switch to Satellite'}
                >
                    <Layers size={18} />
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="shadow-lg bg-white dark:bg-gray-800"
                >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </Button>
            </div>

            {/* Tracking Info Overlay */}
            {isTracking && distance && eta && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Collector arriving</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {eta}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Distance</p>
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {distance}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

// Custom map styles for a cleaner look
const mapStyles: google.maps.MapTypeStyle[] = [
    {
        featureType: 'all',
        elementType: 'geometry.fill',
        stylers: [{ weight: '2.00' }],
    },
    {
        featureType: 'all',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#9c9c9c' }],
    },
    {
        featureType: 'all',
        elementType: 'labels.text',
        stylers: [{ visibility: 'on' }],
    },
    {
        featureType: 'landscape',
        elementType: 'all',
        stylers: [{ color: '#f2f2f2' }],
    },
    {
        featureType: 'poi',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'road',
        elementType: 'all',
        stylers: [{ saturation: -100 }, { lightness: 45 }],
    },
    {
        featureType: 'road.highway',
        elementType: 'all',
        stylers: [{ visibility: 'simplified' }],
    },
    {
        featureType: 'road.arterial',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'transit',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'water',
        elementType: 'all',
        stylers: [{ color: '#b4d4e1' }, { visibility: 'on' }],
    },
];

export default MapView;
