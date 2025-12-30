'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Navigation,
    Phone,
    MessageCircle,
    MapPin,
    Clock,
    Package,
    DollarSign,
    Volume2,
    VolumeX,
    CheckCircle,
    ChevronUp,
    ChevronDown,
    AlertCircle,
    Locate,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapView } from '@/components/maps/map-view';
import { formatPrice } from '@/lib/waste-config';
import { GeoLocation } from '@/types';

interface PickupDetails {
    id: string;
    customerName: string;
    customerPhone: string;
    pickupLocation: GeoLocation;
    wasteType: string;
    wasteSize: string;
    amount: number;
    estimatedDistance?: string;
    estimatedTime?: string;
    notes?: string;
}

interface FullScreenNavigationProps {
    isOpen: boolean;
    onClose: () => void;
    pickup: PickupDetails;
    collectorLocation?: GeoLocation;
    onComplete: () => void;
    onCall?: () => void;
    onMessage?: () => void;
}

// Voice guidance hook
const useVoiceGuidance = (enabled: boolean) => {
    const synth = useRef<SpeechSynthesis | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            synth.current = window.speechSynthesis;
        }
    }, []);

    const speak = useCallback((text: string) => {
        if (!enabled || !synth.current) return;

        // Cancel any ongoing speech
        synth.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        synth.current.speak(utterance);
    }, [enabled]);

    const cancel = useCallback(() => {
        if (synth.current) {
            synth.current.cancel();
        }
    }, []);

    return { speak, cancel };
};

export function FullScreenNavigation({
    isOpen,
    onClose,
    pickup,
    collectorLocation,
    onComplete,
    onCall,
    onMessage,
}: FullScreenNavigationProps) {
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [detailsExpanded, setDetailsExpanded] = useState(false);
    const [isNavigating, setIsNavigating] = useState(true);
    const { speak, cancel } = useVoiceGuidance(voiceEnabled);

    // Announce pickup details on open
    useEffect(() => {
        if (isOpen && voiceEnabled) {
            const message = `Navigating to pickup. ${pickup.customerName}. ${pickup.estimatedDistance || 'Unknown distance'}. ${pickup.estimatedTime || ''}.`;
            speak(message);
        }

        return () => cancel();
    }, [isOpen, voiceEnabled, pickup, speak, cancel]);

    // Open external navigation
    const handleOpenMaps = () => {
        const { lat, lng } = pickup.pickupLocation;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        window.open(url, '_blank');

        if (voiceEnabled) {
            speak('Opening Google Maps for turn by turn navigation.');
        }
    };

    const handleCall = () => {
        if (onCall) {
            onCall();
        } else {
            window.open(`tel:${pickup.customerPhone}`, '_self');
        }
    };

    const handleComplete = () => {
        if (voiceEnabled) {
            speak('Pickup marked as complete. Great job!');
        }
        setTimeout(onComplete, 1000);
    };

    const toggleVoice = () => {
        setVoiceEnabled(!voiceEnabled);
        if (!voiceEnabled) {
            speak('Voice guidance enabled.');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-gray-950"
            >
                {/* Full Screen Map */}
                <div className="absolute inset-0">
                    <MapView
                        center={pickup.pickupLocation}
                        customerLocation={pickup.pickupLocation}
                        collectorLocation={collectorLocation}
                        showRoute
                        isTracking
                        height="100%"
                    />
                </div>

                {/* Top Bar - Glass Effect */}
                <motion.div
                    initial={{ y: -100 }}
                    animate={{ y: 0 }}
                    className="absolute top-0 left-0 right-0 z-10"
                >
                    <div className="bg-gray-900/90 backdrop-blur-xl border-b border-white/10">
                        <div className="flex items-center justify-between px-4 py-3">
                            {/* Close Button */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                            >
                                <X className="w-6 h-6 text-white" />
                            </motion.button>

                            {/* Navigation Status */}
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-white font-medium">Navigating</span>
                            </div>

                            {/* Voice Toggle */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleVoice}
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${voiceEnabled ? 'bg-emerald-500' : 'bg-white/10'
                                    }`}
                            >
                                {voiceEnabled ? (
                                    <Volume2 className="w-5 h-5 text-white" />
                                ) : (
                                    <VolumeX className="w-5 h-5 text-white" />
                                )}
                            </motion.button>
                        </div>

                        {/* ETA Banner */}
                        <div className="px-4 pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-white">
                                        {pickup.estimatedTime || '5 min'}
                                    </p>
                                    <p className="text-white/60 text-sm">
                                        {pickup.estimatedDistance || '1.2 km'} away
                                    </p>
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={handleOpenMaps}
                                    leftIcon={<Navigation size={18} />}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    Start Navigation
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Re-center Button */}
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute right-4 top-36 z-10 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center"
                    whileTap={{ scale: 0.9 }}
                >
                    <Locate className="w-6 h-6 text-gray-700" />
                </motion.button>

                {/* Bottom Details Panel */}
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    className="absolute bottom-0 left-0 right-0 z-10"
                >
                    {/* Expand/Collapse Handle */}
                    <div
                        className="flex justify-center py-2 cursor-pointer"
                        onClick={() => setDetailsExpanded(!detailsExpanded)}
                    >
                        <div className="w-10 h-1 bg-white/30 rounded-full" />
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl overflow-hidden">
                        {/* Customer Info Header */}
                        <div
                            className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer"
                            onClick={() => setDetailsExpanded(!detailsExpanded)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                                        {pickup.customerName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">
                                            {pickup.customerName}
                                        </h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <Package className="w-4 h-4" />
                                            {pickup.wasteType} • {pickup.wasteSize}
                                        </p>
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ rotate: detailsExpanded ? 180 : 0 }}
                                >
                                    <ChevronUp className="w-6 h-6 text-gray-400" />
                                </motion.div>
                            </div>
                        </div>

                        {/* Expanded Details */}
                        <AnimatePresence>
                            {detailsExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-4 py-4 space-y-4 border-b border-gray-100 dark:border-gray-800">
                                        {/* Location */}
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-gray-500">Pickup Location</p>
                                                <p className="text-gray-900 dark:text-white">
                                                    {pickup.pickupLocation.formattedAddress || 'Location on map'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Earnings */}
                                        <div className="flex items-start gap-3">
                                            <DollarSign className="w-5 h-5 text-emerald-500 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-gray-500">You'll Earn</p>
                                                <p className="text-xl font-bold text-emerald-600">
                                                    {formatPrice(pickup.amount)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        {pickup.notes && (
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                                                <div>
                                                    <p className="text-sm text-gray-500">Customer Notes</p>
                                                    <p className="text-gray-900 dark:text-white">
                                                        {pickup.notes}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action Buttons */}
                        <div className="px-4 py-4 pb-8">
                            {/* Contact Buttons */}
                            <div className="flex gap-3 mb-4">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={handleCall}
                                    leftIcon={<Phone size={18} />}
                                    className="border-gray-200 dark:border-gray-700"
                                >
                                    Call
                                </Button>
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={onMessage}
                                    leftIcon={<MessageCircle size={18} />}
                                    className="border-gray-200 dark:border-gray-700"
                                >
                                    Message
                                </Button>
                            </div>

                            {/* Complete Button */}
                            <Button
                                variant="primary"
                                fullWidth
                                onClick={handleComplete}
                                leftIcon={<CheckCircle size={20} />}
                                className="py-4 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                            >
                                Arrived • Mark Complete
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default FullScreenNavigation;
