'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
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
    Fingerprint,
    ScanFace,
    Trash2,
    Loader2,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { ChangePinDialog } from '@/components/auth/change-pin-dialog';
import {
    enrollBiometric,
    hasBiometricCredential,
    isBiometricSupported,
    removeBiometric,
} from '@/lib/biometric';
import { DialPad } from '@/components/ui/dial-pad';

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
    disabled?: boolean;
}> = ({ enabled, onToggle, disabled }) => (
    <button
        onClick={() => !disabled && onToggle()}
        disabled={disabled}
        className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-[#0E7A3B]' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
    const [biometricSupported, setBiometricSupported] = useState(false);
    const [biometricOn, setBiometricOn] = useState(false);
    const [biometricBusy, setBiometricBusy] = useState(false);
    const [biometricError, setBiometricError] = useState<string | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            const supported = await isBiometricSupported();
            setBiometricSupported(supported);
            setBiometricOn(hasBiometricCredential(user.id));
        })();
    }, [user?.id]);

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = '/auth';
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    const handleBiometricToggle = async () => {
        if (!user?.id || biometricBusy) return;
        setBiometricBusy(true);
        setBiometricError(null);
        try {
            if (biometricOn) {
                removeBiometric(user.id);
                setBiometricOn(false);
            } else {
                await enrollBiometric({
                    uid: user.id,
                    userName: user.name || user.phone || 'MBalit user',
                });
                setBiometricOn(true);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not update biometric setting.';
            setBiometricError(msg);
        } finally {
            setBiometricBusy(false);
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

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-32">
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
                            <p className="text-sm text-gray-500">{user?.phone}</p>
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
                            icon={isIos ? <ScanFace className="w-5 h-5" /> : <Fingerprint className="w-5 h-5" />}
                            label={isIos ? 'Unlock with Face ID' : 'Unlock with biometrics'}
                            description={
                                !biometricSupported
                                    ? 'Not available on this device or browser'
                                    : biometricOn
                                        ? 'You can use Face ID / Touch ID to unlock MBalit'
                                        : 'Use Face ID / Touch ID instead of your PIN'
                            }
                            onClick={biometricSupported ? handleBiometricToggle : undefined}
                            rightElement={
                                biometricBusy ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-[#0E7A3B]" />
                                ) : (
                                    <ToggleSwitch
                                        enabled={biometricOn}
                                        onToggle={handleBiometricToggle}
                                        disabled={!biometricSupported || biometricBusy}
                                    />
                                )
                            }
                        />
                        {biometricError && (
                            <div className="px-4 pb-3 text-xs text-red-600">{biometricError}</div>
                        )}
                        <div className="border-t border-gray-100" />
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

                {/* Logout + Danger Zone */}
                <div className="space-y-2">
                    <Card variant="default" padding="none">
                        <SettingItem
                            icon={<LogOut className="w-5 h-5" />}
                            label="Log Out"
                            onClick={handleLogout}
                            danger
                        />
                    </Card>

                    <Card variant="default" padding="none">
                        <SettingItem
                            icon={<Trash2 className="w-5 h-5" />}
                            label="Delete Account"
                            description="Permanently wipe your MBalit data"
                            onClick={() => setIsDeleteOpen(true)}
                            danger
                        />
                    </Card>
                </div>

                {/* App Version */}
                <p className="text-center text-xs text-gray-400 mt-8">
                    MBalit v1.0.0
                </p>
            </main>

            <ChangePinDialog
                isOpen={isChangePinOpen}
                onClose={() => setIsChangePinOpen(false)}
            />

            <DeleteAccountDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
            />
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Delete Account confirmation dialog — requires PIN re-entry
// ──────────────────────────────────────────────────────────────────────

function DeleteAccountDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { deleteAccount } = useAuth();
    const [stage, setStage] = useState<'warn' | 'pin' | 'deleting'>('warn');
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            // Reset whenever the dialog closes
            setStage('warn');
            setPin('');
            setError(null);
        }
    }, [isOpen]);

    const handlePinChange = async (val: string) => {
        if (stage === 'deleting') return;
        setPin(val);
        setError(null);
        if (val.length === 6) {
            setStage('deleting');
            try {
                await deleteAccount(val);
                // Auth state cleared inside deleteAccount; bounce to /auth.
                window.location.href = '/auth';
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not delete account.');
                setStage('pin');
                setPin('');
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6"
                    >
                        {stage === 'warn' && (
                            <>
                                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto">
                                    <AlertTriangle className="w-7 h-7" />
                                </div>
                                <h2 className="text-xl font-extrabold text-[#0F1A14] text-center">Delete your account?</h2>
                                <p className="text-sm text-gray-600 mt-2 text-center">
                                    This will permanently wipe your profile, wallet, transactions and saved data from MBalit. <span className="font-semibold text-red-600">This cannot be undone.</span>
                                </p>
                                <ul className="mt-4 space-y-2 text-xs text-gray-600 bg-gray-50 rounded-2xl p-4">
                                    <li>• Your user account + saved addresses</li>
                                    <li>• Wallet balance + transaction history</li>
                                    <li>• Collector profile + biometric setup (if any)</li>
                                    <li>• Notifications and PIN reset requests</li>
                                </ul>
                                <div className="mt-5 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStage('pin')}
                                        className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </>
                        )}

                        {(stage === 'pin' || stage === 'deleting') && (
                            <>
                                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto">
                                    <Lock className="w-7 h-7" />
                                </div>
                                <h2 className="text-xl font-extrabold text-[#0F1A14] text-center">Enter your PIN to confirm</h2>
                                <p className="text-sm text-gray-600 mt-2 text-center">
                                    We need to verify it's really you before wiping your account.
                                </p>

                                <div className="flex gap-2 justify-center mt-5 mb-2">
                                    {[0, 1, 2, 3, 4, 5].map((i) => {
                                        const filled = !!pin[i];
                                        const isActive = i === pin.length;
                                        return (
                                            <div
                                                key={i}
                                                className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold
                                                    ${error
                                                        ? 'border-red-400 bg-red-50 text-red-600'
                                                        : isActive && !filled
                                                            ? 'border-red-600 bg-white text-red-600'
                                                            : filled
                                                                ? 'border-red-600 bg-white text-[#0F1A14]'
                                                                : 'border-gray-200 bg-white text-gray-300'}
                                                `}
                                            >
                                                {filled ? '•' : ''}
                                            </div>
                                        );
                                    })}
                                </div>

                                {error && <p className="text-sm text-red-600 text-center mt-1">{error}</p>}
                                {stage === 'deleting' && (
                                    <div className="mt-3 inline-flex items-center justify-center gap-2 text-sm text-gray-600 w-full">
                                        <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                                        Wiping your account…
                                    </div>
                                )}

                                <div className="mt-4">
                                    <DialPad value={pin} onChange={handlePinChange} maxLength={6} showLetters={false} />
                                </div>

                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={stage === 'deleting'}
                                    className="mt-3 w-full py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
