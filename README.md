# MotoPulse

Android-only motorcycle fuel & maintenance spend tracker with NFC tap-to-log. Built from the gap analysis at [`MotoPulse NFC Gap Analysis (Android-only, Spend-focused).md`](./MotoPulse%20NFC%20Gap%20Analysis%20%28Android-only%2C%20Spend-focused%29.md).

See [`build-docs/`](./build-docs/) for the master plan, architecture, feature docs (one per feature), testing results, and project memory. Start there before changing anything.

## Prereqs

- Node 18+ (verified against Node 24).
- A Supabase project (URL + anon key) — supplied via `.env` from `.env.example`.
- For the Android build: Android Studio + a physical device with NFC (emulator can't test NFC — see [`build-docs/TESTING.md`](./build-docs/TESTING.md)).
- NTAG213/215/216 ferrite-backed tags (gap analysis #3). Mifare Classic is explicitly rejected by the compatibility check in [`src/nfc/nfcCompat.ts`](./src/nfc/nfcCompat.ts).

## Dev

```
cp .env.example .env   # fill in from Supabase
npm install
npm test               # unit tests (14 passing, 4 integration skipped until Supabase creds are present)
npm run dev            # browser preview — NFC calls are no-ops in the browser
```

To build the Android app for the first time:

```
npm run build          # vite build -> dist/
npx cap add android    # scaffolds android/
# merge android-template/AndroidManifest.xml into android/app/src/main/AndroidManifest.xml
npm run cap:sync
npm run cap:open       # Android Studio
```

Then host [`android-template/assetlinks.sample.json`](./android-template/assetlinks.sample.json) at `https://motopulse.app/.well-known/assetlinks.json` with the release-key SHA-256 fingerprint filled in, so NFC taps resolve as Android App Links (gap analysis #2).

## Supabase schema

Apply [`supabase/migrations/0001_foundation.sql`](./supabase/migrations/0001_foundation.sql) via the Supabase SQL editor or CLI. It implements the schema + RLS + `save_expense` RPC described in [`build-docs/features/foundation-schema.md`](./build-docs/features/foundation-schema.md).

## NFC Tools suite

The NFC Tools tab replicates every feature of the NFC Tools reference app that is coherent with MotoPulse's "one URL token per tag" rule — read, write, erase/format, replace, history, diagnostics — and places lock/password/multi-record-type behind an Advanced screen that is off by default. The decisions and the scope cuts are in [`build-docs/features/nfc-tools.md`](./build-docs/features/nfc-tools.md).
