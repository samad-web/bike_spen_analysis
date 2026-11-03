# MotoPulse — Changelog

## 0.1.0 — 2026-11-03

Scaffolded end-to-end against the gap analysis + user's explicit "detailed NFC Tools suite" ask. No git commits yet (user chose "not yet" on repo init).

- **feat(foundation-schema)**: Supabase schema, RLS on all 7 tables (`vehicles`, `expenses`, `maintenance_items`, `ride_logs`, `active_sessions`, `nfc_tags`, `nfc_tag_events`, `user_settings`), `save_expense` RPC with atomic multi-item insert and defense-in-depth owner check (`supabase/migrations/0001_foundation.sql`). Integration tests at `supabase/tests/rls.integration.test.ts` (skipped — needs real credentials).
- **feat(auth-vehicles-manual-entry)**: Email magic link + Google sign-in, vehicle CRUD (soft-delete), `QuickLogForm` with fuel/maintenance tabs, offline write queue in SQLite with client-generated UUIDs, Undo-after-save, last-used-amount prefill, maintenance autocomplete.
- **feat(nfc-tools)**: Six screens — Tag info, Write, Erase/format, Replace, History, Advanced (lock-permanent, with typed "LOCK" confirmation). Scoped per the recommendation accepted at planning time: one URL/token format per gap analysis #4, with non-URL record types and Mifare Classic sector tools explicitly out of scope. Compatibility check rejects Mifare Classic. All actions log to `nfc_tag_events`. Switched the dependency from the unpublished `@capacitor-community/nfc` to `@capgo/capacitor-nfc` 8.3.6; see `MEMORY.md` "Correction". DB write happens AFTER on-device write succeeds (no orphan rows).
- **feat(tap-session)**: Pure `decideTapOutcome` state machine with full unit coverage, 2-second debounce, server-stored `active_sessions`, Android App Link listener via `@capacitor/app`'s `appUrlOpen`, logged-out tap stashed to `localStorage` and replayed after sign-in. `AndroidManifest.xml` template + `assetlinks.sample.json` in `android-template/`.
- **feat(analytics)**: Pure aggregation module with 8 unit tests. Spend by month/vehicle/category, fleet share, fuel price trend, litres & avg fill-up, ride days & spend-per-ride-day, optional cost/km between odometer readings.
- **feat(polish)**: Undo wired into QuickLogForm, runtime `POST_NOTIFICATIONS` request on first ride notification (Android 13+), NFC-off banner on the NFC Tools screen, mobile-first stylesheet with dark-mode support.

**Tests**: 25/25 unit tests passing; 4 Supabase integration tests skipped pending credentials; NFC physical-device acceptance checklist remains to be exercised on a real NTAG213/215 and a Mifare Classic test tag (see TESTING.md).
