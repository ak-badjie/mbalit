'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    MapPin,
    Phone,
    Loader2,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
} from 'lucide-react';
import {
    collection,
    query,
    orderBy,
    limit as fbLimit,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { useRequireAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { EnvironmentalReportStatus } from '@/types';

interface ReportDoc {
    id: string;
    reporterId: string;
    reporterName: string;
    reporterPhone: string;
    photos: string[];
    note: string;
    location: { lat: number; lng: number; address: string };
    status: EnvironmentalReportStatus;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

const STATUS_OPTIONS: { value: EnvironmentalReportStatus; label: string; classes: string }[] = [
    { value: 'pending', label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'in_progress', label: 'In progress', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'resolved', label: 'Resolved', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

function formatRelative(ts?: Timestamp): string {
    if (!ts) return 'just now';
    const date = ts.toDate();
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
}

function ReportCard({ report }: { report: ReportDoc }) {
    const photos: string[] = Array.isArray(report.photos) ? report.photos : [];
    const location = report.location || { lat: 0, lng: 0, address: 'Location unavailable' };
    const [photoIdx, setPhotoIdx] = useState(0);
    const [updating, setUpdating] = useState(false);
    const photo = photos[photoIdx];

    const updateStatus = async (next: EnvironmentalReportStatus) => {
        if (next === report.status) return;
        setUpdating(true);
        try {
            await updateDoc(doc(db, 'environmentalReports', report.id), {
                status: next,
                updatedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Could not update status. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Photo carousel */}
            <div className="relative bg-gray-100 aspect-[4/3]">
                {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="Hazard" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No photo</div>
                )}
                {photos.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                            aria-label="Previous photo"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                            aria-label="Next photo"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/50 text-white text-[11px] font-medium">
                            {photoIdx + 1} / {photos.length}
                        </div>
                    </>
                )}
            </div>

            <div className="p-4 space-y-3">
                {/* Status + time */}
                <div className="flex items-center justify-between gap-2">
                    <select
                        value={report.status}
                        onChange={(e) => updateStatus(e.target.value as EnvironmentalReportStatus)}
                        disabled={updating}
                        className={`text-xs font-semibold rounded-full px-3 py-1 border ${
                            STATUS_OPTIONS.find((s) => s.value === report.status)?.classes ||
                            'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                    >
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                    <span className="text-[11px] text-gray-400">{formatRelative(report.createdAt)}</span>
                </div>

                {/* Address */}
                <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-sm text-gray-700 hover:text-gray-900"
                >
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                    <span className="break-words flex-1">{location.address}</span>
                    <ExternalLink className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                </a>

                {/* Note */}
                {report.note && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.note}</p>
                )}

                {/* Reporter */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="min-w-0">
                        <p className="text-xs text-gray-500">Reported by</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{report.reporterName}</p>
                    </div>
                    {report.reporterPhone && (
                        <a
                            href={`tel:${report.reporterPhone.replace(/\s+/g, '')}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-medium"
                        >
                            <Phone className="w-3.5 h-3.5" />
                            Call
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AuthorityReportsPage() {
    const router = useRouter();
    const { user, isLoading } = useRequireAuth();
    const [reports, setReports] = useState<ReportDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Authority gate: send non-authority users back to a dashboard that makes
    // sense for their role rather than always to the org dashboard.
    useEffect(() => {
        if (isLoading) return;
        if (!user) return;
        const u = user as { isAuthority?: boolean; collectorType?: string; userType?: string };
        if (u.isAuthority === true) return;
        if (u.collectorType === 'organization') {
            router.replace('/organization/dashboard');
        } else if (u.userType === 'collector' || u.collectorType === 'individual') {
            router.replace('/collector/dashboard');
        } else {
            router.replace('/dashboard');
        }
    }, [user, isLoading, router]);

    // Subscribe to reports (only once we know the user is an authority).
    useEffect(() => {
        if (isLoading || !user) return;
        const isAuthorityUser =
            (user as { isAuthority?: boolean }).isAuthority === true;
        if (!isAuthorityUser) return;

        const q = query(
            collection(db, 'environmentalReports'),
            orderBy('createdAt', 'desc'),
            fbLimit(100)
        );
        const unsub = onSnapshot(
            q,
            (snap) => {
                const next: ReportDoc[] = snap.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as Omit<ReportDoc, 'id'>),
                }));
                setReports(next);
                setLoading(false);
            },
            (err) => {
                console.error('Failed to load reports:', err);
                setError('Could not load reports. ' + err.message);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [user, isLoading]);

    if (isLoading || !user) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-gray-50 pb-16">
            {/* Header */}
            <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-200 flex items-center gap-3">
                <button
                    onClick={() => router.push('/organization/dashboard')}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100"
                    aria-label="Back"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-gray-900">Community reports</h1>
                    <p className="text-xs text-gray-500">
                        Environmental hazards reported by residents.
                    </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
            </div>

            <div className="px-5 py-5 space-y-4 max-w-2xl mx-auto">
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-16 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                )}

                {!loading && reports.length === 0 && !error && (
                    <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center shadow-sm">
                        <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-700">No reports yet</p>
                        <p className="text-xs text-gray-500 mt-1">
                            New community reports will appear here as soon as they&apos;re submitted.
                        </p>
                    </div>
                )}

                {reports.map((r) => (
                    <ReportCard key={r.id} report={r} />
                ))}
            </div>
        </div>
    );
}
