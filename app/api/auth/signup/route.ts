import { NextRequest, NextResponse } from 'next/server';
import {
    canonicalPhone,
    createSession,
    hashPin,
    isValidPin,
    SESSION_COOKIE_NAME,
    SESSION_TTL_SECONDS,
} from '@/lib/auth-server';
import { getAdminFirestore, FieldValue } from '@/lib/firebase-admin';

/**
 * POST /api/auth/signup
 * Body: { phone: string, pin: string }
 * Creates the user document with a bcrypt-hashed PIN and starts a session.
 *
 * The user document ID is a random 28-char string (mirrors Firebase Auth's
 * uid shape) so other parts of the app — which already use the document ID
 * as the canonical user id — don't need to change.
 */
export async function POST(request: NextRequest) {
    let body: { phone?: unknown; pin?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    const phone = canonicalPhone(typeof body.phone === 'string' ? body.phone : '');
    if (!phone) {
        return NextResponse.json(
            { success: false, error: 'A valid phone number is required.' },
            { status: 400 },
        );
    }
    if (!isValidPin(body.pin)) {
        return NextResponse.json(
            { success: false, error: 'PIN must be exactly 6 digits.' },
            { status: 400 },
        );
    }

    const adminDb = getAdminFirestore();
    if (!adminDb) {
        return NextResponse.json(
            { success: false, error: 'Sign-up service is temporarily unavailable.' },
            { status: 503 },
        );
    }

    try {
        // If an account already exists for this phone, fail loudly so the UI
        // can route the user to login instead of silently shadow-creating.
        const existing = await adminDb
            .collection('users')
            .where('phone', '==', phone)
            .limit(1)
            .get();
        if (!existing.empty) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'An account with this phone already exists. Please sign in instead.',
                },
                { status: 409 },
            );
        }

        const pinHash = await hashPin(body.pin);
        const userRef = adminDb.collection('users').doc();
        await userRef.set({
            id: userRef.id,
            phone,
            pinHash,
            onboardingComplete: false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        const sessionToken = await createSession(
            userRef.id,
            request.headers.get('user-agent'),
        );

        const res = NextResponse.json({
            success: true,
            uid: userRef.id,
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
        console.error('Signup failed:', err);
        return NextResponse.json(
            { success: false, error: 'Could not create account. Please try again.' },
            { status: 500 },
        );
    }
}
