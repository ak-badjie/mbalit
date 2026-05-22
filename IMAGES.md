# MbalitApp — Image Asset Checklist

Every UI surface in this app references an SVG/PNG asset at a known path. Each one is currently a placeholder you can swap with your final art. **The file path and aspect ratio must stay the same** for the layout to keep working — overwrite the file in place.

If you supply PNG/JPG instead of SVG, keep the same filename stem (e.g. `landing-hero.png`) and update the `<img src>` in the corresponding page if the extension changes.

---

## 1. Brand & Logo

| Path | Used in | Aspect / Size | Status |
| --- | --- | --- | --- |
| `public/brand/mbalitapp-logo.svg` | Logo mark used everywhere (auth screens, dashboard headers, splash) | Tall portrait — roughly 120 × 140, the "M" with a location pin in the negative space | Placeholder |
| `public/brand/mbalitapp-logo-text.svg` | Logo + "MbalitApp" wordmark, used as a single asset on some hero shots | 360 × 180 | Placeholder |

> The wordmark text "MbalitApp" is also rendered as a separate `<span>` on most screens, so you can keep the mark-only logo if you prefer.

---

## 2. Onboarding & Auth Illustrations

| Path | Used in | What it should depict | Status |
| --- | --- | --- | --- |
| `public/illustrations/landing-hero.jpg` | `app/page.tsx` — Mockup 3 landing screen | Large hero: green waste-collection truck with city + trees backdrop | **Live (user-supplied)** |
| `public/illustrations/landing-hero.svg` | Fallback / earlier placeholder | — | Kept for fallback |
| `public/illustrations/verify-phone.svg` | OTP step in `app/auth/page.tsx` — Mockup 1 | Phone displaying the MbalitApp logo, shield with a check mark beside it, soft leaves | Placeholder |
| `public/illustrations/role-hero.jpg` | "Choose Your Role" step — Mockup 2 (right-side decoration, cropped to show the truck portion) | Truck + bins + skyline | **Live (user-supplied)** |
| `public/illustrations/role-truck.svg` | Fallback / earlier placeholder | — | Kept for fallback |
| `public/illustrations/permissions-hero.jpg` | "Personalize Your Experience" — Mockup 5 (right-side decoration, cropped to show the recycle bin) | Recycle bin with bottles + leaves on mint background | **Live (user-supplied)** |
| `public/illustrations/permissions-truck.svg` | Fallback / earlier placeholder | — | Kept for fallback |

---

## 3. Wallet & Money Illustrations

| Path | Used in | What it should depict | Status |
| --- | --- | --- | --- |
| `public/illustrations/wallet.svg` | `WalletBalanceCard` on `app/dashboard/wallet/page.tsx`, `app/collector/wallet/page.tsx`, `app/organization/wallet/page.tsx` — Mockup 4 | White wallet with a card peeking out and a few gold coins beside it (sits in the green balance card) | Placeholder |
| `public/illustrations/add-money.svg` | "Add Money to Wallet" promo card at the bottom of the wallet screen | Phone with $ on the screen plus a few floating banknotes / paper plane | Placeholder |

---

## 4. Social Auth Icons

| Path | Used in | Notes | Status |
| --- | --- | --- | --- |
| `public/icons/google-logo.svg` | "Continue with Google" button on landing | Google brand glyph (the 4-colour "G"). Keep proportions 1:1, 24 × 24. | Placeholder |
| `public/icons/apple-logo.svg` | "Continue with Apple" button on landing | Apple glyph in black, 1:1, 24 × 24. | Placeholder |

---

## 5. Existing Assets (kept from previous design)

These remain referenced by older screens and can be replaced or left alone:

| Path | Used in |
| --- | --- |
| `public/hero.png` | Legacy desktop hero (currently unused by the new landing page) |
| `public/hero-mobile.png` | Legacy mobile hero (currently unused) |
| `public/logo.png` | Some favicons / browser metadata (`app/layout.tsx`) — replace with a 512×512 PNG of the new logo for best results |
| `public/wave.png` | Decorative wave (still used by older sections) |
| `public/google_plus_code_sample.webp` | Used by Plus-Code helper in dashboard booking step 3 |
| `public/account_created.lottie` | Lottie shown after successful signup |
| `public/find_location.lottie` | Lottie shown while geolocating |
| `public/success.lottie` | Lottie shown after a successful booking |
| `public/afrimoneylogo.png`, `public/qmoneylogo.png`, `public/yonnawalletlogo.png`, `public/asplogo.svg` | Payment provider logos used by `payment-modal.tsx` |

---

## 6. Optional / "Nice to have" upgrades

If you eventually want to ship richer art, these are the spots that look best with custom illustrations:

- **Empty states** for "No bookings yet", "No notifications", "No team members yet" — small (200 × 200) SVGs are enough.
- **Recycling tips page** (`app/dashboard/recycling-tips/page.tsx`) — could use header artwork per tip category.
- **Success screen** after a pickup is booked / completed — currently uses the existing Lottie animations.
- **App icons** (favicon, PWA icons): replace `app/favicon.ico` and add a 512 × 512 + 192 × 192 PNG inside `public/` for Android home-screen icons. Currently `app/layout.tsx` points `metadata.icons.icon` at `/logo.png`.

---

## 7. Drop-in Replacement Recipe

1. Generate or design the new asset at the path listed above (same filename and extension).
2. Save it directly into the project — overwrite the placeholder file.
3. Reload the dev server (`npm run dev`) — Next.js will hot-pick the new asset.
4. If you switch from SVG → PNG, update the `<img src>` extension in the matching component. Components are listed in the "Used in" column.

---

## 8. Component Quick-reference

| Component | File | Image references |
| --- | --- | --- |
| `RecyclingLogo` / `TruckLogo` | `components/ui/truck-logo.tsx` | `/brand/mbalitapp-logo.svg` |
| Landing page | `app/page.tsx` | `/brand/mbalitapp-logo.svg`, `/illustrations/landing-hero.svg`, `/icons/google-logo.svg`, `/icons/apple-logo.svg` |
| Role select | `app/auth/page.tsx` | `/brand/mbalitapp-logo.svg`, `/illustrations/role-truck.svg` |
| OTP verify | `app/auth/page.tsx` (step 2) | `/illustrations/verify-phone.svg` |
| Permissions onboarding | `app/onboarding/permissions/page.tsx` | `/brand/mbalitapp-logo.svg`, `/illustrations/permissions-truck.svg` |
| Wallet (resident/collector/org) | `app/dashboard/wallet/page.tsx`, `app/collector/wallet/page.tsx`, `app/organization/wallet/page.tsx` | `/illustrations/wallet.svg`, `/illustrations/add-money.svg` |
