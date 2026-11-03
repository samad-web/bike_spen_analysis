# MotoPulse — Project Memory

## Decisions

- **Scope**: Android-only. Spend-focused (amount, not strict mileage). Source spec: `MotoPulse NFC Gap Analysis (Android-only, Spend-focused).md` (root) — treated as the authoritative design baseline; all 7 "must fix" items and schema/analytics sections are accepted as-is unless noted below.
- **Stack**: Capacitor (React + TypeScript, Vite) targeting Android only. Supabase (Postgres + Auth + RLS + Realtime) as backend, called directly from the client — **no Express** (gap analysis #6).
- **Offline**: `@capacitor-community/sqlite` as local write-ahead queue; UUIDs generated on-device to make retries idempotent (gap analysis #7).
- **NFC stack**: `@capacitor-community/nfc` for foreground scan/write screens only. Tap-to-launch/resume is handled at the Android layer via an `https` App Link (`assetlinks.json`) + `appUrlOpen`, **not** the plugin (gap analysis #2).
- **Tag format**: one NDEF URI record per tag, `https://motopulse.app/v/{token}`, opaque random token, tracked in `nfc_tags` (gap analysis #4). This is a hard constraint — see "NFC Tools scope" below.
- **Active-session state**: stored server-side (`active_sessions` table keyed by user+vehicle), not client memory (gap analysis #1).
- **Currency**: ₹ (INR) only for v1, stored as a user setting field (not hardcoded) so it isn't a second migration later.
- **Deletes**: soft delete everywhere (`deleted_at`) — vehicles, expenses, maintenance items, tags.

## Open questions (asked user, awaiting answer)

- Git repo: none exists at project root yet. CLAUDE.md requires asking before `git init` — pending.
- NFC Tools feature scope: user asked to "replicate" NFC Tools' feature set. Full replication (all record types: contact/wifi/bluetooth/calendar/etc., Mifare Classic sector editing, password-protect, permanent lock) conflicts with gap analysis #4's one-format-per-tag rule. Proposed a scoped subset in `features/nfc-tools.md` — pending approval.

## Correction

- `@capacitor-community/nfc` (named in `ARCHITECTURE.md`/the gap analysis) is deprecated and **not published on npm** (`npm install` 404s). Its successor `@capawesome-team/capacitor-nfc` is also not on public npm — it requires a paid "Capawesome Insiders" license and a private registry. Switched the dependency to the free, publicly-published **`@capgo/capacitor-nfc`** instead. Verified against its real docs/README before writing `src/nfc/nfcPlugin.ts` — see that file's header comment for the exact API used.
- `@capgo/capacitor-nfc` (latest 8.3.6) requires Capacitor core `>=8.0.0`, and `@capacitor-community/sqlite`'s latest (8.1.1) does too — both plugin ecosystems moved to Capacitor 8 ahead of this doc's original "Capacitor 6" assumption. Since this is a greenfield project with no Capacitor 6 constraint to preserve, **upgraded the whole stack to Capacitor 8** (`@capacitor/core|cli|android|app|local-notifications` all `^8.x`) rather than pinning the NFC/SQLite plugins to older, less-maintained majors.

## Known issues / risks

- NTAG213F/215F/216F (the password-capable variants) are a different SKU from plain NTAG213/215/216 the gap analysis recommends buying. Password-protect UI will no-op gracefully on tags that don't support it.
- Capacitor NFC plugins vary in Android NDEF-format support across OEM NFC chipsets (Broadcom vs NXP vs Qualcomm) — flagged as a device-testing risk in TESTING.md.
