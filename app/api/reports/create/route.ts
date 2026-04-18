import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getAdminFirestore, FieldValue } from '@/lib/firebase-admin';
import { getSessionUser } from '@/lib/auth-server';

/**
 * POST /api/reports/create
 *
 * Body: {
 *   requestId: string,                       // client-generated idempotency key
 *   photos: string[],                        // 1..MAX_PHOTOS base64 data URLs
 *   note: string,
 *   location: { lat: number, lng: number, address: string }
 * }
 * Header: Authorization: Bearer <Firebase ID token of the reporter>
 *
 * Server-trusted entry point for environmental hazard reports.
 *
 * Atomicity guarantee
 * -------------------
 * The report doc and every authority notification are committed in ONE
 * Firestore WriteBatch. Either everything is persisted or nothing is —
 * the client only sees success when authorities have actually been
 * notified. (Firestore caps a batch at 500 operations, so we cap the
 * total recipients at MAX_RECIPIENTS = 499 and reject with 503 above
 * that. For the Gambia pilot — single-digit authority orgs — this is
 * comfortably within bounds.)
 *
 * Idempotency
 * -----------
 * The caller supplies a `requestId` (a UUID). The report doc ID is
 * derived deterministically from `(reporterUid, requestId)`. If the
 * same request is retried (network hiccup, double-tap submit), we
 * detect the existing report and return 200 WITHOUT writing anything —
 * no duplicate reports, no duplicate notifications. Notification doc
 * IDs (`notif_{reportId}_{userId}`) are also deterministic, so the
 * batch itself is replay-safe even if the existence check raced.
 *
 * Recipients
 * ----------
 * Notifications go to the members + ownerId of every `organizations`
 * doc with `isAuthority == true`. This matches the spec's recipient
 * model (authority **organizations**, not a per-user flag).
 *
 * Mbalit only uses Firestore + RTDB (no FCM, no email, no SMS); the
 * notifications collection is what the in-app dropdowns already render.
 * Notifications are only ever written here, on initial create — so once
 * a report's status moves to `in_progress` or `resolved`, no further
 * notifications fire.
 */

const MAX_PAYLOAD_BYTES = 950_000; // ~Firestore 1MB ceiling, leaves headroom
const MAX_PHOTOS = 5;
const MAX_NOTE_LEN = 1000;
const MAX_RECIPIENTS = 499; // Firestore batch op cap (500) minus the report doc

interface IncomingBody {
    requestId?: unknown;
    photos?: unknown;
    note?: unknown;
    location?: unknown;
}

function isStringArray(v: unknown): v is string[] {
    return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function isLocation(v: unknown): v is { lat: number; lng: number; address: string } {
    if (!v || typeof v !== 'object') return false;
    const o = v as { lat?: unknown; lng?: unknown; address?: unknown };
    return typeof o.lat === 'number' && typeof o.lng === 'number' && typeof o.address === 'string';
}

function deterministicReportId(uid: string, requestId: string): string {
    // 24-char hex slice keeps IDs short-ish but collision-resistant.
    const h = createHash('sha256').update(`${uid}:${requestId}`).digest('hex');
    return `er_${h.slice(0, 24)}`;
}

export async function POST(request: NextRequest) {
    let body: IncomingBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    const requestId =
        typeof body.requestId === 'string' && body.requestId.length >= 8 && body.requestId.length <= 128
            ? body.requestId
            : '';
    if (!requestId) {
        return NextResponse.json(
            { success: false, error: 'A requestId (8-128 chars) is required for safe retries.' },
            { status: 400 },
        );
    }
    if (!isStringArray(body.photos) || body.photos.length === 0 || body.photos.length > MAX_PHOTOS) {
        return NextResponse.json(
            { success: false, error: `photos must be 1-${MAX_PHOTOS} items.` },
            { status: 400 },
        );
    }
    if (!isLocation(body.location)) {
        return NextResponse.json(
            { success: false, error: 'A valid location { lat, lng, address } is required.' },
            { status: 400 },
        );
    }
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, MAX_NOTE_LEN) : '';

    const adminDb = getAdminFirestore();
    if (!adminDb) {
        return NextResponse.json(
            { success: false, error: 'Reporting service is temporarily unavailable.' },
            { status: 503 },
        );
    }

    const session = await getSessionUser(request);
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Authentication required.' },
            { status: 401 },
        );
    }
    const callerUid = session.userId;

    const reportId = deterministicReportId(callerUid, requestId);
    const reportRef = adminDb.collection('environmentalReports').doc(reportId);

    // ---- Idempotent retry short-circuit ----------------------------
    // If this exact (uid, requestId) has already produced a report, just
    // acknowledge it. Skips both duplicate writes and duplicate alerts.
    try {
        const existing = await reportRef.get();
        if (existing.exists) {
            return NextResponse.json({
                success: true,
                reportId,
                duplicate: true,
                notified: 0,
            });
        }
    } catch (err) {
        console.error('Failed pre-check for existing report:', err);
        return NextResponse.json(
            { success: false, error: 'Could not validate report state. Please try again.' },
            { status: 500 },
        );
    }

    // Pull reporter display info (best effort — non-fatal).
    let reporterName = 'A community member';
    let reporterPhone = '';
    try {
        const userSnap = await adminDb.collection('users').doc(callerUid).get();
        if (userSnap.exists) {
            const u = userSnap.data() as { name?: string; phone?: string };
            if (u?.name) reporterName = u.name;
            if (u?.phone) reporterPhone = u.phone;
        }
    } catch (err) {
        console.warn('Could not load reporter profile (continuing):', err);
    }

    const reportPayload = {
        id: reportId,
        requestId,
        reporterId: callerUid,
        reporterName,
        reporterPhone,
        photos: body.photos,
        note,
        location: body.location,
        status: 'pending' as const,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    // Server-side payload size guard.
    const approxBytes = Buffer.byteLength(JSON.stringify(reportPayload), 'utf8');
    if (approxBytes > MAX_PAYLOAD_BYTES) {
        return NextResponse.json(
            {
                success: false,
                error: 'Photos are too large to send together. Remove one or two and try again.',
            },
            { status: 413 },
        );
    }

    // ---- Resolve recipients before staging the batch --------------
    let recipientIds: string[];
    try {
        const orgsSnap = await adminDb
            .collection('organizations')
            .where('isAuthority', '==', true)
            .get();
        const set = new Set<string>();
        for (const orgDoc of orgsSnap.docs) {
            const org = orgDoc.data() as { members?: unknown; ownerId?: unknown };
            if (Array.isArray(org.members)) {
                for (const m of org.members) {
                    if (typeof m === 'string' && m) set.add(m);
                }
            }
            if (typeof org.ownerId === 'string' && org.ownerId) set.add(org.ownerId);
        }
        recipientIds = [...set];
    } catch (err) {
        console.error('Failed to resolve authority recipients:', err);
        return NextResponse.json(
            { success: false, error: 'Could not resolve authority recipients. Please try again.' },
            { status: 500 },
        );
    }

    if (recipientIds.length > MAX_RECIPIENTS) {
        // We don't want partial fan-out; surface this loudly so ops can split orgs.
        return NextResponse.json(
            {
                success: false,
                error: `Too many authority recipients (${recipientIds.length}). Contact support.`,
            },
            { status: 503 },
        );
    }

    const photoCount = body.photos.length;
    const photoSummary = photoCount === 1 ? '1 photo' : `${photoCount} photos`;
    const title = 'New community hazard report';
    const message = `${reporterName} reported a hazard at ${body.location.address} (${photoSummary}). Tap to review.`;

    // ---- Atomic batch: report + every notification ----------------
    try {
        const batch = adminDb.batch();
        batch.create(reportRef, reportPayload);
        for (const userId of recipientIds) {
            const notifRef = adminDb
                .collection('notifications')
                .doc(`notif_${reportId}_${userId}`);
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
                    address: body.location.address,
                },
                createdAt: FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
    } catch (err: unknown) {
        const code = (err as { code?: number | string })?.code;
        // ALREADY_EXISTS means the report doc was created between our
        // pre-check and commit (concurrent retry). Treat as success.
        if (code === 6 || code === 'already-exists') {
            return NextResponse.json({
                success: true,
                reportId,
                duplicate: true,
                notified: 0,
            });
        }
        console.error('Atomic report+notify batch failed:', err);
        return NextResponse.json(
            {
                success: false,
                error:
                    err instanceof Error
                        ? `Could not save your report: ${err.message}`
                        : 'Could not save your report. Please try again.',
            },
            { status: 500 },
        );
    }

    return NextResponse.json({
        success: true,
        reportId,
        notified: recipientIds.length,
    });
}
