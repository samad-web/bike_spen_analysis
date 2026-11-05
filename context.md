# MotoPulse — context for a returning developer (or a returning Claude)

Snapshot taken 2026-11-05 after a session in which the user added a lot on their own. Read this once; the rest of the repo will make sense.

## What MotoPulse is

Android-first Capacitor app that logs fuel + maintenance for one or more vehicles. Core interaction: tap a physical NFC sticker (or scan a QR) on the bike at the pump → the app opens the quick-log sheet with the vehicle preselected → user types the amount → saved. Everything else (garage, analytics, reminders, documents, calendar, payment cards, admin) is scaffolding around that core loop.

- **Web** lives at `https://motopulse.mas20042005.workers.dev` on Cloudflare Pages (Workers + Static Assets).
- **Android APK** at `motopulse-debug.apk` in the repo root. It loads UI from the live URL via `capacitor.config.ts` → `server.url`, so pushing to `main` updates installed devices without a new APK. Service Worker (vite-plugin-pwa) caches shell for offline + CF-outage resilience.
- **Backend** is one Supabase project: `fmayduwogqgcmqsniwcl`. 13 SQL migrations in `supabase/migrations/`. No custom server.

## Layout

```
src/
  app/          App shell, routing, Navigation, ScanFab, shared UI primitives, tokens.css, app.css
  auth/         AuthContext, SignInScreen (email+password+magic link+reset), validation
  dashboard/    DashboardScreen — hero spend, trend, donut, garage preview, activity
  vehicles/     Garage grid, VehicleDetailScreen, EditVehicleSheet, VehiclePhotoSheet, brandLogo, indianRegistration
  expenses/     QuickLogForm, useExpenses, fuelUnit (L/kWh/kg)
  nfc/          Tag & QR tools suite: WriteTagScreen, EraseFormatScreen, ReplaceTagScreen, TagInfoScreen,
                TagHistoryScreen, AdvancedScreen, QrCodeCard, QrScannerSheet, nfcPlugin, qrRenderer, tagRegistry
  tap-session/  activeSession state machine, TapHandler mounted at app shell, useAppLinkListener
  analytics/    AnalyticsScreen, computeAnalytics, fuelEconomy, exportReports (CSV + jsPDF)
  maintenance/  MaintenanceReminders card + hook
  documents/    DocumentsCard, useVehicleDocuments (insurance / PUC / RC / invoices in private Supabase bucket)
  cards/        Payment-card management, CardVisual, cashback/return computation
  calendar/     RideCalendar, CalendarScreen, planned-rides
  referrals/    InviteCard (QR + 10 share channels)
  support/      DonateScreen (UPI QR + presets)
  admin/        AdminScreen (superadmin console: users, role toggle, donation config)
  profile/      useProfile hook with window-focus refetch
  notifications/useDueNotifications (overdue maintenance + expiring docs) + useDueCount
  settings/     SettingsScreen, useSettings (currency), useNotificationPermission
  lib/          supabase client, offline-queue (SQLite outbox, guarded to native), publicUrl, errors, sqlite
```

## Key flows

1. **Sign in**: `SignInScreen` → 4 modes (signin / signup / magic link / forgot password) with strict field validation (`validation.ts`). Google OAuth was removed on request. Password rules: 8+ chars, upper + lower + digit + symbol.
2. **Tap-to-log** (the core): NFC chip or QR encodes `https://motopulse.mas20042005.workers.dev/v/{token}`. Android App Link fires → `useAppLinkListener` extracts token → `TapHandler` resolves it to a vehicle via `nfc_tags` → `decideTapOutcome` state machine: no active session → create one + notify; same vehicle → open quick log; different vehicle → switch prompt. Native app also receives NDEF discovery via AAR and `motopulse://` custom scheme.
3. **Write a tag**: `WriteTagScreen` uses `runOnNextTag` helper — scan AND write happen in one open NFC session. The previous two-session pattern caused "connection lost" because the tag was disconnected by the time `write()` ran.
4. **Offline writes**: on native Android, `queueSaveExpense` goes through SQLite outbox first, then flushes to Supabase. On web, direct RPC — the SQLite plugin needs a `<jeep-sqlite>` web component we don't mount, so the queue is guarded with `Capacitor.isNativePlatform()`.
5. **Admin access**: `useProfile().isSuperadmin` gates the admin pill in Settings. RLS uses `is_superadmin()` SECURITY DEFINER function (0008) so the policy that calls it doesn't recurse.

## Migrations (applied)

| # | What |
|---|---|
| 0001 | Foundation schema + RLS + `save_expense` RPC |
| 0002 | Function search-path hardening, revoke `rls_auto_enable` HTTP exposure |
| 0003 | Payment method, vehicle photos, maintenance reminders, photos bucket |
| 0004 | Vehicle documents + private bucket + notification ledger |
| 0005 | EV support (fuel_unit enum: L/kWh/kg), QR flag, battery_kwh |
| 0006 | user_profiles with role, app_settings, referrals, admin_user_stats view |
| 0007 | Backfill profiles, promote admin, fix auth.users exposure |
| 0008 | **Critical**: `is_superadmin()` SECURITY DEFINER to break RLS recursion |
| 0009 | Perf + security audit: wrap `auth.uid()` in `(select …)`, merge policies, add FK indexes |
| 0010 | Restore `is_superadmin()` EXECUTE grant to `authenticated` (0009 revoked it, broke everything) |
| 0011 | Planned rides + calendar support (user-added) |
| 0012 | `ride_logs` update policy (user-added) |
| 0013 | Payment cards + cashback tracking (user-added) |

## Infrastructure

- **CF Pages project**: `motopulse` → deploys from `main` on push. `wrangler.jsonc` sets `assets.not_found_handling = "single-page-application"` so SPA routing works. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_URL`.
- **Android**: `android/` scaffolded via `npx cap add android`. Manifest template at `android-template/AndroidManifest.xml` lists three intent filters: HTTPS App Link (`motopulse.app` and the Workers subdomain), NFC NDEF discovery, `motopulse://` custom scheme. Uses `launchMode="singleTask"` and `assetlinks.json` would need to be served from the production domain for autoVerify to succeed.
- **PWA**: Service Worker via `vite-plugin-pwa` precaches 58 app-shell entries, runtime-caches brand logos + vehicle photos. Supabase REST / auth / realtime are denylisted — never cached.
- **Brand logos**: 41 real SVG brand marks in `public/brand-logos/` (Simple Icons CC0 + Wikimedia Commons + one hand-crafted Triumph). Loader prefers these files; falls back to inline-SVG initial marks in `brandLogo.ts`.

## Testing

- 124+ unit tests under vitest. All green on the Vite 6 / Vitest 3 stack.
- 4 Supabase RLS integration tests are skipped pending seeded test users.
- Physical-device NFC acceptance checklist in `build-docs/TESTING.md` is not automated.

## Known limits / shortcuts still in place

- **`server.url` SDUI**: APK depends on CF being reachable for cold start of a fresh install. Service Worker covers subsequent launches. For true offline-first production, swap to `@capgo/capacitor-updater`.
- **App Links `assetlinks.json`**: not yet hosted. Until it is, tapping an NFC tag opens the browser, not the installed app (unless the user selects the app from Android's app-chooser). Fix: ship `public/.well-known/assetlinks.json` with the release signing SHA256.
- **Email confirmation**: Supabase default SMTP is rate-limited to ~3/hour. Use Resend/SES for production, or turn off email confirmation for personal use (Auth → Providers → Email → Confirm email off).
- **debug APK is unsigned**: fine for sideload; Play Store needs a release build + keystore.
- **24MB WASM** from `@imgly/background-removal` is lazy-loaded. Approaches CF Pages 25MB per-file limit — any build-size growth could break deploy.

## Open issues the user flagged (2026-11-05)

These are not yet investigated. The user owes specifics for each before any change goes in:

1. "Sign-in" is broken. **Unknown which mode/branch**. Candidates: magic link not delivering (SMTP rate limit), password reset flow, redirect URL not matching (CF subdomain vs `motopulse.app`), the "Forgot?" subflow, session hydration on APK cold start, auto-confirm vs email-confirmation state.
2. "Each screen" needs a modern UI/UX pass. **Scope unbounded**. Design pass already happened once (post-AI-slop audit). Need a concrete list — one or two offending screens, screenshots, "this feels dense / this color is wrong" — otherwise it's weeks of guesswork.
3. "Many issues across flows". **Which flows, what happened**. Without a concrete list this is open-ended refactoring.

## Where I'd start next

1. Get the sign-in error text (one console/network screenshot).
2. Ask the user to name the 2-3 screens that feel worst and the 2-3 flows that broke. The rest is probably already passable; ponytail says don't rewrite what works.
3. Then fix those.

## Reply the user's `context.md` request before anything else

That's the one concrete, scoped ask on the table right now. This file is it.
