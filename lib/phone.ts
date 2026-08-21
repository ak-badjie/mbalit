/**
 * Phone number formatting — shared between the auth screens and the
 * organization "Add driver" form.
 *
 * A user's phone number IS their account identity: login looks the account up
 * with an exact-match Firestore query on `phone`. That means every place that
 * WRITES a phone number and every place that READS one back must produce the
 * byte-identical string, or a driver created by an admin will simply never be
 * able to sign in. Hence this single implementation rather than a copy of the
 * formatter in each screen.
 *
 * Canonical form: `${dialCode} ${groups}` — e.g. `+220 744 10 29`.
 */

/** Strip everything that isn't a digit. */
export function digitsOnly(value: string): string {
    return (value || '').replace(/\D/g, '');
}

/**
 * Group the local (national) part of a number for display: `744 10 29`.
 * Mirrors the grouping the dial pad screens have always used.
 */
export function formatLocalNumber(digits: string): string {
    const d = digitsOnly(digits);
    if (d.length <= 3) return d;
    if (d.length <= 5) return `${d.slice(0, 3)} ${d.slice(3)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5)}`;
}

/** Build the canonical stored phone string from a dial code + local digits. */
export function buildFullPhone(dialCode: string, digits: string): string {
    return `${dialCode} ${formatLocalNumber(digits)}`;
}

/**
 * Re-normalise an arbitrary phone string (pasted, typed with dashes, legacy
 * unformatted records) into the canonical form for the given dial code.
 * Tolerates the dial code being present or absent in the input.
 */
export function normalizePhone(dialCode: string, raw: string): string {
    const codeDigits = digitsOnly(dialCode);
    let local = digitsOnly(raw);
    if (codeDigits && local.startsWith(codeDigits)) {
        local = local.slice(codeDigits.length);
    }
    return buildFullPhone(dialCode, local);
}
