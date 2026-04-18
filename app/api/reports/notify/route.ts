import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore, FieldValue } from '@/lib/firebase-admin';

/**
 * POST /api/reports/notify
 *
 * Body: { reportId: string }
 * Header: Authorization: Bearer <Firebase ID token of the reporter>
 *
 * Fans out an in-app notification (Firestore `notifications` collection) to
 * every user with `isAuthority === true` so they see the new community
 * environmental hazard report the moment it lands. We deliberately avoid
 * Firebase Cloud Messaging / email / SMS — Mbalit only uses Firestore + RTDB.
 *
 * Hardening:
 *   - The caller must present a valid Firebase ID token, and that token's uid
 *     must match the report's `reporterId` — only the reporter can trigger
 *     the fan-out for their own report.
 *   - The report must be young (createdAt within REPLAY_WINDOW_MS); old
 *     reports cannot be replayed to mass-spam authorities.
 *   - Notification doc IDs are deterministic (`notif_{reportId}_{userId}`)
 *     so retries / replays are idempotent — a second call simply overwrites
 *     the same docs instead of producing duplicates.
 *   - Notifications are only ever fired here, on initial creation, so they
 *     naturally stop once a report's status moves to `in_progress` or
 *     `resolved`.
 */

const REPLAY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: NextRequest) {
    let reportId: string | undefined;
    try {
        const body = await request.json();
        reportId = body?.reportId;
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (!reportId || typeof reportId !== 'string') {
        return NextResponse.json({ success: false, error: 'reportId is required.' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const idToken = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : '';
    if (!idToken) {
        return NextResponse.json(
            { success: false, error: 'Authentication required.' },
            { status: 401 },
        );
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminFirestore();
    if (!adminAuth || !adminDb) {
        // Don't fail loudly — the report is already saved client-side; just
        // skip the notification fan-out.
        return NextResponse.json(
            { success: false, error: 'Notification service is temporarily unavailable.' },
            { status: 503 },
        );
    }

    let callerUid: string;
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        callerUid = decoded.uid;
    } catch (err) {
        console.warn('Rejected notify call with invalid token:', err);
        return NextResponse.json(
            { success: false, error: 'Invalid authentication token.' },
            { status: 401 },
        );
    }

    try {
        const reportSnap = await adminDb.collection('environmentalReports').doc(reportId).get();
        if (!reportSnap.exists) {
            return NextResponse.json({ success: false, error: 'Report not found.' }, { status: 404 });
        }
        const report = reportSnap.data() as {
            reporterId?: string;
            reporterName?: string;
            location?: { address?: string };
            photos?: string[];
            createdAt?: FirebaseFirestore.Timestamp;
        };

        // Only the reporter may trigger fan-out for their own report.
        if (report.reporterId !== callerUid) {
            return NextResponse.json(
                { success: false, error: 'You can only notify on your own report.' },
                { status: 403 },
            );
        }

        // Block replay attacks: refuse to re-fan-out for old reports. The
        // deterministic notification IDs below already make retries idempotent,
        // but this stops an attacker from triggering "fresh"-looking
        // notifications for any historical report.
        const createdAtMs = report.createdAt?.toMillis?.() ?? 0;
        if (!createdAtMs || Date.now() - createdAtMs > REPLAY_WINDOW_MS) {
            return NextResponse.json(
                { success: false, error: 'Report is too old to notify on.' },
                { status: 410 },
            );
        }

        const address = report.location?.address || 'an unknown location';
        const photoCount = Array.isArray(report.photos) ? report.photos.length : 0;
        const reporter = report.reporterName || 'A community member';

        // Find every authority user.
        const authoritySnap = await adminDb
            .collection('users')
            .where('isAuthority', '==', true)
            .get();

        if (authoritySnap.empty) {
            return NextResponse.json({ success: true, notified: 0 });
        }

        const photoSummary = photoCount === 1 ? '1 photo' : `${photoCount} photos`;
        const title = 'New community hazard report';
        const message = `${reporter} reported a hazard at ${address} (${photoSummary}). Tap to review.`;

        const recipientIds = authoritySnap.docs.map((d) => d.id);
        const chunks: string[][] = [];
        for (let i = 0; i < recipientIds.length; i += 450) {
            chunks.push(recipientIds.slice(i, i + 450));
        }

        for (const chunk of chunks) {
            const batch = adminDb.batch();
            for (const userId of chunk) {
                // Deterministic ID makes retries / replays idempotent.
                const notifId = `notif_${reportId}_${userId}`;
                const notifRef = adminDb.collection('notifications').doc(notifId);
                batch.set(notifRef, {
                    userId,
                    title,
                    message,
                    type: 'warning',
                    read: false,
                    data: {
                        kind: 'environmental_report',
                        reportId,
                        deepLink: '/organization/reports',
                        photoCount,
                        address,
                    },
                    createdAt: FieldValue.serverTimestamp(),
                });
            }
            await batch.commit();
        }

        return NextResponse.json({ success: true, notified: recipientIds.length });
    } catch (err) {
        console.error('Failed to fan out report notifications:', err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 },
        );
    }
}
