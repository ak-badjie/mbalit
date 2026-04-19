'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    Wallet,
    ArrowDownToLine,
    Power,
    MapPin,
    Clock,
    Package,
    DollarSign,
    CheckCircle,
    XCircle,
    Phone,
    Navigation,
    Star,
    Truck,
    TrendingUp,
    Percent,
    Calendar,
    LogOut,
    Settings,
    Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import TruckLogo from '@/components/ui/truck-logo';
import { Badge } from '@/components/ui/badge';
import { MapView } from '@/components/maps/map-view';
import { ProfileLocationMap } from '@/components/maps/profile-location-map';
import { NotificationDropdown } from '@/components/ui/notification-dropdown';
import { formatPrice, WASTE_TYPES } from '@/lib/waste-config';
import { GeoLocation, CollectorStats, Notification, CollectorType } from '@/types';
import { useAuth } from '@/lib/auth-context';

import {
    updateCollectorLocation,
    setCollectorOnlineStatus,
    subscribeToPendingJobs,
    subscribeToCollectorActiveJob,
    assignCollectorToJob,
    updateJobStatus,
    clearCollectorActiveJob,
    createPaymentRequest,
    RealtimeJob,
} from '@/lib/realtime';
import {
    getCollectorStats,
    getCollectorNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getWalletBalance,
    withdrawFromWallet,
} from '@/lib/firestore';
import { createNotification } from '@/lib/firestore';
import {
    DynamicIslandProvider,
    DynamicIsland,
    DynamicContainer,
    DynamicTitle,
    DynamicDescription,
    useDynamicIslandSize,
} from '@/components/ui/dynamic-island';
import { FullScreenNavigation } from '@/components/ui/full-screen-navigation';
import { CollectorPaymentModal } from '@/components/ui/payment-offer-modal';

// Haversine distance calculation (km)
function haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Estimate travel time based on distance (avg 25 km/h in urban)
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

// Credit Card Pattern SVG
const CardPattern = () => (
    <svg className="absolute inset-0 w-full h-full opacity-20 text-white" viewBox="0 0 400 200">
        <defs>
            <pattern id="walletPattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="15" cy="15" r="1" fill="currentColor" />
            </pattern>
            <linearGradient id="walletFade" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                <stop offset="50%" stopColor="white" stopOpacity="0.1" />
                <stop offset="100%" stopColor="white" stopOpacity="0.3" />
            </linearGradient>
        </defs>
        <rect width="400" height="200" fill="url(#walletPattern)" />
        <ellipse cx="320" cy="20" rx="100" ry="100" fill="url(#walletFade)" />
        <ellipse cx="80" cy="180" rx="80" ry="80" fill="url(#walletFade)" />
    </svg>
);

function DashboardContent() {
    const router = useRouter();
    const { setSize } = useDynamicIslandSize();
    const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
    const collectorId = user?.id || 'demo-collector';

    const [isOnline, setIsOnline] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(null);
    const [activeJob, setActiveJob] = useState<RealtimeJob | null>(null);
    const [incomingJob, setIncomingJob] = useState<RealtimeJob | null>(null);
    const [pendingJobs, setPendingJobs] = useState<RealtimeJob[]>([]);
    const [remainingCapacity, setRemainingCapacity] = useState(100);
    const [stats, setStats] = useState<CollectorStats | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawPhone, setWithdrawPhone] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [showFullScreenNav, setShowFullScreenNav] = useState(false);
    const [declinedJobIds, setDeclinedJobIds] = useState<Set<string>>(new Set());
    const [showDynamicIslandNotif, setShowDynamicIslandNotif] = useState(false);
    const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentAdjustmentReason, setPaymentAdjustmentReason] = useState('');
    const [isRequestingPayment, setIsRequestingPayment] = useState(false);
    const [paymentRequestSent, setPaymentRequestSent] = useState(false);

    // PROTECT DASHBOARD: Redirect if onboarding not complete
    useEffect(() => {
        if (!authLoading && user) {
            if (user.onboardingComplete === false) {
                // User hasn't finished onboarding - redirect to complete it
                router.replace('/auth?continue=onboarding');
            }
        } else if (!authLoading && !isAuthenticated) {
            // Not logged in at all
            router.replace('/auth');
        }
    }, [authLoading, user, isAuthenticated, router]);

    // Load stats, notifications, and wallet balance
    useEffect(() => {
        const loadData = async () => {
            try {
                const [statsData, notifsData, balance] = await Promise.all([
                    getCollectorStats(collectorId),
                    getCollectorNotifications(collectorId),
                    getWalletBalance(collectorId),
                ]);
                setStats(statsData);
                setNotifications(notifsData);
                setWalletBalance(balance);
            } catch (err) {
                console.error('Failed to load stats:', err);
            }
        };
        loadData();
    }, [collectorId]);

    const handleMarkNotificationRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsAsRead(collectorId);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    // Handle withdraw
    const handleWithdraw = async () => {
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
            const result = await withdrawFromWallet(collectorId, amount, 'wave', withdrawPhone);
            if (result.success) {
                setWalletBalance(prev => prev - amount);
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

    // Handle logout
    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    // Get collector's current location and update in Realtime DB
    useEffect(() => {
        if (isOnline && navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const loc: GeoLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        formattedAddress: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
                    };
                    setCurrentLocation(loc);

                    // Update location in Realtime DB
                    try {
                        await updateCollectorLocation(collectorId, loc);
                    } catch (err) {
                        console.error('Failed to update location:', err);
                    }
                },
                (error) => console.error('Location error:', error),
                { enableHighAccuracy: true }
            );

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [isOnline, collectorId]);

    // Update online status in Realtime DB
    useEffect(() => {
        setCollectorOnlineStatus(collectorId, isOnline);
    }, [isOnline, collectorId]);

    // Subscribe to pending jobs when online
    useEffect(() => {
        if (isOnline && !activeJob) {
            const unsubscribe = subscribeToPendingJobs((jobs) => {
                // Filter jobs not yet assigned to another collector AND not declined
                const availableJobs = jobs.filter(j => 
                    (!j.collectorId || j.collectorId === collectorId) &&
                    !declinedJobIds.has(j.id)
                );
                setPendingJobs(availableJobs);

                // Show first available job as incoming
                if (availableJobs.length > 0 && !incomingJob) {
                    setTimeout(() => setSize('large'), 0);
                    setIncomingJob(availableJobs[0]);
                    setShowDynamicIslandNotif(true);
                    
                    // Save notification to Firestore for notifications page
                    const jobInfo = availableJobs[0];
                    createNotification(
                        collectorId,
                        'New Job Nearby',
                        `${jobInfo.wasteTypes?.join(', ') || jobInfo.wasteType || 'Waste'} pickup available near you. Earn ${formatPrice(jobInfo.amount)}`,
                        'info',
                        { jobId: jobInfo.id }
                    ).catch(err => console.error('Failed to save notification:', err));
                }
            });

            return () => unsubscribe();
        }
    }, [isOnline, activeJob, incomingJob, collectorId, setSize, declinedJobIds]);

    // Subscribe to collector's active job
    useEffect(() => {
        const unsubscribe = subscribeToCollectorActiveJob(collectorId, (job) => {
            if (job && job.status !== 'completed' && job.status !== 'cancelled') {
                setActiveJob(job);
            } else {
                setActiveJob(null);
            }
        });

        return () => unsubscribe();
    }, [collectorId]);

    // Auto-clear incomingJob if a real-time update shows another collector
    // already claimed it (or it is otherwise no longer available).
    useEffect(() => {
        if (!incomingJob) return;
        const stillAvailable = pendingJobs.some(j => j.id === incomingJob.id);
        if (!stillAvailable) {
            setIncomingJob(null);
            setShowDynamicIslandNotif(false);
            setTimeout(() => setSize('compact'), 0);
        }
    }, [pendingJobs, incomingJob, setSize]);

    // Auto-dismiss Dynamic Island notification after 3 seconds
    useEffect(() => {
        if (showDynamicIslandNotif && incomingJob) {
            const timer = setTimeout(() => {
                setShowDynamicIslandNotif(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showDynamicIslandNotif, incomingJob]);

    const handleToggleOnline = async () => {
        const newOnlineStatus = !isOnline;
        setIsOnline(newOnlineStatus);

        if (newOnlineStatus) {
            setTimeout(() => setSize('compact'), 0);
        } else {
            setIncomingJob(null);
            setPendingJobs([]);
            setDeclinedJobIds(new Set());
        }
    };

    const handleAcceptJob = async (jobOverride?: RealtimeJob) => {
        const job = jobOverride || incomingJob;
        if (!job) return;
        try {
            const claimed = await assignCollectorToJob(
                job.id,
                collectorId,
                user?.name,
                user?.phone,
            );

            if (!claimed) {
                // Another collector got there first — surface that to the user
                // and mark this job as declined so it doesn't keep popping up.
                setDeclinedJobIds(prev => new Set(prev).add(job.id));
                setIncomingJob(null);
                setShowDynamicIslandNotif(false);
                setTimeout(() => setSize('compact'), 0);
                alert('This pickup was just claimed by another collector.');
                return;
            }

            await updateJobStatus(job.id, 'accepted');
            setActiveJob({ ...job, collectorId, status: 'accepted' });
            setIncomingJob(null);
            setTimeout(() => setSize('long'), 0);

            // Show full-screen navigation on mobile
            if (window.innerWidth < 768) {
                setShowFullScreenNav(true);
            }
        } catch (err) {
            console.error('Failed to accept job:', err);
            alert('Could not accept this pickup. Please try again.');
        }
    };

    const handleDeclineJob = () => {
        if (incomingJob) {
            // Track declined job to prevent cycling
            setDeclinedJobIds(prev => new Set(prev).add(incomingJob.id));
        }
        setIncomingJob(null);
        setShowDynamicIslandNotif(false);
        // Show next pending job if available (excluding declined ones)
        const nextJob = pendingJobs.find(j => 
            j.id !== incomingJob?.id && !declinedJobIds.has(j.id)
        );
        if (nextJob) {
            setIncomingJob(nextJob);
            setShowDynamicIslandNotif(true);
        } else {
            setTimeout(() => setSize('compact'), 0);
        }
    };

    const handleArriveJob = async () => {
        if (activeJob) {
            try {
                await updateJobStatus(activeJob.id, 'arrived');
                setActiveJob({ ...activeJob, status: 'arrived' });
            } catch (err) {
                console.error('Failed to update job status to arrived:', err);
            }
        }
    };

    const handleCompleteJob = async () => {
        if (activeJob) {
            try {
                await updateJobStatus(activeJob.id, 'completed');
                await clearCollectorActiveJob(collectorId);
                setWalletBalance(prev => prev + activeJob.amount);
                setRemainingCapacity(prev => Math.max(0, prev - 20));
                setActiveJob(null);
                setTimeout(() => setSize('compact'), 0);
            } catch (err) {
                console.error('Failed to complete job:', err);
            }
        }
    };

    const handleUpdateCapacity = (newCapacity: number) => {
        setRemainingCapacity(newCapacity);
    };

    // Helper to get waste type info - supports both single wasteType and wasteTypes array
    const getWasteTypeInfo = (wasteTypeId?: string, wasteTypes?: string[]) => {
        // If wasteTypes array exists, use it
        if (wasteTypes && wasteTypes.length > 0) {
            const types = wasteTypes.map(id => WASTE_TYPES.find(t => t.id === id)).filter(Boolean);
            if (types.length > 0) {
                return { 
                    name: types.map(t => t!.name).join(', '), 
                    icon: types[0]!.icon 
                };
            }
        }
        // Fallback to single wasteType
        return WASTE_TYPES.find(t => t.id === wasteTypeId) || { name: wasteTypeId || 'General Waste', icon: '📦' };
    };

    // Helper to format container size from bucket/bin counts
    const getContainerSummary = (job: RealtimeJob) => {
        const parts: string[] = [];
        if (job.bucketCount && job.bucketCount > 0) {
            parts.push(`${job.bucketCount} Bucket${job.bucketCount > 1 ? 's' : ''}`);
        }
        if (job.largeBinCount && job.largeBinCount > 0) {
            parts.push(`${job.largeBinCount} Large Bin${job.largeBinCount > 1 ? 's' : ''}`);
        }
        if (parts.length > 0) return parts.join(', ');
        // Fallback to legacy wasteSize if available
        return job.wasteSize || 'Standard';
    };

    return (
        <div className="h-[100dvh] overflow-hidden">
            {/* Desktop Header - Hidden on Mobile */}
            <header className="hidden md:block fixed top-0 left-0 right-0 z-40">
                {/* Gradient accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400" />
                <div className="bg-white/60  backdrop-blur-2xl backdrop-saturate-200 border-b border-white/30  shadow-xl shadow-black/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            {/* Left Side - Profile or Logo */}
                            {isAuthenticated ? (
                                <Link href="/collector/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                    {/* Profile Image or Initials */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold shadow-lg overflow-hidden ring-2 ring-white ">
                                        {user?.profileImage ? (
                                            <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            (user as any)?.collectorType === 'organization' ? <Building2 className="w-5 h-5 text-white opacity-80" /> : user?.name?.charAt(0).toUpperCase() || 'C'
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="font-semibold text-gray-900 ">
                                            {user?.name || 'Collector'}
                                        </h1>
                                        <p className="text-xs text-gray-500 ">
                                            {user?.email}
                                        </p>
                                    </div>
                                </Link>
                            ) : (
                                <Link href="/" className="flex items-center gap-2">
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <TruckLogo size="sm" showText={true} />
                                    </motion.div>
                                </Link>
                            )}

                            {/* Right Side - Auth Actions */}
                            {isAuthenticated ? (
                                <div className="flex items-center gap-2">
                                    {/* Star Rating Badge */}
                                    <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-amber-50  rounded-full">
                                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                        <span className="text-sm font-medium text-amber-700 ">
                                            {stats?.averageRating?.toFixed(1) || '0.0'}
                                        </span>
                                    </div>

                                    <NotificationDropdown
                                        notifications={notifications}
                                        onMarkAsRead={handleMarkNotificationRead}
                                        onMarkAllAsRead={handleMarkAllRead}
                                    />
                                    <Link href="/collector/settings">
                                        <motion.button
                                            className="p-2 rounded-xl hover:bg-gray-100  transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Settings className="w-5 h-5 text-gray-600 " />
                                        </motion.button>
                                    </Link>

                                    {/* Logout Button */}
                                    <motion.button
                                        onClick={handleLogout}
                                        className="p-2 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50  transition-colors"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        title="Logout"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </motion.button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Link href="/auth">
                                        <Button variant="ghost" size="sm" className="font-medium">
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                            </svg>
                                            Login
                                        </Button>
                                    </Link>
                                    <Link href="/auth?signup=true">
                                        <Button variant="primary" size="sm" className="font-medium">
                                            <Truck className="w-4 h-4 mr-2" />
                                            Become a Collector
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Dynamic Island for job notifications - auto-dismisses after 3s */}
            <AnimatePresence>
                {((showDynamicIslandNotif && incomingJob) || activeJob) && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 cursor-pointer"
                        onClick={() => setShowDynamicIslandNotif(false)}
                    >
                        <DynamicIsland>
                            <DynamicContainer className="flex items-center justify-between h-full w-full px-4">
                                {showDynamicIslandNotif && incomingJob ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                animate={{ scale: [1, 1.1, 1] }}
                                                transition={{ repeat: Infinity, duration: 1 }}
                                                className="p-2 rounded-full bg-emerald-500"
                                            >
                                                <Package className="w-5 h-5 text-white" />
                                            </motion.div>
                                            <div>
                                                <DynamicTitle className="text-sm font-bold text-white">
                                                    New Job Nearby!
                                                </DynamicTitle>
                                                <DynamicDescription className="text-xs text-gray-400">
                                                    {getWasteTypeInfo(incomingJob.wasteType, incomingJob.wasteTypes).icon} {getWasteTypeInfo(incomingJob.wasteType, incomingJob.wasteTypes).name} • {getContainerSummary(incomingJob)}
                                                </DynamicDescription>
                                            </div>
                                        </div>
                                        <span className="text-emerald-400 font-bold flex items-center gap-2">
                                            {formatPrice(incomingJob.amount)}
                                            {incomingJob.paymentStatus !== 'paid' && (
                                                <span className="text-[10px] font-normal text-amber-600 bg-amber-100/20 px-1.5 py-0.5 rounded-full">
                                                    Unpaid
                                                </span>
                                            )}
                                        </span>
                                    </>
                                ) : activeJob ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                animate={{ x: [0, 5, 0] }}
                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                                className="p-2 rounded-full bg-blue-500"
                                            >
                                                <Truck className="w-5 h-5 text-white" />
                                            </motion.div>
                                            <div>
                                                <DynamicTitle className="text-sm font-bold text-white">
                                                    Active Pickup
                                                </DynamicTitle>
                                                <DynamicDescription className="text-xs text-gray-400">
                                                    {activeJob.customerEmail}
                                                </DynamicDescription>
                                            </div>
                                        </div>
                                    </>
                                ) : null}
                            </DynamicContainer>
                        </DynamicIsland>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="pt-6 md:pt-20 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Single unified collector dashboard rendering */}
                <>
                    {/* Credit Card Style Wallet - Only for individual collectors */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-5 mb-4 shadow-xl shadow-emerald-500/20"
                        >
                            <CardPattern />

                            <div className="relative z-10">
                                {/* Card Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-white" />
                                        <span className="text-emerald-100 text-sm font-medium">Mbalit Wallet</span>
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

                                {/* Balance */}
                                <p className="text-4xl font-bold text-white mb-4">{formatPrice(walletBalance)}</p>

                                {/* Online Toggle in Card */}
                                <div className="flex items-center justify-between pt-4 border-t border-white/20">
                                    <div className="flex items-center gap-2">
                                        <Power className={`w-5 h-5 ${isOnline ? 'text-white' : 'text-white/60'}`} />
                                        <span className="text-white/90 text-sm">
                                            {isOnline ? 'Online - Receiving Jobs' : 'Go online to start earning'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleToggleOnline}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${isOnline ? 'bg-white/30' : 'bg-white/10'}`}
                                    >
                                        <motion.div
                                            animate={{ x: isOnline ? 22 : 2 }}
                                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
                                        />
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Capacity Indicator */}
                        <Card variant="default" padding="md" className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-gray-900 ">
                                    Remaining Capacity
                                </span>
                                <span className="text-2xl font-bold text-emerald-600">
                                    {remainingCapacity}%
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-200  rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${remainingCapacity}%` }}
                                    className={`h-full rounded-full ${remainingCapacity > 50 ? 'bg-emerald-500' :
                                        remainingCapacity > 20 ? 'bg-amber-500' : 'bg-red-500'
                                        }`}
                                />
                            </div>
                            <div className="mt-3 flex gap-2">
                                {[100, 75, 50, 25, 0].map((value) => (
                                    <button
                                        key={value}
                                        onClick={() => handleUpdateCapacity(value)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${remainingCapacity === value
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-gray-100  text-gray-600  hover:bg-gray-200'
                                            }`}
                                    >
                                        {value}%
                                    </button>
                                ))}
                            </div>
                        </Card>

                        {/* Active Job View (incoming job popup removed - jobs shown in list below) */}

                        {activeJob && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card variant="elevated" padding="lg" className="mb-6 border-2 border-blue-500">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-6 h-6 text-blue-500" />
                                            <h2 className="text-xl font-bold text-gray-900 ">
                                                Active Pickup
                                            </h2>
                                        </div>
                                        <Badge variant="success">In Progress</Badge>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl">
                                                    👤
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 ">
                                                        {activeJob.customerEmail}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {getWasteTypeInfo(activeJob.wasteType, activeJob.wasteTypes).icon} {getWasteTypeInfo(activeJob.wasteType, activeJob.wasteTypes).name} • {getContainerSummary(activeJob)}
                                                    </p>
                                                </div>
                                                <a href={`tel:${activeJob.customerPhone}`}>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        leftIcon={<Phone size={16} />}
                                                        className="ml-auto"
                                                    >
                                                        Call
                                                    </Button>
                                                </a>
                                            </div>

                                            <div className="flex items-center gap-3 text-gray-600 ">
                                                <MapPin className="w-5 h-5" />
                                                <span>{activeJob.pickupLocation.formattedAddress}</span>
                                            </div>

                                            <div className="p-4 bg-blue-50  rounded-xl">
                                                <p className="text-sm text-gray-600 ">
                                                    You'll Earn
                                                </p>
                                                <p className="text-2xl font-bold text-blue-600">
                                                    {formatPrice(activeJob.amount)}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
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
                                                <Button
                                                    variant="secondary"
                                                    fullWidth
                                                    onClick={() => {
                                                        setPaymentAmount(activeJob.amount.toString());
                                                        setPaymentAdjustmentReason('');
                                                        setShowPaymentRequestModal(true);
                                                    }}
                                                    leftIcon={<DollarSign size={18} />}
                                                    disabled={paymentRequestSent}
                                                    className={paymentRequestSent ? 'bg-green-50 text-green-600 border-green-200' : ''}
                                                >
                                                    {paymentRequestSent ? 'Payment Requested ✓' : 'Request Payment'}
                                                </Button>
                                                <Button
                                                    variant="primary"
                                                    fullWidth
                                                    onClick={handleCompleteJob}
                                                    leftIcon={<CheckCircle size={18} />}
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    Complete
                                                </Button>
                                            </div>
                                        </div>

                                        <Card variant="default" padding="none" className="overflow-hidden h-[300px]">
                                            <MapView
                                                center={activeJob.pickupLocation}
                                                customerLocation={activeJob.pickupLocation}
                                                collectorLocation={currentLocation || undefined}
                                                showRoute
                                                isTracking
                                                height="100%"
                                            />
                                        </Card>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {/* Stats when no active job - 2 Column Grid for Mobile */}
                        {!incomingJob && !activeJob && (
                            <>
                                {/* Stats Grid - 2 columns on mobile, 3-4 on desktop */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    <Card variant="default" padding="sm" className="p-3">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="p-2 rounded-xl bg-emerald-100  mb-2">
                                                <Package className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <p className="text-xs text-gray-500">Today's Pickups</p>
                                            <p className="text-xl font-bold text-gray-900 ">{stats?.todayPickups || 0}</p>
                                        </div>
                                    </Card>

                                    <Card variant="default" padding="sm" className="p-3">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="p-2 rounded-xl bg-blue-100  mb-2">
                                                <DollarSign className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <p className="text-xs text-gray-500">Today's Earnings</p>
                                            <p className="text-xl font-bold text-gray-900 ">
                                                {formatPrice(stats?.todayEarnings || 0)}
                                            </p>
                                        </div>
                                    </Card>

                                    <Card variant="default" padding="sm" className="p-3">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="p-2 rounded-xl bg-amber-100  mb-2">
                                                <Clock className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <p className="text-xs text-gray-500">Hours Online</p>
                                            <p className="text-xl font-bold text-gray-900 ">{stats?.hoursOnlineToday?.toFixed(1) || '0'}h</p>
                                        </div>
                                    </Card>

                                    <Card variant="default" padding="sm" className="p-3">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="p-2 rounded-xl bg-purple-100  mb-2">
                                                <Calendar className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <p className="text-xs text-gray-500">This Week</p>
                                            <p className="text-xl font-bold text-gray-900 ">{formatPrice(stats?.weeklyEarnings || 0)}</p>
                                        </div>
                                    </Card>
                                </div>

                                {/* Secondary Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <Card variant="default" padding="sm" className="p-3">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="p-2 rounded-xl bg-indigo-100  mb-2">
                                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <p className="text-xs text-gray-500">This Month</p>
                                            <p className="text-xl font-bold text-gray-900 ">{formatPrice(stats?.monthlyEarnings || 0)}</p>
                                        </div>
                                    </Card>

                                    <Card variant="default" padding="sm" className="p-3">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="p-2 rounded-xl bg-teal-100  mb-2">
                                                <Percent className="w-5 h-5 text-teal-600" />
                                            </div>
                                            <p className="text-xs text-gray-500">Acceptance</p>
                                            <p className="text-xl font-bold text-gray-900 ">{stats?.acceptanceRate || 0}%</p>
                                        </div>
                                    </Card>

                                    <Card variant="default" padding="sm" className="p-3">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="p-2 rounded-xl bg-rose-100  mb-2">
                                                <Star className="w-5 h-5 text-rose-600" />
                                            </div>
                                            <p className="text-xs text-gray-500">Rating</p>
                                            <p className="text-xl font-bold text-gray-900 ">{stats?.averageRating?.toFixed(1) || '0.0'} ⭐</p>
                                        </div>
                                    </Card>

                                    <Card variant="default" padding="sm" className="p-3">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="p-2 rounded-xl bg-gray-100  mb-2">
                                                <Navigation className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <p className="text-xs text-gray-500">Total KM</p>
                                            <p className="text-xl font-bold text-gray-900 ">0</p>
                                        </div>
                                    </Card>
                                </div>

                                {/* Your Location Map */}
                                <Card variant="elevated" padding="md" className="mt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-5 h-5 text-emerald-500" />
                                            <h3 className="font-semibold text-gray-900 ">Your Location</h3>
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
                                            // When precise location is acquired, if not online, just update location
                                            // If online, it will be synced via the watch effect
                                            console.log('Precise location acquired');
                                        }}
                                        enableLiveTracking={isOnline}
                                        height="350px"
                                    />
                                </Card>

                                {/* Nearby Orders - Accept only with distance/time */}
                                {pendingJobs.length > 0 && (
                                    <div className="mt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-5 h-5 text-emerald-500" />
                                                <h3 className="font-semibold text-gray-900 ">Nearby Orders</h3>
                                            </div>
                                            <Badge variant="default" className="bg-emerald-100 text-emerald-700">
                                                {pendingJobs.length} available
                                            </Badge>
                                        </div>
                                        <div className="space-y-3">
                                            {pendingJobs.map((job) => {
                                                const dist = currentLocation
                                                    ? haversineDistance(
                                                        currentLocation.lat, currentLocation.lng,
                                                        job.pickupLocation.lat, job.pickupLocation.lng
                                                    )
                                                    : null;
                                                const time = dist !== null ? estimateTravelTime(dist) : null;

                                                return (
                                                    <motion.div
                                                        key={job.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        <Card
                                                            variant="default"
                                                            padding="md"
                                                            className="border border-gray-100 hover:shadow-md transition-all"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                {/* Profile picture */}
                                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden">
                                                                    {job.customerProfileImage ? (
                                                                        <img
                                                                            src={job.customerProfileImage}
                                                                            alt="Customer"
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        (job.customerName?.charAt(0) || job.customerEmail?.charAt(0) || '?').toUpperCase()
                                                                    )}
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                        <span className="text-lg">{getWasteTypeInfo(job.wasteType, job.wasteTypes).icon}</span>
                                                                        <p className="font-semibold text-gray-900  text-sm truncate">
                                                                            {getWasteTypeInfo(job.wasteType, job.wasteTypes).name}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-xs text-gray-500 truncate">
                                                                        {getContainerSummary(job)}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        {dist !== null && (
                                                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                                                <Navigation className="w-3 h-3" />
                                                                                {formatDistance(dist)}
                                                                            </span>
                                                                        )}
                                                                        {time !== null && (
                                                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                                                <Clock className="w-3 h-3" />
                                                                                {time}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                                    <p className="text-lg font-bold text-emerald-600">{formatPrice(job.amount)}</p>
                                                                    <Button
                                                                        variant="primary"
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAcceptJob(job);
                                                                        }}
                                                                        leftIcon={<CheckCircle size={14} />}
                                                                        className="bg-emerald-600 hover:bg-emerald-700 text-xs px-3"
                                                                    >
                                                                        Accept
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Info when offline */}
                        {!isOnline && !incomingJob && !activeJob && (
                            <Card variant="default" padding="lg" className="mt-6 text-center">
                                <Power className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900  mb-2">
                                    You're currently offline
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    Go online to start receiving job requests and earn money
                                </p>
                                <Button variant="primary" onClick={handleToggleOnline}>
                                    Go Online
                                </Button>
                            </Card>
                        )}
                    </>
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
                            className="bg-white  rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-gray-900  mb-4">
                                Withdraw Funds
                            </h2>

                            <div className="mb-4 p-4 bg-emerald-50  rounded-xl">
                                <p className="text-sm text-gray-600 ">Available Balance</p>
                                <p className="text-2xl font-bold text-emerald-600">{formatPrice(walletBalance)}</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700  mb-2">
                                        Amount (GMD)
                                    </label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={e => setWithdrawAmount(e.target.value)}
                                        placeholder="Enter amount (min 50 GMD)"
                                        min="50"
                                        max={walletBalance}
                                        className="w-full px-4 py-3 border border-gray-300  rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white  text-gray-900 "
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700  mb-2">
                                        Phone Number (Wave / Orange Money)
                                    </label>
                                    <input
                                        type="tel"
                                        value={withdrawPhone}
                                        onChange={e => setWithdrawPhone(e.target.value)}
                                        placeholder="+220 XXXXXXXX"
                                        className="w-full px-4 py-3 border border-gray-300  rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white  text-gray-900 "
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
                                    disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) > walletBalance}
                                    className="flex-1"
                                >
                                    {isWithdrawing ? 'Processing...' : 'Withdraw'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Payment Request Modal */}
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
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Request Payment</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                The customer will receive a notification to confirm payment.
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
                                        onClick={async () => {
                                            setIsRequestingPayment(true);
                                            try {
                                                await createPaymentRequest(
                                                    collectorId,
                                                    user?.name || 'Collector',
                                                    activeJob.customerId,
                                                    activeJob.amount,
                                                    parseFloat(paymentAmount) || activeJob.amount,
                                                    paymentAdjustmentReason || undefined,
                                                    undefined,
                                                    activeJob.id
                                                );
                                                setPaymentRequestSent(true);
                                                setShowPaymentRequestModal(false);
                                            } catch (err) {
                                                console.error('Payment request failed:', err);
                                                alert('Failed to send payment request');
                                            } finally {
                                                setIsRequestingPayment(false);
                                            }
                                        }}
                                        disabled={isRequestingPayment || !paymentAmount}
                                        className="flex-1"
                                    >
                                        {isRequestingPayment ? 'Sending...' : 'Send Request'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full Screen Navigation for Mobile */}
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
                        estimatedDistance: '1.2 km',
                        estimatedTime: '5 min',
                        notes: (activeJob as any).notes,
                    }}
                    collectorLocation={currentLocation || undefined}
                    onArrive={handleArriveJob}
                    isArrived={activeJob.status === 'arrived' || activeJob.status === 'awaiting_payment'}
                    isPaid={activeJob.paymentStatus === 'paid'}
                    onComplete={() => {
                        handleCompleteJob();
                        setShowFullScreenNav(false);
                    }}
                    onCall={() => window.open(`tel:${activeJob.customerPhone}`, '_self')}
                    onMessage={() => window.open(`sms:${activeJob.customerPhone}`, '_self')}
                />
            )}

            {/* Payment Offer Negotiation Modal */}
            {activeJob && activeJob.status === 'awaiting_payment' && (
                <CollectorPaymentModal
                    isOpen={true}
                    onClose={() => {}}
                    onComplete={() => {
                        // Keep open or handle success, the actual job status will update to paid via webhook
                    }}
                    requestId={activeJob.id}
                />
            )}
        </div>
    );
}

export default function CollectorDashboard() {
    return (
        <DynamicIslandProvider initialSize="compact">
            <DashboardContent />
        </DynamicIslandProvider>
    );
}
