'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
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
    AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapView } from '@/components/maps/map-view';
import { ProfileLocationMap } from '@/components/maps/profile-location-map';
import { FullScreenNavigation } from '@/components/ui/full-screen-navigation';
import { formatPrice, WASTE_TYPES } from '@/lib/waste-config';
import { GeoLocation } from '@/types';
import {
    getOrganizationByOwner,
    getOrganizationMembers,
    approveMember,
    removeMember,
    withdrawFromOrgWallet,
} from '@/lib/firestore';
import {
    updateCollectorLocation,
    setCollectorOnlineStatus,
    subscribeToPendingJobs,
    assignCollectorToJob,
    updateJobStatus,
    createPaymentRequest,
    subscribeToPaymentRequest,
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
    const router = useRouter();
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

    // Navigation state
    const [showFullScreenNav, setShowFullScreenNav] = useState(false);

    // Finish Trip / Payment request state
    const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentAdjustmentReason, setPaymentAdjustmentReason] = useState('');
    const [isRequestingPayment, setIsRequestingPayment] = useState(false);
    const [paymentRequestSent, setPaymentRequestSent] = useState(false);
    const [pendingPaymentRequestId, setPendingPaymentRequestId] = useState<string | null>(null);
    const [paymentRequestDeclined, setPaymentRequestDeclined] = useState(false);

    // Withdraw state
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawPhone, setWithdrawPhone] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const handleWithdraw = async () => {
        if (!org?.id) {
            alert('Organization not loaded');
            return;
        }
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (!withdrawPhone || withdrawPhone.length < 7) {
            alert('Please enter a valid phone number');
            return;
        }
        setIsWithdrawing(true);
        try {
            const result = await withdrawFromOrgWallet(org.id, amount, 'wave', withdrawPhone);
            if (result.success) {
                setOrg((prev: any) => prev ? { ...prev, walletBalance: (prev.walletBalance || 0) - amount } : prev);
                setShowWithdrawModal(false);
                setWithdrawAmount('');
                setWithdrawPhone('');
                alert('Withdrawal request submitted! You will receive your funds shortly.');
            } else {
                alert(result.error || 'Withdrawal failed');
            }
        } catch (err) {
            console.error('Withdraw failed:', err);
            alert('Failed to process withdrawal');
        } finally {
            setIsWithdrawing(false);
        }
    };

    // Load org data
    useEffect(() => {
        if (!user?.id) return;
        loadOrganization();
    }, [user?.id]);

    // Subscribe to pending jobs when online
    useEffect(() => {
        if (!isOnline || !currentLocation) return;
        const unsub = subscribeToPendingJobs((jobs) => {
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

    const handleCompleteJob = useCallback(async () => {
        if (!activeJob) return;
        try {
            await updateJobStatus(activeJob.id, 'completed');
            setActiveJob(null);
            setPendingPaymentRequestId(null);
            setPaymentRequestSent(false);
            setPaymentRequestDeclined(false);
            setShowFullScreenNav(false);
        } catch (err) {
            console.error('Failed to complete job:', err);
        }
    }, [activeJob]);

    // Auto-complete the trip the moment the customer confirms payment
    useEffect(() => {
        if (!pendingPaymentRequestId || !activeJob) return;
        const unsub = subscribeToPaymentRequest(
            activeJob.customerId,
            pendingPaymentRequestId,
            (req) => {
                if (!req) return;
                if (req.status === 'confirmed') {
                    handleCompleteJob();
                } else if (req.status === 'cancelled') {
                    setPaymentRequestSent(false);
                    setPaymentRequestDeclined(true);
                    setPendingPaymentRequestId(null);
                }
            }
        );
        return () => unsub();
    }, [pendingPaymentRequestId, activeJob, handleCompleteJob]);

    const openFinishTripModal = () => {
        if (!activeJob) return;
        setPaymentAmount(activeJob.amount.toString());
        setPaymentAdjustmentReason('');
        setPaymentRequestDeclined(false);
        setShowFullScreenNav(false);
        setShowPaymentRequestModal(true);
    };

    const sendFinishTripRequest = async () => {
        if (!activeJob) return;
        setIsRequestingPayment(true);
        try {
            const reqId = await createPaymentRequest(
                collectorId,
                org?.name || user?.name || 'Driver',
                activeJob.customerId,
                activeJob.amount,
                parseFloat(paymentAmount) || activeJob.amount,
                paymentAdjustmentReason || undefined,
                undefined,
                activeJob.id,
            );
            setPendingPaymentRequestId(reqId);
            setPaymentRequestSent(true);
            setPaymentRequestDeclined(false);
            setShowPaymentRequestModal(false);
        } catch (err) {
            console.error('Payment request failed:', err);
            alert('Failed to send payment request');
        } finally {
            setIsRequestingPayment(false);
        }
    };

    const handleAcceptJob = async (job: RealtimeJob) => {
        try {
            const claimed = await assignCollectorToJob(
                job.id,
                collectorId,
                org?.name || user?.name,
                user?.phone,
            );
            if (!claimed) {
                alert('This pickup was just claimed by another collector.');
                return;
            }
            await updateJobStatus(job.id, 'accepted');
            setActiveJob({ ...job, collectorId, status: 'accepted' });
        } catch (err) {
            console.error('Failed to accept job:', err);
            alert('Could not accept this pickup. Please try again.');
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
            <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-gradient-to-br from-gray-50 via-white to-amber-50">
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
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                    <MapPin className="w-4 h-4" />
                                    <span>{activeJob.pickupLocation.formattedAddress}</span>
                                </div>

                                {/* Route Map */}
                                <Card variant="default" padding="none" className="overflow-hidden h-[260px] mb-3">
                                    <MapView
                                        center={activeJob.pickupLocation}
                                        customerLocation={activeJob.pickupLocation}
                                        collectorLocation={currentLocation || undefined}
                                        showRoute
                                        isTracking
                                        height="100%"
                                    />
                                </Card>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <Button
                                        variant="primary"
                                        fullWidth
                                        onClick={() => setShowFullScreenNav(true)}
                                        leftIcon={<Navigation size={18} />}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        Navigate
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        fullWidth
                                        onClick={() => {
                                            const { lat, lng } = activeJob.pickupLocation;
                                            window.open(
                                                `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
                                                '_blank'
                                            );
                                        }}
                                        leftIcon={<Navigation size={18} />}
                                    >
                                        Open in Google Maps
                                    </Button>
                                </div>

                                {activeJob.customerPhone && (
                                    <a href={`tel:${activeJob.customerPhone}`} className="block mb-3">
                                        <Button
                                            variant="secondary"
                                            fullWidth
                                            leftIcon={<Phone size={18} />}
                                        >
                                            Call Customer
                                        </Button>
                                    </a>
                                )}

                                {paymentRequestSent ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-amber-900">Awaiting customer confirmation</p>
                                                <p className="text-xs text-amber-700 mt-0.5">
                                                    Trip will auto-complete the moment they tap Confirm &amp; Pay.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        variant="primary"
                                        fullWidth
                                        onClick={openFinishTripModal}
                                        leftIcon={<CheckCircle size={18} />}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        Finish Trip
                                    </Button>
                                )}

                                {paymentRequestDeclined && (
                                    <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                                        Customer declined the payment request. You can request again or contact them.
                                    </div>
                                )}

                                <div className="mt-3 p-3 bg-emerald-50 rounded-xl">
                                    <p className="text-xs text-gray-600">You'll Earn</p>
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
                            className="relative overflow-hidden rounded-3xl p-5 shadow-xl shadow-amber-500/20"
                            style={{
                                backgroundColor: '#F59E0B',
                                backgroundImage: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #EA580C 100%)'
                            }}
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
                                        onClick={() => setShowWithdrawModal(true)}
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

                        {/* Community Reports (authority orgs only) */}
                        {(user as { isAuthority?: boolean })?.isAuthority && (
                            <button
                                type="button"
                                onClick={() => router.push('/organization/reports')}
                                className="w-full p-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-left text-white shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
                            >
                                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold">Community Reports</p>
                                    <p className="text-xs text-white/80">Environmental hazards reported by residents</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-white/80 flex-shrink-0" />
                            </button>
                        )}

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

            {/* Withdraw Modal */}
            <AnimatePresence>
                {showWithdrawModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setShowWithdrawModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-gray-900 mb-4">
                                Withdraw Funds
                            </h2>

                            <div className="mb-4 p-4 bg-amber-50 rounded-xl">
                                <p className="text-xs text-gray-600">Available Balance</p>
                                <p className="text-2xl font-bold text-amber-700">
                                    {formatPrice(org?.walletBalance || 0)}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Amount (GMD)
                                    </label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={e => setWithdrawAmount(e.target.value)}
                                        placeholder="Enter amount (min 50 GMD)"
                                        min="50"
                                        max={org?.walletBalance || 0}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Wave Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={withdrawPhone}
                                        onChange={e => setWithdrawPhone(e.target.value)}
                                        placeholder="+220 XXXXXXXX"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowWithdrawModal(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleWithdraw}
                                    disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) > (org?.walletBalance || 0)}
                                    className="flex-1"
                                >
                                    {isWithdrawing ? 'Processing...' : 'Withdraw'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Finish Trip / Payment Request Modal */}
            <AnimatePresence>
                {showPaymentRequestModal && activeJob && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
                        onClick={() => !isRequestingPayment && setShowPaymentRequestModal(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full bg-white rounded-t-3xl p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Finish Trip &amp; Request Payment</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                The customer will get a notification to confirm. As soon as they tap Confirm &amp; Pay, your trip is marked complete and the wallet is credited automatically.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Amount (GMD)</label>
                                    <input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                    {parseFloat(paymentAmount) !== activeJob.amount && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Original: {formatPrice(activeJob.amount)} → Adjusted: {formatPrice(parseFloat(paymentAmount) || 0)}
                                        </p>
                                    )}
                                </div>

                                {parseFloat(paymentAmount) !== activeJob.amount && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">Adjustment Reason (optional)</label>
                                        <input
                                            type="text"
                                            value={paymentAdjustmentReason}
                                            onChange={(e) => setPaymentAdjustmentReason(e.target.value)}
                                            placeholder="e.g. More waste than expected"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        />
                                    </div>
                                )}

                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-500">Customer pays</span>
                                        <span className="font-bold text-gray-900">{formatPrice(parseFloat(paymentAmount) || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-500">You receive (70%)</span>
                                        <span className="font-bold text-emerald-600">{formatPrice(Math.round((parseFloat(paymentAmount) || 0) * 0.7 * 100) / 100)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Platform fee (30%)</span>
                                        <span className="text-gray-400">{formatPrice(Math.round((parseFloat(paymentAmount) || 0) * 0.3 * 100) / 100)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setShowPaymentRequestModal(false)}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={sendFinishTripRequest}
                                        disabled={isRequestingPayment || !paymentAmount}
                                        className="flex-1"
                                    >
                                        {isRequestingPayment ? 'Sending...' : 'Send & Finish Trip'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full Screen Navigation */}
            {activeJob && (
                <FullScreenNavigation
                    isOpen={showFullScreenNav}
                    onClose={() => setShowFullScreenNav(false)}
                    pickup={{
                        id: activeJob.id,
                        customerName: activeJob.customerName || 'Customer',
                        customerPhone: activeJob.customerPhone || '',
                        pickupLocation: activeJob.pickupLocation,
                        wasteType: getWasteTypeInfo(activeJob.wasteType, activeJob.wasteTypes).name,
                        wasteSize: getContainerSummary(activeJob),
                        amount: activeJob.amount || 0,
                        estimatedDistance: currentLocation
                            ? formatDistance(haversineDistance(currentLocation.lat, currentLocation.lng, activeJob.pickupLocation.lat, activeJob.pickupLocation.lng))
                            : undefined,
                        estimatedTime: currentLocation
                            ? estimateTravelTime(haversineDistance(currentLocation.lat, currentLocation.lng, activeJob.pickupLocation.lat, activeJob.pickupLocation.lng))
                            : undefined,
                    }}
                    collectorLocation={currentLocation || undefined}
                    onArrive={async () => {
                        try {
                            await updateJobStatus(activeJob.id, 'arrived');
                            setActiveJob({ ...activeJob, status: 'arrived' });
                        } catch (err) {
                            console.error('Failed to mark arrived:', err);
                        }
                    }}
                    isArrived={activeJob.status === 'arrived' || activeJob.status === 'awaiting_payment'}
                    isPaid={activeJob.paymentStatus === 'paid'}
                    onComplete={() => {
                        if (paymentRequestSent) return;
                        openFinishTripModal();
                    }}
                    onCall={() => activeJob.customerPhone && window.open(`tel:${activeJob.customerPhone}`, '_self')}
                    onMessage={() => activeJob.customerPhone && window.open(`sms:${activeJob.customerPhone}`, '_self')}
                />
            )}
        </div>
    );
}
