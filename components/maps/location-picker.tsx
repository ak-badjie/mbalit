'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Navigation, Loader2, X, Check } from 'lucide-react';
import { loadGoogleMaps, reverseGeocode } from '@/lib/maps';
import { GeoLocation } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LocationPickerProps {
    value?: GeoLocation | null;
    onChange: (location: GeoLocation) => void;
    placeholder?: string;
    className?: string;
}

interface PlacePrediction {
    place_id: string;
    description: string;
    structured_formatting: {
        main_text: string;
        secondary_text: string;
    };
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
    value,
    onChange,
    placeholder = 'Search for a location...',
    className = '',
}) => {
    const [inputValue, setInputValue] = useState(value?.formattedAddress || '');
    const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
    const dummyDivRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Google services
    useEffect(() => {
        const initServices = async () => {
            try {
                const google = await loadGoogleMaps();
                autocompleteServiceRef.current = new google.maps.places.AutocompleteService();

                // Create dummy element for PlacesService
                if (dummyDivRef.current) {
                    placesServiceRef.current = new google.maps.places.PlacesService(dummyDivRef.current);
                }
            } catch (error) {
                console.error('Error initializing Places services:', error);
            }
        };

        initServices();
    }, []);

    // Update input when value changes externally
    useEffect(() => {
        if (value?.formattedAddress && value.formattedAddress !== inputValue) {
            setInputValue(value.formattedAddress);
        }
    }, [value]);

    // Handle input change with debounced predictions
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setInputValue(text);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (text.length < 3) {
            setPredictions([]);
            setShowDropdown(false);
            return;
        }

        // Debounce API calls
        debounceRef.current = setTimeout(async () => {
            if (!autocompleteServiceRef.current) return;

            setIsLoading(true);

            autocompleteServiceRef.current.getPlacePredictions(
                {
                    input: text,
                    componentRestrictions: { country: 'gm' }, // Restrict to Gambia
                },
                (predictions, status) => {
                    setIsLoading(false);

                    if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                        setPredictions(predictions as PlacePrediction[]);
                        setShowDropdown(true);
                    } else {
                        setPredictions([]);
                    }
                }
            );
        }, 300);
    };

    // Handle place selection
    const handleSelectPlace = useCallback((prediction: PlacePrediction) => {
        if (!placesServiceRef.current) return;

        setIsLoading(true);
        setShowDropdown(false);

        placesServiceRef.current.getDetails(
            {
                placeId: prediction.place_id,
                fields: ['geometry', 'formatted_address', 'name'],
            },
            (place, status) => {
                setIsLoading(false);

                if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                    const newLocation: GeoLocation = {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        address: prediction.structured_formatting.main_text,
                        formattedAddress: place.formatted_address || prediction.description,
                    };

                    setInputValue(newLocation.formattedAddress || '');
                    onChange(newLocation);
                }
            }
        );
    }, [onChange]);

    // Get current location
    const handleGetCurrentLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const address = await reverseGeocode(latitude, longitude);

                const newLocation: GeoLocation = {
                    lat: latitude,
                    lng: longitude,
                    formattedAddress: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                };

                setInputValue(newLocation.formattedAddress || '');
                onChange(newLocation);
                setIsLocating(false);
            },
            (error) => {
                console.error('Error getting location:', error);
                setIsLocating(false);
                alert('Unable to get your location. Please enable location services.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, [onChange]);

    // Clear input
    const handleClear = () => {
        setInputValue('');
        setPredictions([]);
        setShowDropdown(false);
    };

    return (
        <div className={`relative ${className}`}>
            {/* Hidden div for PlacesService */}
            <div ref={dummyDivRef} style={{ display: 'none' }} />

            {/* Input with icons */}
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <MapPin size={20} />
                </div>

                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        setIsFocused(true);
                        if (predictions.length > 0) setShowDropdown(true);
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                        // Delay hiding to allow click on predictions
                        setTimeout(() => setShowDropdown(false), 200);
                    }}
                    placeholder={placeholder}
                    className="
            w-full py-4 pl-12 pr-24
            bg-white dark:bg-gray-900
            border border-gray-200 dark:border-gray-700
            rounded-xl text-gray-900 dark:text-white
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
            transition-all duration-200
          "
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {inputValue && (
                        <button
                            onClick={handleClear}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X size={18} />
                        </button>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGetCurrentLocation}
                        disabled={isLocating}
                        className="!px-2"
                    >
                        {isLocating ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Navigation size={18} className="text-emerald-600" />
                        )}
                    </Button>
                </div>

                {/* Loading indicator */}
                {isLoading && (
                    <div className="absolute right-20 top-1/2 -translate-y-1/2">
                        <Loader2 size={18} className="animate-spin text-gray-400" />
                    </div>
                )}
            </div>

            {/* Predictions Dropdown */}
            <AnimatePresence>
                {showDropdown && predictions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="
              absolute top-full left-0 right-0 z-50
              mt-2 bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-xl shadow-lg overflow-hidden
            "
                    >
                        {predictions.map((prediction) => (
                            <button
                                key={prediction.place_id}
                                onClick={() => handleSelectPlace(prediction)}
                                className="
                  w-full px-4 py-3 text-left
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  border-b border-gray-100 dark:border-gray-700 last:border-0
                  transition-colors
                "
                            >
                                <div className="flex items-start gap-3">
                                    <MapPin size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            {prediction.structured_formatting.main_text}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {prediction.structured_formatting.secondary_text}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Selected Location Badge */}
            {value && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-2 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"
                >
                    <Check size={16} />
                    <span>Location selected</span>
                </motion.div>
            )}
        </div>
    );
};

export default LocationPicker;
