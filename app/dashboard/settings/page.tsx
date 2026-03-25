'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    User,
    Bell,
    Lock,
    CreditCard,
    HelpCircle,
    FileText,
    LogOut,
    ChevronRight,
    Phone,
    Mail,
    MapPin,
    Shield,
    Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { ChangePinDialog } from '@/components/auth/change-pin-dialog';

// Setting Item Component
const SettingItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    description?: string;
    onClick?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
}> = ({ icon, label, description, onClick, rightElement, danger }) => {
    const content = (
        <>
            <div className={`p-2 rounded-xl ${danger ? 'bg-red-100' : 'bg-gray-100'}`}>
                <div className={danger ? 'text-red-600' : 'text-gray-600'}>
                    {icon}
                </div>
            </div>
            <div className="flex-1 text-left">
                <p className={`font-medium ${danger ? 'text-red-600' : 'text-gray-900'}`}>
                    {label}
                </p>
                {description && (
                    <p className="text-sm text-gray-500">{description}</p>
                )}
            </div>
            {rightElement || (onClick && <ChevronRight className="w-5 h-5 text-gray-400" />)}
        </>
    );

    if (rightElement) {
        return (
            <motion.div
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors ${onClick ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
            >
                {content}
            </motion.div>
        );
    }

    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            disabled={!onClick}
            className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors ${onClick ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
        >
            {content}
        </motion.button>
    );
};

// Toggle Switch Component
const ToggleSwitch: React.FC<{
    enabled: boolean;
    onToggle: () => void;
}> = ({ enabled, onToggle }) => (
    <button
        onClick={onToggle}
        className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
        <motion.div
            initial={false}
            animate={{ x: enabled ? 22 : 4 }}
            className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
        />
    </button>
);

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const [notifications, setNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [isChangePinOpen, setIsChangePinOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = '/auth';
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    return (
        <div className="min-h-full bg-gradient-to-br from-gray-50 via-white to-emerald-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/dashboard">
                        <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
                {/* Profile Section */}
                <Card variant="elevated" padding="lg">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                            {user?.profileImage ? (
                                <img src={user.profileImage} alt={user.name || 'Profile'} className="w-full h-full object-cover" />
                            ) : (
                                (user?.name || 'U').charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-gray-900">
                                {user?.name || 'User'}
                            </h2>
                            <p className="text-sm text-gray-500">{user?.email}</p>
                        </div>
                        <Link href="/dashboard/profile">
                            <Button variant="secondary" size="sm">Edit</Button>
                        </Link>
                    </div>
                </Card>

                {/* Notifications */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4">
                        Notifications
                    </h3>
                    <Card variant="default" padding="none">
                        <SettingItem
                            icon={<Bell className="w-5 h-5" />}
                            label="Push Notifications"
                            description="Get notified about pickups"
                            onClick={() => setNotifications(!notifications)}
                            rightElement={<ToggleSwitch enabled={notifications} onToggle={() => setNotifications(!notifications)} />}
                        />
                        <div className="border-t border-gray-100" />
                        <SettingItem
                            icon={<Mail className="w-5 h-5" />}
                            label="Email Notifications"
                            description="Receive email updates"
                            onClick={() => setEmailNotifications(!emailNotifications)}
                            rightElement={<ToggleSwitch enabled={emailNotifications} onToggle={() => setEmailNotifications(!emailNotifications)} />}
                        />
                    </Card>
                </div>

                {/* Account */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4">
                        Account
                    </h3>
                    <Card variant="default" padding="none">
                        <SettingItem
                            icon={<Phone className="w-5 h-5" />}
                            label="Phone Number"
                            description={user?.phone || 'Not set'}
                        />
                        <div className="border-t border-gray-100" />
                        <SettingItem
                            icon={<MapPin className="w-5 h-5" />}
                            label="Saved Locations"
                            description="Manage your addresses"
                            onClick={() => { }}
                        />
                        <div className="border-t border-gray-100" />
                        <SettingItem
                            icon={<CreditCard className="w-5 h-5" />}
                            label="Payment Methods"
                            description="Manage payment options"
                            onClick={() => { }}
                        />
                        <div className="border-t border-gray-100" />
                        <SettingItem
                            icon={<Lock className="w-5 h-5" />}
                            label="Change PIN"
                            description="Update your login PIN"
                            onClick={() => setIsChangePinOpen(true)}
                        />
                    </Card>
                </div>

                {/* Security */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4">
                        Security & Privacy
                    </h3>
                    <Card variant="default" padding="none">
                        <SettingItem
                            icon={<Shield className="w-5 h-5" />}
                            label="Privacy Settings"
                            onClick={() => { }}
                        />
                        <div className="border-t border-gray-100" />
                        <SettingItem
                            icon={<Globe className="w-5 h-5" />}
                            label="Language"
                            description="English"
                            onClick={() => { }}
                        />
                    </Card>
                </div>

                {/* Support */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4">
                        Support
                    </h3>
                    <Card variant="default" padding="none">
                        <SettingItem
                            icon={<HelpCircle className="w-5 h-5" />}
                            label="Help Center"
                            onClick={() => { }}
                        />
                        <div className="border-t border-gray-100" />
                        <SettingItem
                            icon={<FileText className="w-5 h-5" />}
                            label="Terms of Service"
                            onClick={() => { }}
                        />
                        <div className="border-t border-gray-100" />
                        <SettingItem
                            icon={<FileText className="w-5 h-5" />}
                            label="Privacy Policy"
                            onClick={() => { }}
                        />
                    </Card>
                </div>

                {/* Logout */}
                <Card variant="default" padding="none">
                    <SettingItem
                        icon={<LogOut className="w-5 h-5" />}
                        label="Log Out"
                        onClick={handleLogout}
                        danger
                    />
                </Card>

                {/* App Version */}
                <p className="text-center text-xs text-gray-400 mt-8">
                    MBALit v1.0.0
                </p>
            </main>

            <ChangePinDialog
                isOpen={isChangePinOpen}
                onClose={() => setIsChangePinOpen(false)}
            />
        </div>
    );
}
