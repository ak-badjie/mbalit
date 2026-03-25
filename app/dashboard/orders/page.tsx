'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    Truck,
    MapPin,
    Calendar,
    DollarSign,
    ChevronRight,
    RefreshCw,
    Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { formatPrice, WASTE_TYPES } from '@/lib/waste-config';

// Order types
interface Order {
    id: string;
    wasteType: string;
    wasteSize: string;
    status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    amount: number;
    createdAt: Date;
    scheduledDate?: Date;
    location: {
        formattedAddress: string;
    };
    collectorName?: string;
    collectorPhone?: string;
}

// Get waste type info
const getWasteTypeInfo = (wasteTypeId: string) => {
    return WASTE_TYPES.find(w => w.id === wasteTypeId) || { name: 'Unknown', icon: '📦' };
};

// Status badge
const StatusBadge: React.FC<{ status: Order['status'] }> = ({ status }) => {
    const configs = {
        pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700  ', icon: Clock },
        accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-700  ', icon: CheckCircle },
        in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700  ', icon: Truck },
        completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700  ', icon: CheckCircle },
        cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700  ', icon: XCircle },
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
};

// Order Card
const OrderCard: React.FC<{ order: Order; index: number }> = ({ order, index }) => {
    const wasteInfo = getWasteTypeInfo(order.wasteType);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Link href={`/track/${order.id}`}>
                <Card variant="elevated" padding="md" className="hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100   flex items-center justify-center text-2xl flex-shrink-0">
                            {wasteInfo.icon}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="font-bold text-gray-900 ">
                                        {wasteInfo.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 ">
                                        {order.wasteSize} • {formatPrice(order.amount)}
                                    </p>
                                </div>
                                <StatusBadge status={order.status} />
                            </div>

                            {/* Location */}
                            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 ">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{order.location.formattedAddress}</span>
                            </div>

                            {/* Date and Collector */}
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {order.createdAt.toLocaleDateString()}
                                </span>
                                {order.collectorName && (
                                    <span className="text-xs text-emerald-600  font-medium">
                                        {order.collectorName}
                                    </span>
                                )}
                            </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
};

export default function OrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

    // Load orders from database
    useEffect(() => {
        const loadOrders = async () => {
            setIsLoading(true);
            try {
                // TODO: Replace with actual Firestore query
                // const orders = await getUserOrders(user?.id);
                // setOrders(orders);
                setOrders([]);
            } catch (err) {
                console.error('Failed to load orders:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadOrders();
    }, [user]);

    // Filter orders
    const filteredOrders = orders.filter(order => {
        if (filter === 'active') return ['pending', 'accepted', 'in_progress'].includes(order.status);
        if (filter === 'completed') return ['completed', 'cancelled'].includes(order.status);
        return true;
    });

    // Stats
    const activeCount = orders.filter(o => ['pending', 'accepted', 'in_progress'].includes(o.status)).length;
    const completedCount = orders.filter(o => o.status === 'completed').length;
    const totalSpent = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.amount, 0);

    return (
        <div className="min-h-full bg-gradient-to-br from-gray-50 via-white to-emerald-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80  backdrop-blur-xl border-b border-gray-200 ">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <button className="p-2 rounded-xl hover:bg-gray-100  transition-colors">
                                <ArrowLeft className="w-5 h-5 text-gray-600 " />
                            </button>
                        </Link>
                        <h1 className="text-xl font-bold text-gray-900 ">My Orders</h1>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.location.reload()}
                        leftIcon={<RefreshCw size={16} />}
                    >
                        Refresh
                    </Button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <Card variant="default" padding="sm" className="text-center">
                        <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
                        <p className="text-xs text-gray-500">Active</p>
                    </Card>
                    <Card variant="default" padding="sm" className="text-center">
                        <p className="text-2xl font-bold text-gray-900 ">{completedCount}</p>
                        <p className="text-xs text-gray-500">Completed</p>
                    </Card>
                    <Card variant="default" padding="sm" className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{formatPrice(totalSpent)}</p>
                        <p className="text-xs text-gray-500">Total Spent</p>
                    </Card>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 p-1 bg-gray-100  rounded-xl">
                    {(['all', 'active', 'completed'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${filter === f
                                ? 'bg-white  text-gray-900  shadow-sm'
                                : 'text-gray-500  hover:text-gray-700 '
                                }`}
                        >
                            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'History'}
                        </button>
                    ))}
                </div>

                {/* Orders List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-300  mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900  mb-2">
                            No orders found
                        </h3>
                        <p className="text-gray-500  mb-6">
                            {filter === 'all'
                                ? "You haven't placed any orders yet"
                                : filter === 'active'
                                    ? "No active orders right now"
                                    : "No order history yet"
                            }
                        </p>
                        <Link href="/dashboard">
                            <Button variant="primary" leftIcon={<Package size={18} />}>
                                Schedule a Pickup
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {filteredOrders.map((order, index) => (
                                <OrderCard key={order.id} order={order} index={index} />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>
        </div>
    );
}
