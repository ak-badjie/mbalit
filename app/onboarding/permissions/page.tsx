'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    MapPin,
    Bell,
    Camera,
    Users,
    Mic,
    ArrowRight,
} from 'lucide-react';
import { PermissionCard } from '@/components/ui/permission-card';
import { MbButton } from '@/components/ui/mb-button';
import { SecureFooter } from '@/components/ui/secure-footer';

interface PermissionState {
    location: boolean;
    notifications: boolean;
    camera: boolean;
    contacts: boolean;
    microphone: boolean;
}

/**
 * Personalize permissions onboarding — Mockup 5.
 * Lightweight UI shell that requests browser permissions when toggled.
 */
export default function PermissionsOnboarding() {
    const router = useRouter();
    const [granted, setGranted] = useState<PermissionState>({
        location: true,
        notifications: true,
        camera: false,
        contacts: false,
        microphone: false,
    });

    const toggle = (key: keyof PermissionState) => async () => {
        // Request native permission for the optional ones
        if (key === 'notifications' && 'Notification' in window) {
            try {
                const res = await Notification.requestPermission();
                setGranted((g) => ({ ...g, notifications: res === 'granted' }));
                return;
            } catch {
                /* fallthrough */
            }
        }
        if (key === 'location' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                () => setGranted((g) => ({ ...g, location: true })),
                () => setGranted((g) => ({ ...g, location: false })),
            );
            return;
        }
        if (key === 'camera' && navigator.mediaDevices?.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach((t) => t.stop());
                setGranted((g) => ({ ...g, camera: true }));
                return;
            } catch {
                setGranted((g) => ({ ...g, camera: false }));
                return;
            }
        }
        if (key === 'microphone' && navigator.mediaDevices?.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach((t) => t.stop());
                setGranted((g) => ({ ...g, microphone: true }));
                return;
            } catch {
                setGranted((g) => ({ ...g, microphone: false }));
                return;
            }
        }
        setGranted((g) => ({ ...g, [key]: !g[key] }));
    };

    const finish = () => router.push('/dashboard');

    return (
        <div className="min-h-[100dvh] bg-white flex flex-col">
            {/* Top bar */}
            <div className="flex items-center px-5 pt-12 pb-2">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full hover:bg-gray-50 text-[#0E7A3B]"
                    aria-label="Go back"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 px-5 pb-6">
                {/* Heading + recycle illustration */}
                <div className="relative flex items-start justify-between gap-3 mb-5">
                    <div className="flex-1 pt-1 z-10">
                        <img src="/logo.png" alt="MBalit" className="w-12 h-12 mb-2 object-contain" />
                        <p className="font-extrabold text-[#0E7A3B] text-base leading-tight mb-3">MBalit</p>
                        <h1 className="text-[26px] font-extrabold text-[#0F1A14] leading-tight">
                            Let&apos;s Personalize<br />Your Experience
                        </h1>
                        <p className="text-sm text-gray-500 mt-2 max-w-[16rem] leading-snug">
                            Allow the following permissions to help us serve you better and keep your city clean and green.
                        </p>
                    </div>
                    <div className="absolute right-0 top-0 w-40 h-36 sm:w-52 sm:h-40 flex-shrink-0 overflow-hidden rounded-2xl pointer-events-none">
                        <img
                            src="/illustrations/permissions-hero.jpg"
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ objectPosition: '85% center' }}
                        />
                    </div>
                </div>

                {/* Permission cards */}
                <div className="space-y-3">
                    <PermissionCard
                        icon={<MapPin className="w-5 h-5" />}
                        title="Location Access"
                        description="Helps us provide accurate location-based services and route scheduling."
                        required
                        granted={granted.location}
                        onToggle={toggle('location')}
                    />
                    <PermissionCard
                        icon={<Bell className="w-5 h-5" />}
                        title="Push Notifications"
                        description="Stay updated with collection alerts, reminders and important updates."
                        required
                        granted={granted.notifications}
                        onToggle={toggle('notifications')}
                    />
                    <PermissionCard
                        icon={<Camera className="w-5 h-5" />}
                        title="Camera Access"
                        description="Allow photos for reporting issues and waste pickup verification."
                        granted={granted.camera}
                        onToggle={toggle('camera')}
                    />
                    <PermissionCard
                        icon={<Users className="w-5 h-5" />}
                        title="Contacts Access"
                        description="Easily invite friends and family to join MbalitApp."
                        granted={granted.contacts}
                        onToggle={toggle('contacts')}
                    />
                    <PermissionCard
                        icon={<Mic className="w-5 h-5" />}
                        title="Microphone Access"
                        description="Use voice commands to report issues and get assistance."
                        granted={granted.microphone}
                        onToggle={toggle('microphone')}
                    />
                </div>

                {/* Reassurance */}
                <div className="mt-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F1FAF4]">
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M12 1l8 4v7c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-4z" stroke="#0E7A3B" strokeWidth="2" strokeLinejoin="round"/>
                            <path d="M9 12l2 2 4-4" stroke="#0E7A3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <p className="text-xs text-gray-600 leading-snug">
                        You can change these permissions anytime in app settings.
                    </p>
                </div>

                {/* Buttons */}
                <motion.div className="mt-5 space-y-3">
                    <MbButton
                        size="lg"
                        rightIcon={<ArrowRight className="w-5 h-5" />}
                        onClick={finish}
                    >
                        Continue
                    </MbButton>
                    <MbButton size="lg" variant="outline" onClick={finish}>
                        Maybe Later
                    </MbButton>
                </motion.div>

                <SecureFooter className="mt-4" />
            </div>
        </div>
    );
}
