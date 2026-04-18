/**
 * Server-only authentication helpers for Mbalit.
 *
 * The app deliberately uses ONLY two Firebase services: Firestore and the
 * Realtime Database. Firebase Auth is NOT used. PINs are hashed with bcrypt
 * and stored on the user document; sessions are random opaque tokens stored
 * in a `sessions/{token}` Firestore collection so the same login persists
 * across page reloads and is verifiable from any API route.
 *
 * This file imports `firebase-admin` and MUST only be used from server code
 * (route handlers, middleware). Importing it from a Client Component will
 * crash the bundle.
 */

import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { getAdminFirestore, FieldValue } from './firebase-admin';

const PIN_HASH_COST = 10;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_TOUCH_THROTTLE_MS = 60 * 60 * 1000; // bump lastSeenAt at most hourly

export type SessionDoc = {
    userId: string;
    createdAt: FirebaseFirestore.Timestamp;
    expiresAt: FirebaseFirestore.Timestamp;
    lastSeenAt?: FirebaseFirestore.Timestamp;
    userAgent?: string;
};

export type SessionUser = { userId: string; sessionToken: string };

export function newSessionToken(): string {
    // 256 bits of entropy, URL-safe.
    return randomBytes(32).toString('base64url');
}

export async function hashPin(pin: string): Promise<string> {
    return bcrypt.hash(pin, PIN_HASH_COST);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
    if (!hash) return false;
    try {
        return await bcrypt.compare(pin, hash);
    } catch {
        return false;
    }
}

/**
 * Creates a new session doc and returns the bearer token.
 */
export async function createSession(
    userId: string,
    userAgent: string | null = null,
): Promise<string> {
    const adminDb = getAdminFirestore();
    if (!adminDb) throw new Error('Firestore admin unavailable');
    const token = newSessionToken();
    const now = Date.now();
    await adminDb.collection('sessions').doc(token).set({
        userId,
        createdAt: FieldValue.serverTimestamp(),
        // expiresAt is a fixed wall-clock timestamp — we set it as a real Date
        // so range queries work without serverTimestamp resolution timing.
        expiresAt: new Date(now + SESSION_TTL_MS),
        userAgent: userAgent?.slice(0, 256) || null,
        lastSeenAt: FieldValue.serverTimestamp(),
    });
    return token;
}

/**
 * Pulls the bearer token from either an `Authorization: Bearer …` header or
 * the `mbalit_session` cookie, looks it up in Firestore, validates expiry,
 * and returns `{ userId, sessionToken }`. Returns null when the request is
 * unauthenticated or the session has lapsed.
 *
 * Side effect: bumps `lastSeenAt` at most once per SESSION_TOUCH_THROTTLE_MS,
 * so an idle browser refresh doesn't hammer Firestore on every request.
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
    const auth = req.headers.get('authorization') || '';
    let token = '';
    if (auth.toLowerCase().startsWith('bearer ')) {
        token = auth.slice(7).trim();
    }
    if (!token) {
        token = req.cookies.get('mbalit_session')?.value || '';
    }
    if (!token || token.length < 16 || token.length > 200) return null;

    const adminDb = getAdminFirestore();
    if (!adminDb) return null;

    const ref = adminDb.collection('sessions').doc(token);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = snap.data() as SessionDoc;

    const expiresAtMs = data.expiresAt?.toMillis?.() ?? 0;
    if (!expiresAtMs || expiresAtMs < Date.now()) {
        // Lazy GC of stale sessions. Don't await — the response shouldn't wait.
        void ref.delete().catch(() => {});
        return null;
    }

    const lastSeenMs = data.lastSeenAt?.toMillis?.() ?? 0;
    if (Date.now() - lastSeenMs > SESSION_TOUCH_THROTTLE_MS) {
        void ref
            .update({ lastSeenAt: FieldValue.serverTimestamp() })
            .catch(() => {});
    }

    return { userId: data.userId, sessionToken: token };
}

export async function revokeSession(token: string): Promise<void> {
    const adminDb = getAdminFirestore();
    if (!adminDb) return;
    await adminDb.collection('sessions').doc(token).delete().catch(() => {});
}

/**
 * Mirrors app/auth/page.tsx formatPhone(): canonicalize an inbound phone so
 * lookups against `users.phone` always hit. Reused by signup/login routes.
 */
export function canonicalPhone(input: string): string {
    const compact = input.replace(/[^\d+]/g, '');
    if (!compact.startsWith('+') || compact.length < 7) return '';
    const digits = compact.slice(1);
    const localLen = Math.min(7, Math.max(7, digits.length - 1));
    const cc = digits.slice(0, digits.length - localLen);
    const local = digits.slice(digits.length - localLen);
    const formattedLocal =
        local.length <= 3
            ? local
            : local.length <= 5
                ? `${local.slice(0, 3)} ${local.slice(3)}`
                : `${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5)}`;
    return `+${cc} ${formattedLocal}`;
}

export function isValidPin(pin: unknown): pin is string {
    return typeof pin === 'string' && /^\d{6}$/.test(pin);
}

export const SESSION_COOKIE_NAME = 'mbalit_session';
export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
