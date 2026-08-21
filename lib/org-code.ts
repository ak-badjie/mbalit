/**
 * Organization codes.
 *
 * Codes are read off a screen or a scrap of paper and typed back in by hand,
 * so they are deliberately short and forgiving:
 *   - initials of the organization name + a few digits ("CFS482")
 *   - upper-case only, so there is no shift-key ambiguity
 *   - no hyphens or spaces — people don't reliably reproduce them
 *   - matched case-insensitively on the way in
 *
 * The normalised (upper-case) code IS the Firestore document id of the
 * organization, so a lookup is a single getDoc rather than a query.
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const CODE_MIN_LETTERS = 2;
const CODE_MAX_LETTERS = 4;
const MAX_GENERATION_ATTEMPTS = 12;

/**
 * Derive the letter prefix from an organization name: the initial of each
 * word, capped at CODE_MAX_LETTERS. "Clean Future Solutions" → "CFS".
 * A single-word name falls back to its first letters ("Mbalit" → "MB").
 */
export function orgInitials(name: string): string {
    const words = (name || '')
        .replace(/[^A-Za-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    let initials = words.map((w) => w[0]).join('').toUpperCase();

    // One-word (or empty) names don't produce enough letters to be
    // recognisable — pad from the name itself, then from a constant.
    if (initials.length < CODE_MIN_LETTERS) {
        const letters = (name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        initials = (initials + letters.slice(1)).slice(0, CODE_MAX_LETTERS);
    }
    if (initials.length < CODE_MIN_LETTERS) {
        initials = (initials + 'ORG').slice(0, CODE_MIN_LETTERS);
    }

    return initials.slice(0, CODE_MAX_LETTERS);
}

/**
 * Canonical form of a code the user typed. Upper-cases and drops everything
 * that isn't a letter or digit, so "cfs-482", "CFS 482" and "cfs482" all
 * resolve to the same organization.
 */
export function normalizeOrgCode(input: string): string {
    return (input || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function randomDigits(count: number): string {
    let out = '';
    for (let i = 0; i < count; i++) out += Math.floor(Math.random() * 10);
    return out;
}

/** True when no organization document already claims this code. */
async function isCodeFree(code: string): Promise<boolean> {
    try {
        const snap = await getDoc(doc(db, 'organizations', code));
        return !snap.exists();
    } catch {
        // A read failure here would otherwise let us hand out a code that is
        // already taken and silently overwrite another org. Treat it as taken.
        return false;
    }
}

/**
 * Generate a short unique code for a new organization. Widens the numeric
 * suffix if the short space keeps colliding, so this always terminates with
 * a usable code rather than throwing.
 */
export async function generateUniqueOrgCode(orgName: string): Promise<string> {
    const prefix = orgInitials(orgName);

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
        // Start at 3 digits and grow every 4 failed attempts.
        const digits = 3 + Math.floor(attempt / 4);
        const code = normalizeOrgCode(prefix + randomDigits(digits));
        if (await isCodeFree(code)) return code;
    }

    // Extremely unlikely fallback — timestamp tail is unique enough.
    return normalizeOrgCode(prefix + Date.now().toString().slice(-6));
}
