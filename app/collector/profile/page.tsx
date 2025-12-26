'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Camera,
    MapPin,
    Phone,
    Mail,
    Truck,
    Star,
    Edit3,
    Check,
    X,
    Save,
    Shield,
    Award,
    Package,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import {
    getCollectorProfile,
    updateCollectorProfile,
    getReviewsForUser,
    getReviewsGivenByUser,
    getCollectorStats,
} from '@/lib/firestore';
import { CollectorProfile, Review, CollectorStats, GeoLocation, WasteType } from '@/types';
import { WASTE_TYPES } from '@/lib/waste-config';
import { ProfileLocationMap } from '@/components/maps/profile-location-map';
import { ReviewCard, AverageRating } from '@/components/ui/review-card';

const GAMBIA_AREAS = [
    'Banjul', 'Serrekunda', 'Bakau', 'Brikama', 'Farafenni',
    'Lamin', 'Sukuta', 'Kololi', 'Kotu', 'Bijilo',
    'Brufut', 'Tanji', 'Gunjur', 'Sanyang', 'Kartong'
];

export default function ProfilePage() {
    const { user } = useAuth();
    const collectorId = user?.id || 'demo-collector';

    const [profile, setProfile] = useState<CollectorProfile | null>(null);
    const [stats, setStats] = useState<CollectorStats | null>(null);
    const [reviewsReceived, setReviewsReceived] = useState<Review[]>([]);
    const [reviewsGiven, setReviewsGiven] = useState<Review[]>([]);
    const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [editForm, setEditForm] = useState({
        displayName: '',
        bio: '',
        phone: '',
        vehicleType: 'motorcycle' as CollectorProfile['vehicleType'],
        vehicleCapacity: '',
        wasteTypesHandled: [] as WasteType[],
    });

    // Load profile and reviews
    useEffect(() => {
        const loadData = async () => {
            try {
                const [profileData, statsData, received, given] = await Promise.all([
                    getCollectorProfile(collectorId),
                    getCollectorStats(collectorId),
                    getReviewsForUser(collectorId),
                    getReviewsGivenByUser(collectorId),
                ]);

                if (profileData) {
                    setProfile(profileData);
                    setEditForm({
                        displayName: profileData.displayName,
                        bio: profileData.bio,
                        phone: profileData.phone,
                        vehicleType: profileData.vehicleType,
                        vehicleCapacity: profileData.vehicleCapacity,
                        wasteTypesHandled: profileData.wasteTypesHandled || [],
                    });
                }
                setStats(statsData);
                setReviewsReceived(received);
                setReviewsGiven(given);
            } catch (err) {
                console.error('Failed to load profile:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [collectorId]);

    const handleLocationChange = async (location: GeoLocation) => {
        if (profile) {
            setProfile({ ...profile, preciseLocation: location });
            try {
                await updateCollectorProfile(collectorId, { preciseLocation: location });
            } catch (err) {
                console.error('Failed to update location:', err);
            }
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await updateCollectorProfile(collectorId, editForm);
            setProfile(prev => prev ? { ...prev, ...editForm } : null);
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to save profile:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleWasteType = (wasteType: WasteType) => {
        setEditForm(prev => ({
            ...prev,
            wasteTypesHandled: prev.wasteTypesHandled.includes(wasteType)
                ? prev.wasteTypesHandled.filter(w => w !== wasteType)
                : [...prev.wasteTypesHandled, wasteType],
        }));
    };

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
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/collector/dashboard">
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
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                leftIcon={<Save size={16} />}
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Profile Header */}
                <Card variant="elevated" padding="lg">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                {profile?.profileImage ? (
                                    <img
                                        src={profile.profileImage}
                                        alt={profile.displayName}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    (profile?.displayName || 'U').charAt(0).toUpperCase()
                                )}
                            </div>
                            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.displayName}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                                    className="text-2xl font-bold bg-transparent border-b-2 border-emerald-500 focus:outline-none text-gray-900 dark:text-white w-full"
                                    placeholder="Your name"
                                />
                            ) : (
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {profile?.displayName || 'Set your name'}
                                </h2>
                            )}

                            <div className="flex items-center justify-center sm:justify-start gap-4 mt-2 text-sm text-gray-500">
                                {stats && (
                                    <>
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                            <span>{stats.averageRating.toFixed(1)}</span>
                                        </div>
                                        <span>•</span>
                                        <span>{stats.totalReviews} reviews</span>
                                    </>
                                )}
                                {profile?.isVerified && (
                                    <>
                                        <span>•</span>
                                        <div className="flex items-center gap-1 text-emerald-600">
                                            <Shield className="w-4 h-4" />
                                            <span>Verified</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {isEditing ? (
                                <textarea
                                    value={editForm.bio}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                    className="mt-3 w-full p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Tell customers about yourself..."
                                    rows={2}
                                />
                            ) : (
                                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                                    {profile?.bio || 'Add a bio to tell customers about yourself'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-gray-400" />
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                    className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Phone number"
                                />
                            ) : (
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {profile?.phone || 'Add phone'}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                {profile?.email || user?.email || 'No email'}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Precise Location Map */}
                <Card variant="elevated" padding="none" className="overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                Precise Location
                            </h3>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Drag the pin to set your exact location
                        </span>
                    </div>
                    <ProfileLocationMap
                        location={profile?.preciseLocation}
                        onLocationChange={handleLocationChange}
                        editable={true}
                        height="350px"
                    />
                </Card>

                {/* Vehicle & Service Areas */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Vehicle Info */}
                    <Card variant="elevated" padding="md">
                        <div className="flex items-center gap-2 mb-4">
                            <Truck className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Vehicle</h3>
                        </div>

                        {isEditing ? (
                            <div className="space-y-3">
                                <select
                                    value={editForm.vehicleType}
                                    onChange={(e) => setEditForm(prev => ({
                                        ...prev,
                                        vehicleType: e.target.value as CollectorProfile['vehicleType']
                                    }))}
                                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="bicycle">🚲 Bicycle</option>
                                    <option value="motorcycle">🏍️ Motorcycle</option>
                                    <option value="tricycle">🛺 Tricycle</option>
                                    <option value="truck">🚛 Truck</option>
                                </select>
                                <input
                                    type="text"
                                    value={editForm.vehicleCapacity}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, vehicleCapacity: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Capacity (e.g., 100kg, 1 ton)"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-2xl">
                                    {profile?.vehicleType === 'bicycle' && '🚲'}
                                    {profile?.vehicleType === 'motorcycle' && '🏍️'}
                                    {profile?.vehicleType === 'tricycle' && '🛺'}
                                    {profile?.vehicleType === 'truck' && '🚛'}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                                        {profile?.vehicleType || 'Not set'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {profile?.vehicleCapacity || 'Set capacity'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Waste Types Handled */}
                    <Card variant="elevated" padding="md">
                        <div className="flex items-center gap-2 mb-4">
                            <Package className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Waste Types Handled</h3>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {(isEditing ? WASTE_TYPES : WASTE_TYPES.filter(w => (profile?.wasteTypesHandled || []).includes(w.id))).map((wasteType) => {
                                const isSelected = editForm.wasteTypesHandled.includes(wasteType.id);
                                return (
                                    <button
                                        key={wasteType.id}
                                        onClick={() => isEditing && toggleWasteType(wasteType.id)}
                                        disabled={!isEditing}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${isEditing
                                            ? isSelected
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                            }`}
                                    >
                                        <span>{wasteType.icon}</span>
                                        {wasteType.name}
                                    </button>
                                );
                            })}
                            {!isEditing && (!profile?.wasteTypesHandled || profile.wasteTypesHandled.length === 0) && (
                                <p className="text-sm text-gray-500">No waste types set</p>
                            )}
                        </div>
                    </Card>

                    {/* Your Location */}
                    <Card variant="elevated" padding="md">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Your Location</h3>
                        </div>
                        <ProfileLocationMap
                            location={profile?.preciseLocation}
                            onLocationChange={handleLocationChange}
                            height="300px"
                        />
                    </Card>
                </div>

                {/* Reviews Section */}
                <Card variant="elevated" padding="none">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-400" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Reviews</h3>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 dark:border-gray-800">
                        <button
                            onClick={() => setActiveTab('received')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'received'
                                ? 'text-emerald-600 border-b-2 border-emerald-500'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Reviews About Me ({reviewsReceived.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('given')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'given'
                                ? 'text-emerald-600 border-b-2 border-emerald-500'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Reviews I Gave ({reviewsGiven.length})
                        </button>
                    </div>

                    {/* Average Rating */}
                    {activeTab === 'received' && stats && (
                        <div className="p-4">
                            <AverageRating rating={stats.averageRating} totalReviews={stats.totalReviews} />
                        </div>
                    )}

                    {/* Reviews List */}
                    <div className="p-4 space-y-4">
                        <AnimatePresence mode="wait">
                            {activeTab === 'received' ? (
                                reviewsReceived.length > 0 ? (
                                    reviewsReceived.map((review) => (
                                        <ReviewCard key={review.id} review={review} showReplyButton />
                                    ))
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-8"
                                    >
                                        <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No reviews yet</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Complete jobs to receive reviews from customers
                                        </p>
                                    </motion.div>
                                )
                            ) : (
                                reviewsGiven.length > 0 ? (
                                    reviewsGiven.map((review) => (
                                        <ReviewCard key={review.id} review={review} />
                                    ))
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-8"
                                    >
                                        <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No reviews given yet</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Rate customers after completing jobs
                                        </p>
                                    </motion.div>
                                )
                            )}
                        </AnimatePresence>
                    </div>
                </Card>
            </main>
        </div>
    );
}
