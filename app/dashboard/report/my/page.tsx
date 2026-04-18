'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    AlertTriangle,
    MapPin,
    Loader2,
    ChevronRight,
    Camera,
} from 'lucide-react';
import {
    collection,
    query,
    where,
    onSnapshot,
    Timestamp,
} from 'firebase/firestore';
import { useRequireAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { EnvironmentalReportStatus } from '@/types';

interface MyReportRow {
    id: string;
    photos: string[];
    note: string;
    location: { lat: number; lng: number; address: string };
    status: EnvironmentalReportStatus;
    createdAt?: Timestamp;
}

const STATUS_STYLES: Record<EnvironmentalReportStatus, { label: string; classes: string }> = {
    pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    in_progress: { label: 'In progress', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
    resolved: { label: 'Resolved', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function formatRelative(ts?: Timestamp): string {
    if (!ts) return 'just now';
    const date = ts.toDate();
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
}

export default function MyReportsPage() {
    const router = useRouter();
    const { user, isLoading } = useRequireAuth();
    const [reports, setReports] = useState<MyReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !user) return;

        // Subscribe to this reporter's hazard reports. We intentionally do
        // NOT add an `orderBy('createdAt', 'desc')` clause here because
        // combining it with the `reporterId` equality filter requires a
        // composite index that the project does not provision automatically;
        // when it's missing, Firestore throws FAILED_PRECONDITION and the user
        // sees a generic "could not load your reports" error. Resident report
        // volumes are tiny (one user's own submissions), so sorting in JS is
        // both correct and cheap.
        const q = query(
            collection(db, 'environmentalReports'),
            where('reporterId', '==', user.id),
        );
        const unsub = onSnapshot(
            q,
            (snap) => {
                const rows: MyReportRow[] = snap.docs.map((d) => {
                    const data = d.data() as Partial<MyReportRow>;
                    return {
                        id: d.id,
                        photos: Array.isArray(data.photos) ? data.photos : [],
                        note: typeof data.note === 'string' ? data.note : '',
                        location: data.location || { lat: 0, lng: 0, address: 'Location unavailable' },
                        status: (data.status as EnvironmentalReportStatus) || 'pending',
                        createdAt: data.createdAt as Timestamp | undefined,
                    };
                });
                rows.sort((a, b) => {
                    const at = a.createdAt?.toMillis?.() ?? 0;
                    const bt = b.createdAt?.toMillis?.() ?? 0;
                    return bt - at;
                });
                setReports(rows);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Failed to load reports:', err);
                setError('Could not load your reports. Please try again.');
                setLoading(false);
            },
        );
        return () => unsub();
    }, [user, isLoading]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold text-gray-900">My reports</h1>
                        <p className="text-xs text-gray-500">Hazards you&apos;ve submitted</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard/report')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        New
                    </button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
                        {error}
                    </div>
                ) : reports.length === 0 ? (
                    <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 mb-1">No reports yet</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            When you report an environmental hazard, you&apos;ll see it listed here so
                            you can track what authorities are doing about it.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push('/dashboard/report')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-900 text-white text-sm font-semibold"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Report a hazard
                        </button>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {reports.map((r) => {
                            const status = STATUS_STYLES[r.status] || STATUS_STYLES.pending;
                            const thumb = r.photos[0];
                            return (
                                <li key={r.id}>
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/dashboard/report/my/${r.id}`)}
                                        className="w-full bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 hover:shadow-sm transition flex items-stretch text-left"
                                    >
                                        <div className="w-24 h-24 flex-shrink-0 bg-gray-100 relative">
                                            {thumb ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={thumb}
                                                    alt="Hazard"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <Camera className="w-6 h-6" />
                                                </div>
                                            )}
                                            {r.photos.length > 1 && (
                                                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium">
                                                    {r.photos.length}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span
                                                        className={`text-[11px] font-semibold rounded-full px-2 py-0.5 border ${status.classes}`}
                                                    >
                                                        {status.label}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400">
                                                        {formatRelative(r.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-800 line-clamp-2 flex items-start gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                                                    <span className="break-words">{r.location.address}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center pr-2 text-gray-300">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
