'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Camera,
    MapPin,
    Loader2,
    X,
    AlertTriangle,
    Check,
    Send,
} from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { compressImage } from '@/lib/image-utils';
import { reverseGeocode } from '@/lib/maps';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const MAX_PHOTOS = 5;
const MAX_NOTE_LEN = 500;
const MAX_PAYLOAD_BYTES = 900_000; // safe under Firestore's 1MB doc limit

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

type Located = { lat: number; lng: number; address: string };

export default function ReportHazardPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [photos, setPhotos] = useState<string[]>([]);
    const [note, setNote] = useState('');
    const [location, setLocation] = useState<Located | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const remaining = MAX_PHOTOS - photos.length;
        const toRead = Array.from(files).slice(0, remaining);
        const newPhotos: string[] = [];
        for (const file of toRead) {
            const dataUrl: string = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onloadend = () => resolve(r.result as string);
                r.onerror = () => reject(new Error('Could not read photo'));
                r.readAsDataURL(file);
            });
            // Compress aggressively so we stay under Firestore's 1MB doc limit
            // even with 5 photos. ~150KB per photo target.
            const compressed = await compressImage(dataUrl, 800, 800, 0.55);
            newPhotos.push(compressed);
        }
        setPhotos((prev) => [...prev, ...newPhotos]);
    }, [photos.length]);

    const removePhoto = (idx: number) => {
        setPhotos((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleUseLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError('Location is not supported on this device.');
            return;
        }
        setIsLocating(true);
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                let address = '';
                try {
                    address = (await reverseGeocode(latitude, longitude)) || '';
                } catch {
                    // ignore — we still have coords
                }
                setLocation({
                    lat: latitude,
                    lng: longitude,
                    address: address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                });
                setIsLocating(false);
            },
            (err) => {
                console.error('Geolocation error:', err);
                setLocationError(
                    err.code === err.PERMISSION_DENIED
                        ? 'Location permission denied. Please enable it in your browser settings.'
                        : 'Could not get your location. Please try again.'
                );
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }, []);

    const canSubmit =
        !!user && photos.length > 0 && !!location && !isSubmitting;

    const handleSubmit = async () => {
        if (!canSubmit || !user || !location) return;
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const reportRef = doc(collection(db, 'environmentalReports'));
            const payload = {
                id: reportRef.id,
                reporterId: user.id,
                reporterName: user.name || 'Community member',
                reporterPhone: user.phone || '',
                photos,
                note: note.trim(),
                location,
                status: 'pending' as const,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            // Rough payload size check: serialize and bail early if it would
            // exceed Firestore's 1MB doc limit. The serverTimestamp sentinel
            // doesn't serialize meaningfully, but the photos dominate size.
            const approxBytes = new Blob([JSON.stringify({ ...payload, createdAt: 0, updatedAt: 0 })]).size;
            if (approxBytes > MAX_PAYLOAD_BYTES) {
                setSubmitError(
                    'Your photos are too large to send together. Please remove one or two photos and try again.'
                );
                setIsSubmitting(false);
                return;
            }
            await setDoc(reportRef, payload);
            setIsSuccess(true);
            setTimeout(() => router.push('/dashboard'), 2200);
        } catch (err) {
            console.error('Failed to submit report:', err);
            setSubmitError(
                err instanceof Error
                    ? `Could not send your report: ${err.message}`
                    : 'Could not send your report. Please try again.'
            );
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-full bg-white flex flex-col items-center justify-center px-6 pb-16">
                <div className="w-64 h-64">
                    <DotLottieReact src="/success.lottie" autoplay loop={false} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Report sent</h2>
                <p className="text-sm text-gray-500 text-center max-w-xs">
                    Thank you for helping keep your community clean. Local authorities have been notified.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50 pb-32">
            {/* Header */}
            <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-100 flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100"
                    aria-label="Back"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-gray-900">Report a hazard</h1>
                    <p className="text-xs text-gray-500">
                        Photos and location help authorities respond faster.
                    </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
            </div>

            <div className="px-5 py-5 space-y-5">
                {/* Photos */}
                <section className="bg-white rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-900">Photos</h2>
                        <span className="text-xs text-gray-500">{photos.length}/{MAX_PHOTOS}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {photos.map((src, i) => (
                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removePhoto(i)}
                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                                    aria-label="Remove photo"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {photos.length < MAX_PHOTOS && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <Camera className="w-6 h-6 mb-1" />
                                <span className="text-[11px] font-medium">Add</span>
                            </button>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            handleFiles(e.target.files);
                            e.target.value = '';
                        }}
                    />
                </section>

                {/* Location */}
                <section className="bg-white rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-900">Location</h2>
                        {location && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                <Check className="w-3 h-3" />Pinned
                            </span>
                        )}
                    </div>

                    {!location && (
                        <button
                            type="button"
                            onClick={handleUseLocation}
                            disabled={isLocating}
                            className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                            {isLocating ? 'Getting your location…' : 'Use my current location'}
                        </button>
                    )}

                    {location && (
                        <div className="space-y-3">
                            <div className="flex items-start gap-2 text-sm text-gray-700">
                                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                <span className="break-words">{location.address}</span>
                            </div>
                            {GOOGLE_MAPS_API_KEY && (
                                <div className="rounded-xl overflow-hidden border border-gray-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=16&size=600x240&scale=2&markers=color:red%7C${location.lat},${location.lng}&key=${GOOGLE_MAPS_API_KEY}`}
                                        alt="Map preview"
                                        className="w-full h-auto"
                                    />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleUseLocation}
                                disabled={isLocating}
                                className="text-xs font-medium text-gray-600 hover:text-gray-900"
                            >
                                {isLocating ? 'Updating…' : 'Update location'}
                            </button>
                        </div>
                    )}

                    {locationError && (
                        <p className="mt-2 text-xs text-red-600">{locationError}</p>
                    )}
                </section>

                {/* Note */}
                <section className="bg-white rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-900">Description (optional)</h2>
                        <span className="text-xs text-gray-500">{note.length}/{MAX_NOTE_LEN}</span>
                    </div>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LEN))}
                        placeholder="What's happening here? Any details that might help…"
                        rows={4}
                        className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                    />
                </section>

                {submitError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {submitError}
                    </div>
                )}
            </div>

            {/* Submit (sticky) */}
            <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white/90 backdrop-blur border-t border-gray-100">
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full py-4 rounded-2xl bg-gray-900 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sending…
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Send report
                        </>
                    )}
                </motion.button>
                {!canSubmit && !isSubmitting && (
                    <p className="text-center text-[11px] text-gray-400 mt-2">
                        Add at least one photo and your location to send.
                    </p>
                )}
            </div>
        </div>
    );
}
