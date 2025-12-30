'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    ArrowLeft,
    Bell,
    Package,
    DollarSign,
    Star,
    AlertCircle,
    CheckCircle,
    Clock,
    Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import {
    getCollectorNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from '@/lib/firestore';
import { Notification } from '@/types';

export default function NotificationsPage() {
    const { user } = useAuth();
    const collectorId = user?.id || 'demo-collector';

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    // Load notifications
    useEffect(() => {
        const loadNotifications = async () => {
            try {
                const data = await getCollectorNotifications(collectorId);
                setNotifications(data);
            } catch (err) {
                console.error('Failed to load notifications:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadNotifications();
    }, [collectorId]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead(collectorId);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'job':
                return <Package className="w-5 h-5 text-emerald-500" />;
            case 'payment':
                return <DollarSign className="w-5 h-5 text-blue-500" />;
            case 'rating':
                return <Star className="w-5 h-5 text-amber-500" />;
            case 'alert':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'success':
                return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            default:
                return <Bell className="w-5 h-5 text-gray-500" />;
        }
    };

    const formatTime = (timestamp: Date | string) => {
        const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const unreadCount = notifications.filter(n => !n.read).length;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/collector/dashboard">
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
                            onClick={handleMarkAllAsRead}
                            className="text-emerald-600 hover:text-emerald-700"
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="max-w-2xl mx-auto px-4 py-4">
                <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${filter === 'all'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        All ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${filter === 'unread'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        Unread ({unreadCount})
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <main className="max-w-2xl mx-auto px-4">
                <AnimatePresence mode="popLayout">
                    {filteredNotifications.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Bell className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                            </h3>
                            <p className="text-gray-500">
                                {filter === 'unread'
                                    ? "You're all caught up!"
                                    : "You'll see job updates and alerts here"}
                            </p>
                        </motion.div>
                    ) : (
                        <div className="space-y-3">
                            {filteredNotifications.map((notification, index) => (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card
                                        variant="default"
                                        padding="md"
                                        className={`cursor-pointer transition-all hover:shadow-md ${!notification.read
                                                ? 'border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10'
                                                : ''
                                            }`}
                                        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`p-2 rounded-xl ${!notification.read
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                                    : 'bg-gray-100 dark:bg-gray-800'
                                                }`}>
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className={`font-medium ${!notification.read
                                                            ? 'text-gray-900 dark:text-white'
                                                            : 'text-gray-700 dark:text-gray-300'
                                                        }`}>
                                                        {notification.title}
                                                    </h4>
                                                    {!notification.read && (
                                                        <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-2" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{formatTime(notification.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
