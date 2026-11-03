# MotoPulse — Test Strategy & Results

## Strategy
- Each feature's tests map directly to its acceptance criteria (see `features/*.md`).
- RLS and RPC atomicity: SQL-level tests against Supabase, run before any client code depends on them.
- NFC: **physical device required** — emulators cannot test NFC. Test on/off metal, screen locked, app killed, and with at least one genuine NTAG213 and one NTAG215 tag plus one Mifare Classic tag (to verify the compatibility-rejection path in `nfc-tools.md`).
- Offline: airplane-mode tests for every write path (manual entry, NFC writes are explicitly NOT offline-capable — see `nfc-tools.md` impact map).

## Results log

| Feature | Date | Result | Failures found | Fix |
|---|---|---|---|---|
| Analytics (`computeAnalytics.ts`) | 2026-11-03 | 8/8 pass | `costPerKm` undercounted spend: only summed expenses that themselves had an odometer reading, so a same-day maintenance line (no odometer value) was dropped from the period total. `fuelPriceTrend` test asserted a null point for a month with no valid litres data. | `costPerKm` now sums ALL of the vehicle's expenses within the period's date range, using odometer rows only to bound the period. Changed the month-with-no-litres-data case to omit the month entirely (matches "degrade gracefully" acceptance criterion) and updated the test to match. |
| NFC compatibility check (`nfcCompat.ts`) | 2026-11-03 | 4/4 pass | Caught by esbuild: `tag.type ?? techTypes.join(", ") \|\| "unknown"` is a `??`+`\|\|` chain without parens, which isn't legal JS. | Added parens around the `\|\|` sub-expression. |
| NFC URL record encode/decode (`nfcPlugin.ts`) | 2026-11-03 | 2/2 pass | — | — |
| Tap state machine (`tapStateMachine.ts`) | 2026-11-03 | 6/6 pass | Original test file imported from `activeSession.ts`, which pulls the Supabase client at module load and refused to boot without env vars. | Split the pure state machine into its own file (`tapStateMachine.ts`); the Supabase-aware wrappers stay in `activeSession.ts`. Tests import from the pure file. |
| App Link URL parsing (`useAppLinkListener.ts`) | 2026-11-03 | 5/5 pass | — | — |
| Foundation schema/RLS (`supabase/migrations/0001_foundation.sql`) | 2026-11-03 | **Not run** — needs a live Supabase project (user said credentials "will provide later"). Integration test written at `supabase/tests/rls.integration.test.ts`, skipped automatically until `SUPABASE_URL`/`SUPABASE_ANON_KEY` are set. | — | — |
| NFC Tools suite (end-to-end on a real tag) | 2026-11-03 | **Not run** — needs a physical NTAG213/215 tag + Android device (no emulator support for NFC). Acceptance criteria in `features/nfc-tools.md` are the exercise checklist. | — | — |
| Tap-session end-to-end | 2026-11-03 | **Not run** — needs the Android build + a tag + assetlinks.json served under motopulse.app. | — | — |
| Type check (`tsc --noEmit`) | 2026-11-03 | Clean | 3 errors on first pass: optional `tag.id`, nonexistent `removeAllListeners` on the plugin, nullable `tag.type` not matching `string \| null`. | Fixed each at the use site. |
| Production build (`vite build`) | 2026-11-03 | Clean — 122 modules, 452 KB JS (gzip 129 KB). | — | — |
