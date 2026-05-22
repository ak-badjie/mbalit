'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    ArrowLeft,
    Building2,
    Copy,
    CheckCircle,
    Globe,
    LogOut,
    Lock,
    Camera,
    Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChangePinDialog } from '@/components/auth/change-pin-dialog';
import {
    getOrganizationByOwner,
    updateOrganizationDetails,
} from '@/lib/firestore';
import { compressImage } from '@/lib/image-utils';

export default function OrganizationSettings() {
    const { user, logout } = useAuth();
    const [org, setOrg] = useState<any>(null);
    const [orgName, setOrgName] = useState('');
    const [orgLogo, setOrgLogo] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isChangePinOpen, setIsChangePinOpen] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user?.id) return;
        loadOrg();
    }, [user?.id]);

    const loadOrg = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const orgData = await getOrganizationByOwner(user.id);
            if (orgData) {
                setOrg(orgData);
                setOrgName((orgData as any).name || '');
                setOrgLogo(user.profileImage || null);
            }
        } catch (err) {
            console.error('Failed to load org:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!org?.id) return;
        setIsSaving(true);
        try {
            await updateOrganizationDetails(org.id, { name: orgName });
            setOrg({ ...org, name: orgName });
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                const compressed = await compressImage(base64);
                setOrgLogo(compressed);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCopyCode = () => {
        if (org?.orgCode || org?.id) {
            navigator.clipboard.writeText(org.orgCode || org.id);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = '/auth';
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-gradient-to-br from-gray-50 via-white to-amber-50 pb-16">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/organization/dashboard">
                        <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900">Organization Settings</h1>
                    {isSaving && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="ml-auto flex items-center gap-1 text-xs text-emerald-600"
                        >
                            <CheckCircle className="w-4 h-4" /> Saved
                        </motion.div>
                    )}
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24">
                {/* Organization Profile */}
                <Card variant="elevated" padding="lg">
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white overflow-hidden flex-shrink-0 group"
                        >
                            {orgLogo ? (
                                <img src={orgLogo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <Building2 className="w-8 h-8" />
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="w-5 h-5 text-white" />
                            </div>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                            <input
                                type="text"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <Button
                        variant="primary"
                        fullWidth
                        onClick={handleSave}
                        disabled={isSaving || orgName === org?.name}
                        isLoading={isSaving}
                    >
                        Save Changes
                    </Button>
                </Card>

                {/* Organization Code */}
                <Card variant="elevated" padding="lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Organization Code</h3>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                        <p className="text-xl font-mono font-bold text-gray-900 flex-1">
                            {org?.orgCode || org?.id}
                        </p>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCopyCode}
                            leftIcon={copiedCode ? <CheckCircle size={16} /> : <Copy size={16} />}
                        >
                            {copiedCode ? 'Copied!' : 'Copy'}
                        </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Drivers use this code to join your organization during registration.
                    </p>
                </Card>

                {/* Account */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4">Account</h3>
                    <Card variant="default" padding="none">
                        <button
                            onClick={() => setIsChangePinOpen(true)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="p-2 rounded-xl bg-gray-100">
                                <Lock className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">Change PIN</p>
                                <p className="text-sm text-gray-500">Update your login PIN</p>
                            </div>
                        </button>
                        <div className="border-t border-gray-100" />
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-4 p-4 hover:bg-red-50 transition-colors text-left"
                        >
                            <div className="p-2 rounded-xl bg-red-100">
                                <LogOut className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-red-600">Log Out</p>
                            </div>
                        </button>
                    </Card>
                </div>

                <p className="text-center text-xs text-gray-400 mt-8">MBALit v1.0.0</p>
            </main>

            <ChangePinDialog
                isOpen={isChangePinOpen}
                onClose={() => setIsChangePinOpen(false)}
            />
        </div>
    );
}
