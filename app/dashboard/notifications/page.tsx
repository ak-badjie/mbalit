'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Bell,
    CheckCircle,
    XCircle,
    Truck,
    AlertCircle,
    Info,
    Check,
    Trash2,
    DollarSign,
    Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { Notification } from '@/types';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/firestore';

const iconMap = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: XCircle,
    payment_offer: DollarSign,
    pickup_reminder: Package,
};

const colorMap = {
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    payment_offer: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    pickup_reminder: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
};

// Notification Item
const NotificationItem: React.FC<{
    notification: Notification;
    onRead: (id: string) => void;
    index: number;
}> = ({ notification, onRead, index }) => {
    const Icon = iconMap[notification.type] || Info;

    const formatTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => !notification.read && onRead(notification.id)}
            className={`p-4 border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!notification.read ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
                }`}
        >
            <div className="flex gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorMap[notification.type]}`}>
                    <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                            {notification.title}
                        </p>
                        {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
                        )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                        {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {formatTime(notification.createdAt)}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const userId = user?.id || 'demo-user';

    // Load notifications
    useEffect(() => {
        const loadNotifications = async () => {
            try {
                const data = await getNotifications(userId);
                setNotifications(data);
            } catch (err) {
                console.error('Failed to load notifications:', err);
                // Mock data for demo
                setNotifications([
                    {
                        id: '1',
                        userId,
                        title: 'Pickup Scheduled',
                        message: 'Your waste pickup has been scheduled for tomorrow at 10:00 AM.',
                        type: 'success',
                        read: false,
                        createdAt: new Date(),
                    },
                    {
                        id: '2',
                        userId,
                        title: 'Collector En Route',
                        message: 'Amadou J. is on the way to collect your waste. ETA: 15 minutes.',
                        type: 'info',
                        read: false,
                        createdAt: new Date(Date.now() - 3600000),
                    },
                    {
                        id: '3',
                        userId,
                        title: 'Pickup Completed',
                        message: 'Your household waste pickup has been completed. Thank you for using MBALit!',
                        type: 'success',
                        read: true,
                        createdAt: new Date(Date.now() - 86400000),
                    },
                    {
                        id: '4',
                        userId,
                        title: 'Rate Your Experience',
                        message: 'How was your pickup with Fatou S.? Leave a review to help other users.',
                        type: 'info',
                        read: true,
                        createdAt: new Date(Date.now() - 172800000),
                    },
                ]);
            } finally {
                setIsLoading(false);
            }
        };
        loadNotifications();
    }, [userId]);

    const handleRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsAsRead(userId);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

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
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                            {unreadCount > 0 && (
                                <p className="text-xs text-gray-500">{unreadCount} unread</p>
                            )}
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllRead}
                            leftIcon={<Check size={16} />}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-16">
                        <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No notifications yet
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            We'll notify you about your pickups and updates
                        </p>
                    </div>
                ) : (
                    <Card variant="elevated" padding="none">
                        <AnimatePresence mode="popLayout">
                            {notifications.map((notification, index) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onRead={handleRead}
                                    index={index}
                                />
                            ))}
                        </AnimatePresence>
                    </Card>
                )}
            </main>
        </div>
    );
}
