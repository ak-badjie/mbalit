'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Camera,
    User,
    Mail,
    Phone,
    Building2,
    MapPin,
    Save,
    Edit3,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ProfilePage() {
    const { user, firebaseUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [profileImage, setProfileImage] = useState(user?.profileImage || '');

    // Handle image upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Save profile
    const handleSave = async () => {
        if (!firebaseUser) return;

        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
                name,
                phone,
                profileImage,
                updatedAt: serverTimestamp(),
            });
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to save profile:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </Link>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Profile</h1>
                    </div>
                    {!isEditing ? (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                            leftIcon={<Edit3 size={16} />}
                        >
                            Edit
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(false)}
                                leftIcon={<X size={16} />}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving}
                                leftIcon={<Save size={16} />}
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
                {/* Profile Picture */}
                <Card variant="elevated" padding="lg">
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-4xl font-bold overflow-hidden shadow-lg">
                                {profileImage ? (
                                    <img src={profileImage} alt={name || 'Profile'} className="w-full h-full object-cover" />
                                ) : (
                                    (name || 'U').charAt(0).toUpperCase()
                                )}
                            </div>
                            {isEditing && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 w-10 h-10 bg-emerald-500 rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-600 transition-colors"
                                >
                                    <Camera className="w-5 h-5 text-white" />
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </div>
                        <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                            {user?.name || 'User'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {(user as any)?.accountType === 'individual' ? 'Individual Account' :
                                (user as any)?.accountType === 'business' ? 'Business Account' :
                                    (user as any)?.accountType === 'corporate' ? 'Corporate Account' : 'Account'}
                        </p>
                    </div>
                </Card>

                {/* Profile Details */}
                <Card variant="elevated" padding="lg">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        Personal Information
                    </h3>
                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Full Name
                            </label>
                            {isEditing ? (
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <User className="w-5 h-5 text-gray-400" />
                                    <span className="text-gray-900 dark:text-white">{user?.name || 'Not set'}</span>
                                </div>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email Address
                            </label>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <Mail className="w-5 h-5 text-gray-400" />
                                <span className="text-gray-900 dark:text-white">{user?.email || 'Not set'}</span>
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Phone Number
                            </label>
                            {isEditing ? (
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <Phone className="w-5 h-5 text-gray-400" />
                                    <span className="text-gray-900 dark:text-white">{user?.phone || 'Not set'}</span>
                                </div>
                            )}
                        </div>

                        {/* Organization Name (if applicable) */}
                        {(user as any)?.organizationName && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Organization
                                </label>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <Building2 className="w-5 h-5 text-gray-400" />
                                    <span className="text-gray-900 dark:text-white">{(user as any).organizationName}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Saved Locations */}
                <Card variant="elevated" padding="lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Saved Locations
                        </h3>
                        <Button variant="secondary" size="sm">Add</Button>
                    </div>
                    <div className="text-center py-8">
                        <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">No saved locations yet</p>
                        <p className="text-xs text-gray-400 mt-1">Add your frequently used pickup locations</p>
                    </div>
                </Card>
            </main>
        </div>
    );
}
