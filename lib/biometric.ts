'use client';

/**
 * Biometric unlock for the PIN lock screen.
 *
 * Uses the Web Authentication API (passkeys / platform authenticator) to back
 * Face ID on iPhones and Touch ID / Windows Hello on other platforms.
 *
 * Registration: prompts the user once to enrol their device's platform
 * authenticator and stores the resulting credentialId in localStorage keyed
 * by uid. Subsequent unlock attempts use that credentialId to challenge the
 * authenticator — if it succeeds the lock screen lifts. The credential never
 * leaves the device; we don't ship a signature verifier (no server roundtrip).
 *
 * Browser support:
 *   - Safari on iOS 16+ inside an installed PWA
 *   - Safari on iOS 14+ in a normal tab
 *   - Chrome / Edge on Android 7+ and desktop with platform authenticator
 *
 * On unsupported browsers, isBiometricSupported() returns false and the lock
 * screen falls back to PIN-only.
 */

const RP_ID_FALLBACK = 'mbalit';
const RP_NAME = 'MBalit';

const credentialKeyFor = (uid: string) => `mbalit_biometric_cred_${uid}`;

function base64UrlEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): ArrayBuffer {
    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes.buffer;
}

function randomChallenge(length = 32): ArrayBuffer {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return arr.buffer;
}

/**
 * Quick check the lock screen calls before showing the Face ID button.
 * Returns false on iOS 15 and below since WebAuthn-in-PWA only works on 16+.
 */
export async function isBiometricSupported(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!window.PublicKeyCredential) return false;
    try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
        return !!available;
    } catch {
        return false;
    }
}

export function hasBiometricCredential(uid: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return !!window.localStorage.getItem(credentialKeyFor(uid));
    } catch {
        return false;
    }
}

/**
 * Enrol a platform credential for the signed-in user. Called from Settings
 * once they tap "Enable Face ID".
 */
export async function enrollBiometric(opts: {
    uid: string;
    userName: string;
}): Promise<{ credentialId: string }> {
    if (!window.PublicKeyCredential) {
        throw new Error('Biometric authentication isn’t supported on this device.');
    }

    const userIdBuffer = new TextEncoder().encode(opts.uid).buffer;
    const challenge = randomChallenge();

    const publicKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: RP_NAME, id: window.location.hostname || RP_ID_FALLBACK },
        user: {
            id: userIdBuffer,
            name: opts.userName || opts.uid,
            displayName: opts.userName || 'MBalit user',
        },
        pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
        },
        timeout: 60_000,
        attestation: 'none',
    };

    const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
    if (!cred) throw new Error('Could not register biometric — please try again.');

    const id = base64UrlEncode(cred.rawId);
    try {
        window.localStorage.setItem(credentialKeyFor(opts.uid), id);
    } catch {
        throw new Error('Could not save biometric on this device.');
    }
    return { credentialId: id };
}

/**
 * Challenge the user's enrolled platform authenticator. Returns true on
 * successful userVerification. Callers should treat that as proof of
 * possession + presence on the device and unlock the lock screen.
 *
 * NOTE: This is purely a presence check — we don't verify the signature on
 * the server. That's intentional: the bcrypt PIN + Firestore rules are still
 * the canonical credential. Biometric is a UX shortcut for unlocking the
 * current session, not a replacement for the PIN.
 */
export async function verifyBiometric(uid: string): Promise<boolean> {
    if (!window.PublicKeyCredential) return false;
    let credentialId: string | null = null;
    try {
        credentialId = window.localStorage.getItem(credentialKeyFor(uid));
    } catch {
        return false;
    }
    if (!credentialId) return false;

    const challenge = randomChallenge();
    const publicKey: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname || RP_ID_FALLBACK,
        allowCredentials: [
            {
                type: 'public-key',
                id: base64UrlDecode(credentialId),
                transports: ['internal'],
            },
        ],
        userVerification: 'required',
        timeout: 60_000,
    };

    try {
        const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
        return !!assertion;
    } catch (err) {
        // User cancelled or authenticator failed — fall back to PIN.
        if (process.env.NODE_ENV !== 'production') console.warn('Biometric verify failed:', err);
        return false;
    }
}

export function removeBiometric(uid: string) {
    if (typeof window === 'undefined') return;
    try { window.localStorage.removeItem(credentialKeyFor(uid)); } catch { /* noop */ }
}
