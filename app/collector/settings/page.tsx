'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Bell,
    Volume2,
    Zap,
    MapPin,
    Palette,
    Globe,
    LogOut,
    ChevronRight,
    Check,
    Moon,
    Sun,
    Truck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { getCollectorSettings, updateCollectorSettings } from '@/lib/firestore';
import { CollectorSettings, WasteType } from '@/types';
import { WASTE_TYPES } from '@/lib/waste-config';

export default function SettingsPage() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const collectorId = user?.id || 'demo-collector';

    const [settings, setSettings] = useState<CollectorSettings>({
        notificationsEnabled: true,
        soundEnabled: true,
        autoAcceptJobs: false,
        maxDistance: 10,
        preferredWasteTypes: [],
        darkMode: false,
        language: 'en',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Load settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await getCollectorSettings(collectorId);
                setSettings(data);
            } catch (err) {
                console.error('Failed to load settings:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, [collectorId]);

    // Save settings
    const handleUpdateSetting = async <K extends keyof CollectorSettings>(
        key: K,
        value: CollectorSettings[K]
    ) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setIsSaving(true);

        try {
            await updateCollectorSettings(collectorId, { [key]: value });
        } catch (err) {
            console.error('Failed to save setting:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await logout();
            router.push('/auth');
        } catch (err) {
            console.error('Sign out failed:', err);
        }
    };

    const ToggleSwitch = ({
        enabled,
        onChange
    }: {
        enabled: boolean;
        onChange: (value: boolean) => void;
    }) => (
        <button
            onClick={() => onChange(!enabled)}
            className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
        >
            <motion.div
                animate={{ x: enabled ? 22 : 4 }}
                className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
            />
        </button>
    );

    const SettingRow = ({
        icon: Icon,
        title,
        description,
        children,
    }: {
        icon: React.ElementType;
        title: string;
        description?: string;
        children: React.ReactNode;
    }) => (
        <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
                    {description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                    )}
                </div>
            </div>
            {children}
        </div>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/collector/dashboard">
                        <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
                    {isSaving && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="ml-auto flex items-center gap-2 text-xs text-emerald-600"
                        >
                            <Check className="w-4 h-4" />
                            Saved
                        </motion.div>
                    )}
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Notifications Section */}
                <Card variant="elevated" padding="none">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    </div>
                    <div className="px-4">
                        <SettingRow
                            icon={Bell}
                            title="Push Notifications"
                            description="Receive alerts for new jobs"
                        >
                            <ToggleSwitch
                                enabled={settings.notificationsEnabled}
                                onChange={(v) => handleUpdateSetting('notificationsEnabled', v)}
                            />
                        </SettingRow>
                        <SettingRow
                            icon={Volume2}
                            title="Sound"
                            description="Play sound for notifications"
                        >
                            <ToggleSwitch
                                enabled={settings.soundEnabled}
                                onChange={(v) => handleUpdateSetting('soundEnabled', v)}
                            />
                        </SettingRow>
                    </div>
                </Card>

                {/* Job Preferences Section */}
                <Card variant="elevated" padding="none">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Job Preferences</h3>
                    </div>
                    <div className="px-4">
                        <SettingRow
                            icon={Zap}
                            title="Auto-Accept Jobs"
                            description="Automatically accept nearby jobs"
                        >
                            <ToggleSwitch
                                enabled={settings.autoAcceptJobs}
                                onChange={(v) => handleUpdateSetting('autoAcceptJobs', v)}
                            />
                        </SettingRow>
                        <SettingRow
                            icon={MapPin}
                            title="Maximum Distance"
                            description="Only show jobs within this range"
                        >
                            <select
                                value={settings.maxDistance}
                                onChange={(e) => handleUpdateSetting('maxDistance', Number(e.target.value))}
                                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 border-0 focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value={5}>5 km</option>
                                <option value={10}>10 km</option>
                                <option value={15}>15 km</option>
                                <option value={20}>20 km</option>
                                <option value={50}>50 km</option>
                            </select>
                        </SettingRow>
                        <div className="py-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <Truck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white">Waste Types</h4>
                                    <p className="text-xs text-gray-500">Select types you handle</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 ml-14">
                                {WASTE_TYPES.map((type) => {
                                    const isSelected = settings.preferredWasteTypes.includes(type.id);
                                    return (
                                        <button
                                            key={type.id}
                                            onClick={() => {
                                                const newTypes = isSelected
                                                    ? settings.preferredWasteTypes.filter(t => t !== type.id)
                                                    : [...settings.preferredWasteTypes, type.id];
                                                handleUpdateSetting('preferredWasteTypes', newTypes);
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isSelected
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                                }`}
                                        >
                                            {type.icon} {type.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Appearance Section */}
                <Card variant="elevated" padding="none">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Appearance</h3>
                    </div>
                    <div className="px-4">
                        <SettingRow
                            icon={settings.darkMode ? Moon : Sun}
                            title="Dark Mode"
                            description="Switch between light and dark theme"
                        >
                            <ToggleSwitch
                                enabled={settings.darkMode}
                                onChange={(v) => handleUpdateSetting('darkMode', v)}
                            />
                        </SettingRow>
                        <SettingRow
                            icon={Globe}
                            title="Language"
                            description="Choose your preferred language"
                        >
                            <select
                                value={settings.language}
                                onChange={(e) => handleUpdateSetting('language', e.target.value as 'en' | 'wo' | 'ff')}
                                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 border-0 focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="en">English</option>
                                <option value="wo">Wolof</option>
                                <option value="ff">Fula</option>
                            </select>
                        </SettingRow>
                    </div>
                </Card>

                {/* Account Section */}
                <Card variant="elevated" padding="none">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Account</h3>
                    </div>
                    <div className="px-4">
                        <Link href="/collector/profile">
                            <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-4 px-4 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">Edit Profile</h4>
                                        <p className="text-xs text-gray-500">Update your location and details</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                        </Link>
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center justify-between py-4 text-left hover:bg-red-50 dark:hover:bg-red-900/10 -mx-4 px-4 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <LogOut className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-red-600">Sign Out</h4>
                                    <p className="text-xs text-gray-500">Log out of your account</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </Card>
            </main>
        </div>
    );
}
