import { NextRequest, NextResponse } from 'next/server';
import {
    getSessionUser,
    hashPin,
    isValidPin,
    verifyPin,
} from '@/lib/auth-server';
import { getAdminFirestore, FieldValue } from '@/lib/firebase-admin';

/**
 * POST /api/auth/change-pin
 * Body: { oldPin: string, newPin: string }
 * Authenticated. Verifies the old PIN against the stored hash, then writes
 * the new bcrypt hash. Surfaces a stable `old-pin-incorrect` error code so
 * the dialog UI can reset the right step.
 */
export async function POST(request: NextRequest) {
    const session = await getSessionUser(request);
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Not signed in.' },
            { status: 401 },
        );
    }

    let body: { oldPin?: unknown; newPin?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (!isValidPin(body.oldPin) || !isValidPin(body.newPin)) {
        return NextResponse.json(
            { success: false, error: 'PIN must be exactly 6 digits.' },
            { status: 400 },
        );
    }

    const adminDb = getAdminFirestore();
    if (!adminDb) {
        return NextResponse.json(
            { success: false, error: 'PIN service is temporarily unavailable.' },
            { status: 503 },
        );
    }

    try {
        const userRef = adminDb.collection('users').doc(session.userId);
        const snap = await userRef.get();
        if (!snap.exists) {
            return NextResponse.json(
                { success: false, error: 'Account not found.' },
                { status: 404 },
            );
        }
        const data = snap.data() as { pinHash?: string };
        const ok = await verifyPin(body.oldPin, data.pinHash || '');
        if (!ok) {
            return NextResponse.json(
                { success: false, error: 'old-pin-incorrect' },
                { status: 401 },
            );
        }

        const pinHash = await hashPin(body.newPin);
        await userRef.update({
            pinHash,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Change PIN failed:', err);
        return NextResponse.json(
            { success: false, error: 'Could not change PIN. Please try again.' },
            { status: 500 },
        );
    }
}
