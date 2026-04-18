# Mbalit - Waste Collection App

## Overview
A Next.js web application for waste collection management, featuring real-time tracking, payments via Modem Pay, Firebase authentication, and Google Maps integration.

## Architecture
- **Framework**: Next.js 16.1.1 (App Router, Turbopack)
- **Runtime**: Node.js 20
- **Styling**: Tailwind CSS v4
- **Authentication & Database**: Firebase (Auth, Firestore, Realtime DB, Storage)
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

## Notes
- Firebase credentials currently have inline fallback values in `lib/firebase.ts`. These should be moved to environment variables for production.
- The app uses Modem Pay for mobile money payments.
- Google Maps is used for waste collection route/location tracking.
