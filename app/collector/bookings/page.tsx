'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Settings, Calendar, MapPin, Clock, Package, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { subscribeToCollectorActiveJob, RealtimeJob } from '@/lib/realtime';

const STATUS_LABEL: Record<string, { label: string; tone: 'go' | 'wait' }> = {
    pending: { label: 'Pending', tone: 'wait' },
    assigned: { label: 'Assigned', tone: 'wait' },
    accepted: { label: 'Accepted', tone: 'wait' },
    in_progress: { label: 'In Progress', tone: 'go' },
    arrived: { label: 'Arrived', tone: 'go' },
    awaiting_payment: { label: 'Awaiting Payment', tone: 'wait' },
    completed: { label: 'Completed', tone: 'go' },
    cancelled: { label: 'Cancelled', tone: 'wait' },
};

export default function BookingsPage() {
    const { user } = useAuth();
    const [job, setJob] = useState<RealtimeJob | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        const unsub = subscribeToCollectorActiveJob(user.id, (j) => {
            setJob(j);
            setIsLoading(false);
        });
        return () => { try { unsub?.(); } catch { /* noop */ } };
    }, [user?.id]);

    return (
        <div className="min-h-full bg-white">
            <div className="px-5 pt-12 pb-2 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Bookings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your assigned pickups</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-gray-700" />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-gray-700" />
                    </button>
                </div>
            </div>

            <div className="px-5 mt-4 mb-6">
                {isLoading ? (
                    <div className="py-16 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-[#0E7A3B]" />
                    </div>
                ) : !job ? (
                    <EmptyBookings />
                ) : (
                    <BookingCard job={job} />
                )}
            </div>
        </div>
    );
}

function BookingCard({ job }: { job: RealtimeJob }) {
    const status = STATUS_LABEL[job.status] || { label: job.status, tone: 'wait' as const };
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 tracking-wide">#{job.id}</span>
                <span className={`mb-badge ${status.tone === 'go' ? 'mb-badge-required' : 'mb-badge-optional'}`}>
                    {status.label}
                </span>
            </div>
            <h3 className="font-bold text-[#0F1A14] text-base">{job.customerName || 'Customer'}</h3>
            <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-[#0E7A3B] flex-shrink-0" />
                    <span className="text-xs text-gray-500 truncate">
                        {job.manualAddress || job.pickupLocation?.formattedAddress || `${job.pickupLocation?.lat.toFixed(4)}, ${job.pickupLocation?.lng.toFixed(4)}`}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0E7A3B] flex-shrink-0" />
                    <span className="text-xs text-gray-500">
                        {(job.bucketCount || 0) + (job.largeBinCount || 0)} item{((job.bucketCount || 0) + (job.largeBinCount || 0)) === 1 ? '' : 's'}
                    </span>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500">Payout</p>
                    <p className="font-bold text-[#0F1A14]">
                        D{(job.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <a
                    href={`/track/${job.id}`}
                    className="px-4 py-2 rounded-xl bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-semibold text-sm"
                >
                    View Details
                </a>
            </div>
        </div>
    );
}

function EmptyBookings() {
    return (
        <div className="py-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-4">
                <Calendar className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-[#0F1A14]">No active booking</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-[20rem]">
                When you accept a pickup, it&apos;ll appear here in real time.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F1FAF4] text-[#0E7A3B] text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" />
                Listening for new jobs…
            </div>
        </div>
    );
}
