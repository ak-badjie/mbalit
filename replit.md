# Mbalit - Waste Collection App

## Overview
A Next.js web application for waste collection management, featuring real-time tracking, payments via Modem Pay, Firebase authentication, and Google Maps integration.

## Architecture
- **Framework**: Next.js 16.1.1 (App Router, Turbopack)
- **Runtime**: Node.js 20
- **Styling**: Tailwind CSS v4
- **Authentication & Database**: Firebase — **only Firestore + Realtime Database are used as data stores. Cloud Storage is intentionally NOT used. Firebase Auth is also NOT used.** Authentication is a fully client-side phone+PIN system: PINs are bcrypt-hashed in the browser (`bcryptjs`, cost 10) and stored as `pinHash` on `users/{id}`. The "session" is just `localStorage["mbalit_uid"]`; there is no Firebase ID token. All images (profile, orders, hazard reports) live as compressed base64 inside their owning Firestore document.
  - **Security tradeoffs (deliberate, both inherent to the no-Auth, no-admin-SDK constraint)**:
    1. **`pinHash` exposure**: the `users` collection must be readable for the login lookup, so `pinHash` is visible to anyone who can read it. A 6-digit PIN is brute-forceable offline against bcrypt cost 10 (slow but not infeasible).
    2. **Session impersonation via localStorage**: the "session" is just `localStorage["mbalit_uid"]`. Anyone who can guess or obtain another user's id can set it locally and be treated as that user. Firestore Security Rules cannot defend against this because there is no `request.auth.uid` to compare against — the uid is purely client-asserted.
    Both can only be properly fixed by reintroducing Firebase Auth (custom tokens minted by an admin SDK after PIN verification) once a service-account credential is available. Until then, **do not store any data in this app whose disclosure or modification by another logged-in user would be high-impact** (e.g. payment instruments, government IDs).
- **Payments**: Modem Pay
- **Maps**: Google Maps JS API

## Project Structure
- `app/` - Next.js App Router pages and API routes
  - `app/api/payments/` - Payment API routes (createinitialize, modem-pay)
  - `app/api/webhooks/` - Webhook handlers
  - `app/auth/` - Authentication pages
  - `app/collector/` - Collector dashboard
  - `app/dashboard/` - User dashboard
  - `app/payment/` - Payment flow
  - `app/track/` - Waste tracking
- `components/` - Reusable UI components
- `lib/` - Shared utilities and Firebase config
- `public/` - Static assets

## Environmental Hazard Reports
Community members report environmental hazards from their dashboard ("Report" card). Authority organizations (orgs created with the "We are a public authority" toggle on) see incoming reports at `/organization/reports` and can change status (`pending` → `in_progress` → `resolved`).

- Firestore collection: `environmentalReports`
- Document shape (see `types/index.ts` `EnvironmentalReport`):
  `{ reporterId, reporterName, reporterPhone, photos: string[] (base64 data URLs), note, location: { lat, lng, address }, status, createdAt, updatedAt }`
- Photos are stored as **base64 data URLs in Firestore**, not Cloud Storage. The reporter page compresses each image to ~150KB (800x800, JPEG q=0.55) and rejects payloads over ~900KB to stay safely under Firestore's 1MB per-document limit. Up to 5 photos per report. Migrating photos to Firebase Storage is a known follow-up if reports outgrow this constraint.
- **Trust model caveat**: the authority flag is currently self-attested at signup (a toggle on Step 3 of `/auth`). There is no admin approval flow yet — anyone can register an org as an "authority". This is acceptable for the pilot but should be replaced with an admin-approved claim before wider rollout (tracked as a follow-up).
- Authority flag lives on both `users/{uid}.isAuthority` and `organizations/{orgCode}.isAuthority` (set together at signup) so client gating can rely on the user doc without an extra org fetch.
- **Submission + authority notifications (atomic, client-side)**: because there is no Firebase Admin SDK available, the report and every authority notification are written from the **browser** in a single Firestore `writeBatch`. The reporter page (`app/dashboard/report/page.tsx`):
  1. Generates a `requestId` (UUID) and derives a deterministic report doc ID from `sha256(uid + ":" + requestId)` so retries are idempotent (no duplicate reports, no duplicate alerts).
  2. Reads every `organizations` doc where `isAuthority == true` and unions their `members` arrays plus `ownerId` into a recipient set.
  3. Stages the report doc AND every recipient's notification doc (deterministic IDs `notif_{reportId}_{userId}`) into a single `writeBatch` and commits — all-or-nothing. Hard cap: 499 recipients per report (Firestore's 500-op batch limit minus the report doc); above this the submission is rejected and surfaced to the user.
- Notifications carry `data.deepLink: '/organization/reports'` and the notification dropdown navigates there on click. Because notifications are only ever written here (on initial creation), they naturally stop once a report's status moves to `in_progress` or `resolved`.
- **Resident "My reports" view** (`app/dashboard/report/my/page.tsx` + `app/dashboard/report/my/[id]/page.tsx`): residents can see every hazard they've submitted (newest first) with status badge and thumbnail, and tap through to a detail page with the full photo carousel, address, note, and timestamps. The detail page subscribes via a constrained query (`where(documentId(), '==', id) AND where('reporterId', '==', user.id)`) rather than a direct `doc()` read so non-owners cannot fetch another resident's report payload even though Firestore Security Rules can't enforce per-user reads in this no-Auth model. Linked from the dashboard via a "My reports" button under Quick Actions.
- Suggested Firestore rules for `environmentalReports`:
  - `create`: any signed-in user, with `request.resource.data.reporterId == request.auth.uid`.
  - `read`: reporter (`resource.data.reporterId == request.auth.uid`) OR any user where `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAuthority == true`.
  - `update`: only authority users, and only the `status` / `updatedAt` fields.
  - `delete`: disallowed from clients.

## Running the App
- **Dev**: `npm run dev` (runs on port 5000)
- **Build**: `npm run build`
- **Start**: `npm run start` (runs on port 5000)

## Environment Variables Required
### Public (NEXT_PUBLIC_*)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_MODEM_PAY_PUBLIC_KEY`

### Server-side (secret)
- `MODEM_PAY_CLIENT_ID`
- `MODEM_PAY_SECRET_KEY`
- `MODEM_PAY_WEBHOOK_SECRET`

## PIN Reset (Forgot PIN flow)
Self-service PIN reset is intentionally **not** automated by phone alone — that would let anyone with a target's number take over the account. The flow is support-assisted and enforced server-side:
1. User taps "Forgot PIN?" on the PIN entry screen.
2. The client calls `POST /api/auth/pin-reset` (see `app/api/auth/pin-reset/route.ts`). The server uses `firebase-admin` (`lib/firebase-admin.ts`) to:
   - Throttle per phone: max 1 active request per 24h, max 3 per 7 days.
   - Throttle per IP: max 5 requests per hour.
   - Look up the matching user (without leaking which phones are registered).
   - Write a record to `pinResetRequests` (status `pending`) and an entry to `pinResetAuditLog` (event `pin_reset_requested`, plus `pin_reset_rejected` events with reason when throttled).
   - Return a human-readable reference code (e.g. `R-AB12-CD34`).
3. The user sees the reference code and is told support will contact them within 24 hours.
4. **Operator action** (out of band): support verifies the user's identity, then resets the password via the Firebase Console or Admin SDK and updates the request doc to `status: 'completed'`. The user is given a temporary PIN they can change after signing in.

### Required env var for production
- `FIREBASE_SERVICE_ACCOUNT` — JSON string of a Firebase service account (or set up application-default credentials). Without it the API route returns 503 and the reset flow is disabled.

### Required Firestore security rules
Reset metadata must not be exposed to clients. Recommended rules:
- `pinResetRequests` and `pinResetAuditLog`: deny all client read/list/create/update/delete. The server uses Admin SDK and bypasses rules.
- `users` collection should already restrict reads to the user's own document; the server admin path bypasses this for the lookup.

### Firestore composite indexes
The server queries on `pinResetRequests` need:
- `(phone ASC, createdAt DESC)` — per-phone throttle lookup.
- `(ip ASC, createdAt ASC)` — per-IP throttle lookup.

Firestore prints a creation link the first time each query runs in production.

## Firebase project
- Active project: **`mbalit-8a52f`** (apiKey/appId/etc. live in `lib/firebase.ts` and `app/api/webhooks/modem-pay/route.ts` as fallbacks; canonical values are in the `NEXT_PUBLIC_FIREBASE_*` Replit Secrets).
- Before the app will work end-to-end on a fresh project, the user must in the Firebase Console:
  1. Enable **Email/Password** sign-in under Authentication → Sign-in method.
  2. Create the **Firestore** database (production mode) and paste in the security rules listed below.
  3. Enable **Realtime Database** in the default region (RTDB is used for live order tracking and payment status); the URL `https://mbalit-8a52f-default-rtdb.firebaseio.com` is assumed — if a different region was chosen, update `NEXT_PUBLIC_FIREBASE_DATABASE_URL`.
  4. (For PIN reset) Generate a service-account JSON in Project Settings → Service Accounts and replace the `FIREBASE_SERVICE_ACCOUNT` secret. **Until this is replaced, `/api/auth/pin-reset` will return 503.**
  5. Recreate the Firestore composite indexes listed in "Firestore composite indexes" below.

## Notes
- The app uses Modem Pay for mobile money payments.
- Google Maps is used for waste collection route/location tracking.
