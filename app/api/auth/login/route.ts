import { NextRequest, NextResponse } from 'next/server';
import {
    canonicalPhone,
    createSession,
    isValidPin,
    SESSION_COOKIE_NAME,
    SESSION_TTL_SECONDS,
    verifyPin,
} from '@/lib/auth-server';
import { getAdminFirestore } from '@/lib/firebase-admin';

/**
 * POST /api/auth/login
 * Body: { phone: string, pin: string }
 * Verifies the PIN against the bcrypt hash on the user doc and starts a
 * session. Uses generic error wording on every failure path so an attacker
 * can't probe which phone numbers are registered.
 */
export async function POST(request: NextRequest) {
    let body: { phone?: unknown; pin?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    const phone = canonicalPhone(typeof body.phone === 'string' ? body.phone : '');
    if (!phone || !isValidPin(body.pin)) {
        return NextResponse.json(
            { success: false, error: 'Phone number or PIN is incorrect.' },
            { status: 401 },
        );
    }

    const adminDb = getAdminFirestore();
    if (!adminDb) {
        return NextResponse.json(
            { success: false, error: 'Sign-in service is temporarily unavailable.' },
            { status: 503 },
        );
    }

    try {
        const snap = await adminDb
            .collection('users')
            .where('phone', '==', phone)
            .limit(1)
            .get();

        if (snap.empty) {
            return NextResponse.json(
                { success: false, error: 'Phone number or PIN is incorrect.' },
                { status: 401 },
            );
        }

        const userDoc = snap.docs[0]!;
        const data = userDoc.data() as { pinHash?: string };
        if (!data.pinHash) {
            // Account exists but has no PIN configured (data corruption).
            return NextResponse.json(
                {
                    success: false,
                    error: 'This account is not fully set up. Please reset your PIN to continue.',
                },
                { status: 401 },
            );
        }

        const ok = await verifyPin(body.pin, data.pinHash);
        if (!ok) {
            return NextResponse.json(
                { success: false, error: 'Phone number or PIN is incorrect.' },
                { status: 401 },
            );
        }

        const sessionToken = await createSession(
            userDoc.id,
            request.headers.get('user-agent'),
        );

        const res = NextResponse.json({
            success: true,
            uid: userDoc.id,
            sessionToken,
        });
        res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: SESSION_TTL_SECONDS,
        });
        return res;
    } catch (err) {
        console.error('Login failed:', err);
        return NextResponse.json(
            { success: false, error: 'Could not sign in right now. Please try again.' },
            { status: 500 },
        );
    }
}
