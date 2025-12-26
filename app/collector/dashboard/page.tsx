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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TruckLogo } from '@/components/ui/truck-logo';
import { Badge } from '@/components/ui/badge';
import { MapView } from '@/components/maps/map-view';
import { ProfileLocationMap } from '@/components/maps/profile-location-map';
import { NotificationDropdown } from '@/components/ui/notification-dropdown';
import { formatPrice, WASTE_TYPES } from '@/lib/waste-config';
import { GeoLocation, CollectorStats, Notification } from '@/types';
import { useAuth } from '@/lib/auth-context';
import {
    updateCollectorLocation,
    setCollectorOnlineStatus,
    subscribeToPendingJobs,
    subscribeToCollectorActiveJob,
    assignCollectorToJob,
    updateJobStatus,
    clearCollectorActiveJob,
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
import {
    DynamicIslandProvider,
    DynamicIsland,
    DynamicContainer,
    DynamicTitle,
    DynamicDescription,
    useDynamicIslandSize,
} from '@/components/ui/dynamic-island';

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
                // Filter jobs not yet assigned to another collector
                const availableJobs = jobs.filter(j => !j.collectorId || j.collectorId === collectorId);
                setPendingJobs(availableJobs);

                // Show first available job as incoming
                if (availableJobs.length > 0 && !incomingJob) {
                    setTimeout(() => setSize('large'), 0);
                    setIncomingJob(availableJobs[0]);
                }
            });

            return () => unsubscribe();
        }
    }, [isOnline, activeJob, incomingJob, collectorId, setSize]);

    // Subscribe to collector's active job
    useEffect(() => {
        const unsubscribe = subscribeToCollectorActiveJob(collectorId, (job) => {
            if (job && job.status !== 'completed') {
                setActiveJob(job);
            } else {
                setActiveJob(null);
            }
        });

        return () => unsubscribe();
    }, [collectorId]);

    const handleToggleOnline = async () => {
        const newOnlineStatus = !isOnline;
        setIsOnline(newOnlineStatus);

        if (newOnlineStatus) {
            setTimeout(() => setSize('compact'), 0);
        } else {
            setIncomingJob(null);
            setPendingJobs([]);
        }
    };

    const handleAcceptJob = async () => {
        if (incomingJob) {
            try {
                await assignCollectorToJob(incomingJob.id, collectorId);
                await updateJobStatus(incomingJob.id, 'accepted');
                setActiveJob({ ...incomingJob, collectorId, status: 'accepted' });
                setIncomingJob(null);
                setTimeout(() => setSize('long'), 0);
            } catch (err) {
                console.error('Failed to accept job:', err);
            }
        }
    };

    const handleDeclineJob = () => {
        setIncomingJob(null);
        // Show next pending job if available
        const nextJob = pendingJobs.find(j => j.id !== incomingJob?.id);
        if (nextJob) {
            setIncomingJob(nextJob);
        } else {
            setTimeout(() => setSize('compact'), 0);
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

    // Helper to get waste type info
    const getWasteTypeInfo = (wasteTypeId: string) => {
        return WASTE_TYPES.find(t => t.id === wasteTypeId) || { name: wasteTypeId, icon: '📦' };
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
            {/* Header with Navigation - Frosted Glass */}
            <header className="fixed top-0 left-0 right-0 z-40">
                {/* Gradient accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400" />
                <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl backdrop-saturate-200 border-b border-white/30 dark:border-gray-700/30 shadow-xl shadow-black/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            {/* Left Side - Profile or Logo */}
                            {isAuthenticated ? (
                                <Link href="/collector/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                    {/* Profile Image or Initials */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold shadow-lg overflow-hidden ring-2 ring-white dark:ring-gray-800">
                                        {user?.profileImage ? (
                                            <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            user?.name?.charAt(0).toUpperCase() || 'C'
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="font-semibold text-gray-900 dark:text-white">
                                            {user?.name || 'Collector'}
                                        </h1>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
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
                                    <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-full">
                                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
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
                                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </motion.button>
                                    </Link>

                                    {/* Logout Button */}
                                    <motion.button
                                        onClick={handleLogout}
                                        className="p-2 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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

            {/* Dynamic Island for job notifications */}
            <AnimatePresence>
                {(incomingJob || activeJob) && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
                    >
                        <DynamicIsland>
                            <DynamicContainer className="flex items-center justify-between h-full w-full px-4">
                                {incomingJob ? (
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
                                                    {getWasteTypeInfo(incomingJob.wasteType).icon} {getWasteTypeInfo(incomingJob.wasteType).name} • {incomingJob.wasteSize}
                                                </DynamicDescription>
                                            </div>
                                        </div>
                                        <span className="text-emerald-400 font-bold">
                                            {formatPrice(incomingJob.amount)}
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

            <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Online Toggle & Wallet Row */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {/* Online Toggle */}
                    <Card variant="elevated" padding="md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Power className={`w-6 h-6 ${isOnline ? 'text-emerald-500' : 'text-gray-400'}`} />
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {isOnline ? 'You are Online' : 'You are Offline'}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {isOnline ? 'Ready to receive jobs' : 'Go online to start earning'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleToggleOnline}
                                className={`relative w-14 h-8 rounded-full transition-colors ${isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                                    }`}
                            >
                                <motion.div
                                    animate={{ x: isOnline ? 24 : 4 }}
                                    className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md"
                                />
                            </button>
                        </div>
                    </Card>

                    {/* Wallet */}
                    <Card variant="elevated" padding="md" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Wallet className="w-5 h-5" />
                                    <span className="text-sm opacity-90">Mbalit Wallet</span>
                                </div>
                                <p className="text-3xl font-bold">{formatPrice(walletBalance)}</p>
                            </div>
                            <Button
                                variant="secondary"
                                onClick={() => setShowWithdrawModal(true)}
                                leftIcon={<ArrowDownToLine size={18} />}
                                className="bg-white/20 hover:bg-white/30 border-0 text-white"
                            >
                                Withdraw
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Capacity Indicator */}
                <Card variant="default" padding="md" className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-900 dark:text-white">
                            Remaining Capacity
                        </span>
                        <span className="text-2xl font-bold text-emerald-600">
                            {remainingCapacity}%
                        </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                    }`}
                            >
                                {value}%
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Incoming Job or Active Job View */}
                {incomingJob && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card variant="elevated" padding="lg" className="mb-6 border-2 border-emerald-500">
                            <div className="flex items-center gap-2 mb-4">
                                <Package className="w-6 h-6 text-emerald-500" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Incoming Job Request
                                </h2>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{getWasteTypeInfo(incomingJob.wasteType).icon}</span>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {getWasteTypeInfo(incomingJob.wasteType).name}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Size: {incomingJob.wasteSize}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                        <MapPin className="w-5 h-5" />
                                        <span>{incomingJob.pickupLocation.formattedAddress}</span>
                                    </div>

                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Estimated Earnings
                                        </p>
                                        <p className="text-2xl font-bold text-emerald-600">
                                            {formatPrice(incomingJob.amount)}
                                        </p>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            variant="secondary"
                                            fullWidth
                                            onClick={handleDeclineJob}
                                            leftIcon={<XCircle size={18} />}
                                        >
                                            Decline
                                        </Button>
                                        <Button
                                            variant="primary"
                                            fullWidth
                                            onClick={handleAcceptJob}
                                            leftIcon={<CheckCircle size={18} />}
                                        >
                                            Accept Job
                                        </Button>
                                    </div>
                                </div>

                                <Card variant="default" padding="none" className="overflow-hidden h-[300px]">
                                    <MapView
                                        center={incomingJob.pickupLocation}
                                        customerLocation={incomingJob.pickupLocation}
                                        collectorLocation={currentLocation || undefined}
                                        height="100%"
                                    />
                                </Card>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {activeJob && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card variant="elevated" padding="lg" className="mb-6 border-2 border-blue-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Truck className="w-6 h-6 text-blue-500" />
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
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
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {activeJob.customerEmail}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {getWasteTypeInfo(activeJob.wasteType).icon} {getWasteTypeInfo(activeJob.wasteType).name}
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

                                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                        <MapPin className="w-5 h-5" />
                                        <span>{activeJob.pickupLocation.formattedAddress}</span>
                                    </div>

                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            You'll Earn
                                        </p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {formatPrice(activeJob.amount)}
                                        </p>
                                    </div>

                                    <Button
                                        variant="primary"
                                        fullWidth
                                        onClick={handleCompleteJob}
                                        leftIcon={<CheckCircle size={18} />}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        Mark as Completed
                                    </Button>
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

                {/* Stats when no active job */}
                {!incomingJob && !activeJob && (
                    <>
                        {/* Primary Stats Row */}
                        <div className="grid md:grid-cols-3 gap-4">
                            <Card variant="default" padding="md">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                                        <Package className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Today's Pickups</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.todayPickups || 0}</p>
                                    </div>
                                </div>
                            </Card>

                            <Card variant="default" padding="md">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                        <DollarSign className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Today's Earnings</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {formatPrice(stats?.todayEarnings || 0)}
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Card variant="default" padding="md">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                                        <Clock className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Hours Online</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.hoursOnlineToday?.toFixed(1) || '0'}h</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Secondary Stats Row */}
                        <div className="grid md:grid-cols-4 gap-4 mt-4">
                            <Card variant="default" padding="md">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                                        <Calendar className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">This Week</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(stats?.weeklyEarnings || 0)}</p>
                                    </div>
                                </div>
                            </Card>

                            <Card variant="default" padding="md">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                                        <TrendingUp className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">This Month</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(stats?.monthlyEarnings || 0)}</p>
                                    </div>
                                </div>
                            </Card>

                            <Card variant="default" padding="md">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-900/30">
                                        <Percent className="w-6 h-6 text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Acceptance</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{stats?.acceptanceRate || 0}%</p>
                                    </div>
                                </div>
                            </Card>

                            <Card variant="default" padding="md">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/30">
                                        <Star className="w-6 h-6 text-rose-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Rating</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{stats?.averageRating?.toFixed(1) || '0.0'} ⭐</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Your Location Map */}
                        <Card variant="elevated" padding="md" className="mt-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-emerald-500" />
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Your Location</h3>
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
                    </>
                )}

                {/* Info when offline */}
                {!isOnline && !incomingJob && !activeJob && (
                    <Card variant="default" padding="lg" className="mt-6 text-center">
                        <Power className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
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
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                Withdraw Funds
                            </h2>

                            <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Available Balance</p>
                                <p className="text-2xl font-bold text-emerald-600">{formatPrice(walletBalance)}</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Amount (GMD)
                                    </label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={e => setWithdrawAmount(e.target.value)}
                                        placeholder="Enter amount (min 50 GMD)"
                                        min="50"
                                        max={walletBalance}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Phone Number (Wave / Orange Money)
                                    </label>
                                    <input
                                        type="tel"
                                        value={withdrawPhone}
                                        onChange={e => setWithdrawPhone(e.target.value)}
                                        placeholder="+220 XXXXXXXX"
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
