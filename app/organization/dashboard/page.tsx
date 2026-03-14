'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    Building2,
    Users,
    DollarSign,
    Wallet,
    Star,
    CheckCircle,
    XCircle,
    Copy,
    Settings,
    TrendingUp,
    LogOut,
    ArrowDownToLine,
    Loader2,
    UserPlus,
    MapPin,
    Power,
    Package,
    Navigation,
    Clock,
    Phone,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapView } from '@/components/maps/map-view';
import { ProfileLocationMap } from '@/components/maps/profile-location-map';
import { formatPrice, WASTE_TYPES } from '@/lib/waste-config';
import { GeoLocation } from '@/types';
import {
    getOrganizationByOwner,
    getOrganizationMembers,
    approveMember,
    removeMember,
} from '@/lib/firestore';
import {
    updateCollectorLocation,
    setCollectorOnlineStatus,
    subscribeToPendingJobs,
    assignCollectorToJob,
    updateJobStatus,
    RealtimeJob,
} from '@/lib/realtime';

// Haversine distance calculation (km)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateTravelTime(distanceKm: number): string {
    const minutes = Math.round((distanceKm / 25) * 60);
    if (minutes < 1) return '< 1 min';
    if (minutes >= 60) return `${Math.round(minutes / 60)}h ${minutes % 60}m`;
    return `${minutes} min`;
}

function formatDistance(distanceKm: number): string {
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
    return `${distanceKm.toFixed(1)} km`;
}

type TabType = 'driver' | 'organization';

export default function OrganizationDashboard() {
    const { user, logout } = useAuth();
    const collectorId = user?.id || '';

    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('driver');

    // Org state
    const [org, setOrg] = useState<any>(null);
    const [approvedMembers, setApprovedMembers] = useState<any[]>([]);
    const [pendingMembers, setPendingMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedCode, setCopiedCode] = useState(false);
    const [processingMember, setProcessingMember] = useState<string | null>(null);

    // Driver state
    const [isOnline, setIsOnline] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(null);
    const [pendingJobs, setPendingJobs] = useState<RealtimeJob[]>([]);
    const [activeJob, setActiveJob] = useState<RealtimeJob | null>(null);

    // Load org data
    useEffect(() => {
        if (!user?.id) return;
        loadOrganization();
    }, [user?.id]);

    // Subscribe to pending jobs when online
    useEffect(() => {
        if (!isOnline || !currentLocation) return;
        const unsub = subscribeToPendingJobs(currentLocation, new Set(), (jobs) => {
            setPendingJobs(jobs);
        });
        return () => unsub();
    }, [isOnline, currentLocation]);

    const loadOrganization = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const orgData = await getOrganizationByOwner(user.id);
            if (orgData) {
                setOrg(orgData);
                const members = await getOrganizationMembers(orgData.id);
                setApprovedMembers(members.approved);
                setPendingMembers(members.pending);
            }
        } catch (err) {
            console.error('Failed to load org:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleOnline = async () => {
        const newStatus = !isOnline;
        setIsOnline(newStatus);
        if (collectorId) {
            await setCollectorOnlineStatus(collectorId, newStatus);
            if (newStatus && currentLocation) {
                await updateCollectorLocation(collectorId, currentLocation);
            }
        }
    };

    const handleAcceptJob = async (job: RealtimeJob) => {
        try {
            await assignCollectorToJob(job.id, collectorId);
            await updateJobStatus(job.id, 'accepted');
            setActiveJob({ ...job, collectorId, status: 'accepted' });
        } catch (err) {
            console.error('Failed to accept job:', err);
        }
    };

    const handleCopyCode = () => {
        if (org?.orgCode || org?.id) {
            navigator.clipboard.writeText(org.orgCode || org.id);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        }
    };

    const handleApproveMember = async (memberId: string) => {
        if (!org?.id) return;
        setProcessingMember(memberId);
        try {
            await approveMember(org.id, memberId);
            await loadOrganization();
        } catch (err) {
            console.error('Failed to approve member:', err);
        } finally {
            setProcessingMember(null);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!org?.id) return;
        setProcessingMember(memberId);
        try {
            await removeMember(org.id, memberId);
            await loadOrganization();
        } catch (err) {
            console.error('Failed to remove member:', err);
        } finally {
            setProcessingMember(null);
        }
    };

    const handleLogout = async () => {
        if (isOnline) await setCollectorOnlineStatus(collectorId, false);
        await logout();
        window.location.href = '/auth';
    };

    const getWasteTypeInfo = (wasteTypeId?: string, wasteTypes?: string[]) => {
        if (wasteTypes && wasteTypes.length > 0) {
            const types = wasteTypes.map(id => WASTE_TYPES.find(t => t.id === id)).filter(Boolean);
            if (types.length > 0) return { name: types.map(t => t!.name).join(', '), icon: types[0]!.icon };
        }
        return WASTE_TYPES.find(t => t.id === wasteTypeId) || { name: wasteTypeId || 'General Waste', icon: '📦' };
    };

    const getContainerSummary = (job: RealtimeJob) => {
        const parts: string[] = [];
        if (job.bucketCount && job.bucketCount > 0) parts.push(`${job.bucketCount} Bucket${job.bucketCount > 1 ? 's' : ''}`);
        if (job.largeBinCount && job.largeBinCount > 0) parts.push(`${job.largeBinCount} Large Bin${job.largeBinCount > 1 ? 's' : ''}`);
        return parts.length > 0 ? parts.join(', ') : job.wasteSize || 'Standard';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold overflow-hidden">
                                {user?.profileImage ? (
                                    <img src={user.profileImage} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 className="w-5 h-5" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">{org?.name || 'Organization'}</h1>
                                <p className="text-xs text-gray-500">{isOnline ? '🟢 Online' : '⚫ Offline'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Go Online Toggle */}
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleOnline}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                                    isOnline
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                        : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                <Power className="w-4 h-4" />
                                {isOnline ? 'Online' : 'Go Online'}
                            </motion.button>
                            <Link href="/organization/settings">
                                <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                                    <Settings className="w-5 h-5 text-gray-600" />
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        <button
                            onClick={() => setActiveTab('driver')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'driver'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            🚛 Driver
                        </button>
                        <button
                            onClick={() => setActiveTab('organization')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'organization'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span className="flex items-center justify-center gap-1">
                                🏢 Organization
                                {pendingMembers.length > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                                        {pendingMembers.length}
                                    </span>
                                )}
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
                {/* ==================== DRIVER TAB ==================== */}
                {activeTab === 'driver' && (
                    <>
                        {/* Active Job */}
                        {activeJob && (
                            <Card variant="elevated" padding="lg" className="border-2 border-emerald-500">
                                <div className="flex items-center gap-2 mb-3">
                                    <Package className="w-5 h-5 text-emerald-500" />
                                    <h3 className="font-bold text-gray-900">Active Pickup</h3>
                                    <Badge variant="success">In Progress</Badge>
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-2xl">{getWasteTypeInfo(activeJob.wasteType, activeJob.wasteTypes).icon}</span>
                                    <div>
                                        <p className="font-semibold text-gray-900">{getWasteTypeInfo(activeJob.wasteType, activeJob.wasteTypes).name}</p>
                                        <p className="text-sm text-gray-500">{getContainerSummary(activeJob)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4" />
                                    <span>{activeJob.pickupLocation.formattedAddress}</span>
                                </div>
                                <div className="mt-3 p-3 bg-emerald-50 rounded-xl">
                                    <p className="text-2xl font-bold text-emerald-600">{formatPrice(activeJob.amount)}</p>
                                </div>
                            </Card>
                        )}

                        {/* Map */}
                        <Card variant="elevated" padding="md">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-emerald-500" />
                                    <h3 className="font-semibold text-gray-900">Your Location</h3>
                                </div>
                                {isOnline && currentLocation && (
                                    <Badge variant="success" className="flex items-center gap-1">
                                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                        Live
                                    </Badge>
                                )}
                            </div>
                            <ProfileLocationMap
                                location={currentLocation || undefined}
                                onLocationChange={(loc) => setCurrentLocation(loc)}
                                onPreciseLocationAcquired={() => {
                                    console.log('Precise location acquired');
                                }}
                            />
                        </Card>

                        {/* Nearby Orders */}
                        {pendingJobs.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-semibold text-gray-900">Nearby Orders</h3>
                                    </div>
                                    <Badge variant="default" className="bg-emerald-100 text-emerald-700">
                                        {pendingJobs.length} available
                                    </Badge>
                                </div>
                                <div className="space-y-3">
                                    {pendingJobs.map((job) => {
                                        const dist = currentLocation
                                            ? haversineDistance(currentLocation.lat, currentLocation.lng, job.pickupLocation.lat, job.pickupLocation.lng)
                                            : null;
                                        const time = dist !== null ? estimateTravelTime(dist) : null;

                                        return (
                                            <Card key={job.id} variant="default" padding="md" className="border border-gray-100">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                                                        {job.customerProfileImage ? (
                                                            <img src={job.customerProfileImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            (job.customerName?.charAt(0) || '?').toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-lg">{getWasteTypeInfo(job.wasteType, job.wasteTypes).icon}</span>
                                                            <p className="font-semibold text-gray-900 text-sm truncate">
                                                                {getWasteTypeInfo(job.wasteType, job.wasteTypes).name}
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-gray-500 truncate">{getContainerSummary(job)}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {dist !== null && (
                                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                                    <Navigation className="w-3 h-3" />{formatDistance(dist)}
                                                                </span>
                                                            )}
                                                            {time !== null && (
                                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                                    <Clock className="w-3 h-3" />{time}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                        <p className="text-lg font-bold text-emerald-600">{formatPrice(job.amount)}</p>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handleAcceptJob(job)}
                                                            leftIcon={<CheckCircle size={14} />}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-xs px-3"
                                                        >
                                                            Accept
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Empty state when online but no jobs */}
                        {isOnline && pendingJobs.length === 0 && !activeJob && (
                            <Card variant="default" padding="lg" className="text-center">
                                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">No nearby orders</p>
                                <p className="text-xs text-gray-400 mt-1">New orders will appear here</p>
                            </Card>
                        )}

                        {/* Offline state */}
                        {!isOnline && (
                            <Card variant="default" padding="lg" className="text-center">
                                <Power className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">You&apos;re offline</p>
                                <p className="text-xs text-gray-400 mt-1">Go online to start receiving orders</p>
                            </Card>
                        )}
                    </>
                )}

                {/* ==================== ORGANIZATION TAB ==================== */}
                {activeTab === 'organization' && (
                    <>
                        {/* Org Code */}
                        <Card variant="elevated" padding="lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Organization Code</p>
                                    <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                                        {org?.orgCode || org?.id}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Share with drivers to join</p>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleCopyCode}
                                    leftIcon={copiedCode ? <CheckCircle size={16} /> : <Copy size={16} />}
                                >
                                    {copiedCode ? 'Copied!' : 'Copy'}
                                </Button>
                            </div>
                        </Card>

                        {/* Org Wallet */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-5 shadow-xl shadow-amber-500/20"
                        >
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-white" />
                                        <span className="text-amber-100 text-sm font-medium">Organization Wallet</span>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        leftIcon={<ArrowDownToLine size={16} />}
                                        className="bg-white/20 hover:bg-white/30 border-0 text-white text-xs"
                                    >
                                        Withdraw
                                    </Button>
                                </div>
                                <p className="text-white/70 text-sm">Available Balance</p>
                                <p className="text-4xl font-bold text-white mb-4">
                                    {formatPrice(org?.walletBalance || 0)}
                                </p>
                                <div className="flex gap-4">
                                    <div>
                                        <p className="text-white/60 text-xs">Total Earnings</p>
                                        <p className="text-lg font-bold text-white">{formatPrice(org?.totalEarnings || 0)}</p>
                                    </div>
                                    <div>
                                        <p className="text-white/60 text-xs">Total Pickups</p>
                                        <p className="text-lg font-bold text-white">{org?.totalPickups || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <Card variant="default" padding="sm" className="p-3">
                                <div className="flex flex-col items-center text-center">
                                    <div className="p-2 rounded-xl bg-blue-100 mb-2">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <p className="text-xs text-gray-500">Drivers</p>
                                    <p className="text-xl font-bold text-gray-900">{approvedMembers.length}</p>
                                </div>
                            </Card>
                            <Card variant="default" padding="sm" className="p-3">
                                <div className="flex flex-col items-center text-center">
                                    <div className="p-2 rounded-xl bg-amber-100 mb-2">
                                        <Star className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <p className="text-xs text-gray-500">Rating</p>
                                    <p className="text-xl font-bold text-gray-900">{(org?.rating || 0).toFixed(1)} ⭐</p>
                                </div>
                            </Card>
                            <Card variant="default" padding="sm" className="p-3">
                                <div className="flex flex-col items-center text-center">
                                    <div className="p-2 rounded-xl bg-emerald-100 mb-2">
                                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <p className="text-xs text-gray-500">Active</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {approvedMembers.filter((m: any) => m.isAvailable).length}
                                    </p>
                                </div>
                            </Card>
                        </div>

                        {/* Pending Approvals */}
                        {pendingMembers.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <UserPlus className="w-5 h-5 text-amber-500" />
                                    <h3 className="font-semibold text-gray-900">Pending Approvals</h3>
                                    <Badge variant="default" className="bg-amber-100 text-amber-700">{pendingMembers.length}</Badge>
                                </div>
                                <div className="space-y-3">
                                    {pendingMembers.map((member: any) => (
                                        <Card key={member.id} variant="default" padding="md" className="border border-amber-200">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                                                    {member.profileImage ? (
                                                        <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        (member.name?.charAt(0) || '?').toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">{member.name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500">{member.phone}</p>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <Button variant="secondary" size="sm" onClick={() => handleRemoveMember(member.id)} disabled={processingMember === member.id} className="text-red-600 border-red-200">
                                                        <XCircle size={16} />
                                                    </Button>
                                                    <Button variant="primary" size="sm" onClick={() => handleApproveMember(member.id)} disabled={processingMember === member.id}>
                                                        {processingMember === member.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Approved Drivers */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="w-5 h-5 text-emerald-500" />
                                <h3 className="font-semibold text-gray-900">Drivers</h3>
                            </div>
                            {approvedMembers.length === 0 ? (
                                <Card variant="default" padding="lg" className="text-center">
                                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No drivers yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Share your organization code to invite drivers</p>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {approvedMembers.map((member: any) => (
                                        <Card key={member.id} variant="default" padding="md" className="border border-gray-100">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold overflow-hidden">
                                                        {member.profileImage ? (
                                                            <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            (member.name?.charAt(0) || '?').toUpperCase()
                                                        )}
                                                    </div>
                                                    {member.isAvailable && (
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 truncate">{member.name || 'Driver'}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Star className="w-3 h-3 text-amber-400" />{(member.rating || 0).toFixed(1)}
                                                        </span>
                                                        <span className="text-xs text-gray-500">{member.totalPickups || 0} pickups</span>
                                                        <Badge variant={member.isAvailable ? 'success' : 'default'} className="text-xs">
                                                            {member.isAvailable ? 'Online' : 'Offline'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-sm font-bold text-gray-900">{formatPrice(member.earnings || 0)}</p>
                                                    <p className="text-xs text-gray-400">earned</p>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
