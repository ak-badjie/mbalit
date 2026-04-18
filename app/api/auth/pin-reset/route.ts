import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, FieldValue } from '@/lib/firebase-admin';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const MAX_REQUESTS_PER_WEEK = 3;
const MAX_PER_IP_PER_HOUR = 5;
const ONE_HOUR_MS = 60 * 60 * 1000;

function makeReferenceCode(): string {
    const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    return `R-${seg()}-${seg()}`;
}

function getClientIp(req: NextRequest): string {
    // NOTE: x-forwarded-for is only trustworthy when the deployment runs behind a
    // single trusted proxy (e.g. Vercel, Cloudflare). On a raw exposed Node
    // server an attacker can spoof this header and dilute the per-IP throttle.
    // For Replit Deployments and Vercel the leftmost value is the original
    // client. Per-phone limits remain the primary defense.
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0]!.trim();
    return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    let body: { phone?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const phoneInput = typeof body.phone === 'string' ? body.phone : '';
    // Canonicalize: keep only leading + and digits so adversarial whitespace /
    // punctuation can't bypass per-phone throttling. Then re-format to match how
    // the rest of the app stores phones ("+CC NNN NN NN"). This must mirror
    // app/auth/page.tsx formatPhone() so lookups against `users.phone` work.
    const compact = phoneInput.replace(/[^\d+]/g, '');
    let phoneRaw = '';
    if (compact.startsWith('+') && compact.length >= 7) {
        const digits = compact.slice(1);
        // Heuristic: assume 1-4 digit country code; we don't have a parser here,
        // so use a simple split that matches existing app format `${dial} ${num}`.
        // Pull country code = leading digits before the last 7-10 digits.
        const localLen = Math.min(7, Math.max(7, digits.length - 1));
        const cc = digits.slice(0, digits.length - localLen);
        const local = digits.slice(digits.length - localLen);
        const formattedLocal = local.length <= 3
            ? local
            : local.length <= 5
                ? `${local.slice(0, 3)} ${local.slice(3)}`
                : `${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5)}`;
        phoneRaw = `+${cc} ${formattedLocal}`;
    }
    if (!phoneRaw || phoneRaw.length < 6 || phoneRaw.length > 32) {
        return NextResponse.json({ success: false, error: 'Phone number is required.' }, { status: 400 });
    }

    const adminDb = getAdminFirestore();
    if (!adminDb) {
        // Fail closed — do not silently fall back to client-only logic.
        return NextResponse.json(
            { success: false, error: 'Reset service is temporarily unavailable. Please contact support.' },
            { status: 503 },
        );
    }

    const now = Date.now();
    const sevenDaysAgo = new Date(now - SEVEN_DAYS_MS);
    const oneHourAgo = new Date(now - ONE_HOUR_MS);

    try {
        const requestsCol = adminDb.collection('pinResetRequests');
        const auditCol = adminDb.collection('pinResetAuditLog');

        const recentSnap = await requestsCol
            .where('phone', '==', phoneRaw)
            .where('createdAt', '>=', sevenDaysAgo)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        const recent = recentSnap.docs.map((d) => d.data() as { status?: string; createdAt?: { toMillis: () => number } });
        const pending = recent.find((r) => r.status === 'pending');
        if (pending && pending.createdAt && now - pending.createdAt.toMillis() < ONE_DAY_MS) {
            await auditCol.add({
                event: 'pin_reset_rejected',
                reason: 'pending_request_exists',
                phone: phoneRaw,
                ip,
                userAgent,
                createdAt: FieldValue.serverTimestamp(),
            });
            return NextResponse.json(
                { success: false, error: 'A reset request is already in progress for this number. Please wait for our team to contact you.' },
                { status: 429 },
            );
        }
        if (recent.length >= MAX_REQUESTS_PER_WEEK) {
            await auditCol.add({
                event: 'pin_reset_rejected',
                reason: 'weekly_limit_exceeded',
                phone: phoneRaw,
                ip,
                userAgent,
                createdAt: FieldValue.serverTimestamp(),
            });
            return NextResponse.json(
                { success: false, error: 'Too many reset attempts for this number this week. Please contact support directly.' },
                { status: 429 },
            );
        }

        if (ip !== 'unknown') {
            const ipSnap = await requestsCol
                .where('ip', '==', ip)
                .where('createdAt', '>=', oneHourAgo)
                .limit(MAX_PER_IP_PER_HOUR + 1)
                .get();
            if (ipSnap.size >= MAX_PER_IP_PER_HOUR) {
                await auditCol.add({
                    event: 'pin_reset_rejected',
                    reason: 'ip_rate_limited',
                    phone: phoneRaw,
                    ip,
                    userAgent,
                    createdAt: FieldValue.serverTimestamp(),
                });
                return NextResponse.json(
                    { success: false, error: 'Too many reset requests from this device. Please try again later.' },
                    { status: 429 },
                );
            }
        }

        // Look up the user (still respond positively even when no account exists,
        // to avoid leaking which phone numbers are registered).
        const usersSnap = await adminDb
            .collection('users')
            .where('phone', '==', phoneRaw)
            .limit(1)
            .get();
        const userDoc = usersSnap.empty ? null : usersSnap.docs[0]!;

        const referenceCode = makeReferenceCode();

        const reqRef = await requestsCol.add({
            phone: phoneRaw,
            userId: userDoc?.id || null,
            accountExists: !!userDoc,
            referenceCode,
            status: 'pending',
            ip,
            userAgent,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await auditCol.add({
            event: 'pin_reset_requested',
            requestId: reqRef.id,
            referenceCode,
            phone: phoneRaw,
            userId: userDoc?.id || null,
            accountExists: !!userDoc,
            ip,
            userAgent,
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, referenceCode });
    } catch (error: unknown) {
        console.error('PIN reset error:', error);
        return NextResponse.json(
            { success: false, error: 'Could not start a reset right now. Please try again in a moment.' },
            { status: 500 },
        );
    }
}
