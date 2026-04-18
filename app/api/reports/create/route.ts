import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore, FieldValue } from '@/lib/firebase-admin';

/**
 * POST /api/reports/create
 *
 * Body: {
 *   photos: string[],
 *   note: string,
 *   location: { lat: number, lng: number, address: string }
 * }
 * Header: Authorization: Bearer <Firebase ID token of the reporter>
 *
 * Server-trusted entry point for environmental hazard reports. Doing the
 * write here (instead of from the client) lets us guarantee that authority
 * notifications fan out together with the report — the operation is atomic
 * from the caller's perspective: either the report is saved AND authorities
 * are notified, or the call fails and the client knows to retry.
 *
 * Mbalit only uses Firestore + RTDB (no FCM, no email, no SMS); notifications
 * are written to the existing in-app `notifications` Firestore collection.
 *
 * Recipient model: notifications are sent to the **members of every authority
 * organization** (`organizations` where `isAuthority == true`). This matches
 * the spec, which keys recipients off `organizations/{orgCode}.isAuthority`.
 *
 * Hardening:
 *   - Caller must present a valid Firebase ID token; the report is stamped
 *     with their uid as `reporterId`.
 *   - Notification doc IDs are deterministic (`notif_{reportId}_{userId}`)
 *     AND written with `doc.create` — if the same notification already exists
 *     (e.g. from a retry) we silently keep the original, never overwriting
 *     the recipient's read state or createdAt.
 *   - Notifications are only ever fired here, on initial creation; they
 *     naturally stop once a report's status moves to `in_progress` or
 *     `resolved`.
 */

const MAX_PAYLOAD_BYTES = 950_000; // matches client-side guard with small headroom
const MAX_PHOTOS = 5;
const MAX_NOTE_LEN = 1000;

interface IncomingBody {
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

export async function POST(request: NextRequest) {
    let body: IncomingBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
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
        return NextResponse.json(
            { success: false, error: 'Reporting service is temporarily unavailable.' },
            { status: 503 },
        );
    }

    let callerUid: string;
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        callerUid = decoded.uid;
    } catch (err) {
        console.warn('Rejected report create with invalid token:', err);
        return NextResponse.json(
            { success: false, error: 'Invalid authentication token.' },
            { status: 401 },
        );
    }

    // Pull reporter display info from their user doc (fallbacks below).
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

    try {
        const reportRef = adminDb.collection('environmentalReports').doc();
        const reportPayload = {
            id: reportRef.id,
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

        // Server-side payload size guard — protects against bypassing the
        // client guard on the way to Firestore's 1MB doc limit.
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

        await reportRef.set(reportPayload);

        // ---- Notification fan-out --------------------------------------
        // Spec requires recipients to be derived from authority **organizations**.
        // We collect every member of every authority org, dedupe, then create
        // one in-app notification per member. Doc IDs are deterministic +
        // written with doc.create() so retries don't overwrite read state.
        const orgsSnap = await adminDb
            .collection('organizations')
            .where('isAuthority', '==', true)
            .get();

        const recipientIds = new Set<string>();
        for (const orgDoc of orgsSnap.docs) {
            const org = orgDoc.data() as { members?: unknown; ownerId?: unknown };
            if (Array.isArray(org.members)) {
                for (const m of org.members) {
                    if (typeof m === 'string' && m) recipientIds.add(m);
                }
            }
            if (typeof org.ownerId === 'string' && org.ownerId) {
                recipientIds.add(org.ownerId);
            }
        }

        const photoCount = body.photos.length;
        const photoSummary = photoCount === 1 ? '1 photo' : `${photoCount} photos`;
        const title = 'New community hazard report';
        const message = `${reporterName} reported a hazard at ${body.location.address} (${photoSummary}). Tap to review.`;

        let notified = 0;
        const ids = [...recipientIds];
        for (let i = 0; i < ids.length; i += 450) {
            const chunk = ids.slice(i, i + 450);
            await Promise.all(
                chunk.map(async (userId) => {
                    const notifRef = adminDb
                        .collection('notifications')
                        .doc(`notif_${reportRef.id}_${userId}`);
                    try {
                        // .create() throws ALREADY_EXISTS on retries — that's
                        // exactly the idempotency guarantee we want, since it
                        // preserves the original read state and timestamp.
                        await notifRef.create({
                            userId,
                            title,
                            message,
                            type: 'warning',
                            read: false,
                            data: {
                                kind: 'environmental_report',
                                reportId: reportRef.id,
                                deepLink: '/organization/reports',
                                photoCount,
                                address: body.location.address,
                            },
                            createdAt: FieldValue.serverTimestamp(),
                        });
                        notified += 1;
                    } catch (err: unknown) {
                        const code = (err as { code?: number | string })?.code;
                        // 6 / 'already-exists' is fine — silent no-op for retries.
                        if (code === 6 || code === 'already-exists') return;
                        console.warn('Failed to create authority notification:', err);
                    }
                }),
            );
        }

        return NextResponse.json({ success: true, reportId: reportRef.id, notified });
    } catch (err) {
        console.error('Failed to create environmental report:', err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 },
        );
    }
}
