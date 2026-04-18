'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    MapPin,
    Loader2,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Clock,
} from 'lucide-react';
import {
    collection,
    documentId,
    limit,
    onSnapshot,
    query,
    Timestamp,
    where,
} from 'firebase/firestore';
import { useRequireAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { EnvironmentalReportStatus } from '@/types';

interface ReportDetail {
    id: string;
    reporterId: string;
    photos: string[];
    note: string;
    location: { lat: number; lng: number; address: string };
    status: EnvironmentalReportStatus;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

const STATUS_STYLES: Record<EnvironmentalReportStatus, { label: string; classes: string; description: string }> = {
    pending: {
        label: 'Pending',
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
        description: 'Authorities have been notified and will review your report soon.',
    },
    in_progress: {
        label: 'In progress',
        classes: 'bg-blue-50 text-blue-700 border-blue-200',
        description: 'An authority is actively working on resolving this hazard.',
    },
    resolved: {
        label: 'Resolved',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        description: 'This report has been marked resolved. Thank you for helping keep your community safe.',
    },
};

function formatFull(ts?: Timestamp): string {
    if (!ts) return '—';
    return ts.toDate().toLocaleString();
}

export default function MyReportDetailPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const reportId = params?.id;
    const { user, isLoading } = useRequireAuth();

    const [report, setReport] = useState<ReportDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [photoIdx, setPhotoIdx] = useState(0);

    useEffect(() => {
        if (isLoading || !user || !reportId) return;
        // Use an ownership-CONSTRAINED query (documentId == reportId AND
        // reporterId == user.id) instead of a direct doc subscription. With
        // this app's auth model (no Firebase Auth, so Firestore Security Rules
        // can't enforce per-user reads), a direct doc read would deliver any
        // other user's report payload to the client whenever someone guessed
        // the id. Constraining the query forces Firestore (and any rules that
        // ARE in place) to filter by reporterId before sending the doc.
        const q = query(
            collection(db, 'environmentalReports'),
            where(documentId(), '==', reportId),
            where('reporterId', '==', user.id),
            limit(1),
        );
        const unsub = onSnapshot(
            q,
            (snap) => {
                if (snap.empty) {
                    setReport(null);
                    setError("This report doesn't exist or you don't have access to it.");
                    setLoading(false);
                    return;
                }
                const docSnap = snap.docs[0]!;
                const data = docSnap.data() as Partial<ReportDetail>;
                setReport({
                    id: docSnap.id,
                    reporterId: data.reporterId as string,
                    photos: Array.isArray(data.photos) ? data.photos : [],
                    note: typeof data.note === 'string' ? data.note : '',
                    location: data.location || { lat: 0, lng: 0, address: 'Location unavailable' },
                    status: (data.status as EnvironmentalReportStatus) || 'pending',
                    createdAt: data.createdAt as Timestamp | undefined,
                    updatedAt: data.updatedAt as Timestamp | undefined,
                });
                setError(null);
                setLoading(false);
            },
            (err) => {
                console.error('Failed to load report:', err);
                setError('Could not load this report. Please try again.');
                setLoading(false);
            },
        );
        return () => unsub();
    }, [user, isLoading, reportId]);

    if (isLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
                    <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.push('/dashboard/report/my')}
                            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
                            aria-label="Back to my reports"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-700" />
                        </button>
                        <h1 className="text-base font-bold text-gray-900">Report</h1>
                    </div>
                </div>
                <div className="max-w-2xl mx-auto px-4 py-6">
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
                        {error || 'Report not found.'}
                    </div>
                </div>
            </div>
        );
    }

    const status = STATUS_STYLES[report.status] || STATUS_STYLES.pending;
    const photo = report.photos[photoIdx];
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${report.location.lat},${report.location.lng}`;

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard/report/my')}
                        className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
                        aria-label="Back to my reports"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <h1 className="text-base font-bold text-gray-900">Report details</h1>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                {/* Photo carousel */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="relative bg-gray-100 aspect-[4/3]">
                        {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={photo} alt="Hazard" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                No photo attached
                            </div>
                        )}
                        {report.photos.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPhotoIdx((i) => (i - 1 + report.photos.length) % report.photos.length)
                                    }
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"
                                    aria-label="Previous photo"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPhotoIdx((i) => (i + 1) % report.photos.length)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"
                                    aria-label="Next photo"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-medium">
                                    {photoIdx + 1} / {report.photos.length}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Status card */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className={`text-xs font-semibold rounded-full px-3 py-1 border ${status.classes}`}
                        >
                            {status.label}
                        </span>
                        <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Updated {formatFull(report.updatedAt || report.createdAt)}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600">{status.description}</p>
                </div>

                {/* Location */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Location
                    </p>
                    <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 text-sm text-gray-800 hover:text-gray-900"
                    >
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                        <span className="break-words flex-1">{report.location.address}</span>
                        <ExternalLink className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                    </a>
                </div>

                {/* Note */}
                {report.note && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            What you reported
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.note}</p>
                    </div>
                )}

                {/* Submitted timestamp */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Submitted
                    </p>
                    <p className="text-sm text-gray-800 inline-flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        {formatFull(report.createdAt)}
                    </p>
                </div>
            </div>
        </div>
    );
}
