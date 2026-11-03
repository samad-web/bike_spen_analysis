# MotoPulse — Architecture

## Stack

- **Client**: Capacitor 6 + React 18 + TypeScript + Vite. Android target only (no iOS build config).
- **Backend**: Supabase (Postgres, Auth, Realtime, RLS). No custom server.
- **Local storage**: `@capacitor-community/sqlite` — offline write queue + cached read-through for the active vehicle/session.
- **NFC**: `@capgo/capacitor-nfc` (foreground read/write UI only — `@capacitor-community/nfc` is deprecated/unpublished, see `MEMORY.md` "Correction") + native Android `AndroidManifest.xml` intent filter (`https://motopulse.app/v/*`, `android:launchMode="singleTask"`) for tap-to-open/resume.

## Modules

```
src/
  app/              # routing, navigation shell
  auth/             # Supabase auth, session, magic link / Google
  vehicles/         # vehicle CRUD, active-vehicle state
  expenses/         # fuel + maintenance entry, edit/delete, offline queue
  nfc/              # NFC Tools suite: read, write, erase/format, tag-info, history
  tap-session/      # tap state machine (active/switch/log), App Link handling
  analytics/        # spend charts, ride calendar
  settings/         # currency, notifications, NFC status banner
  lib/
    supabase.ts
    sqlite.ts
    offline-queue.ts
android/
  app/src/main/AndroidManifest.xml   # intent filter, singleTask, NFC permission
  app/src/main/res/.../assetlinks    # (served from backend /.well-known, not bundled)
```

## Data flow — tap to log

1. Tag holds `https://motopulse.app/v/{token}`.
2. Android resolves the App Link → opens MotoPulse (`singleTask`) → `onNewIntent`/`appUrlOpen` fires with the URL.
3. Client resolves `token → vehicle_id` via `nfc_tags` (cached locally for offline taps).
4. Debounce: ignore a repeat of the same token within 2s.
5. Compare token's vehicle against `active_sessions` for this user:
   - no active session today → create one, local notification "Ride started".
   - same vehicle active → open quick-log sheet.
   - different vehicle active → "Switch to X?" confirm, then same as above.
6. Quick-log write goes through the offline queue (SQLite first, Supabase sync after), using the **client-generated UUID** as the idempotency key.

## Database (Supabase/Postgres)

Tables per gap analysis: `vehicles`, `expenses` (+ generated `price_per_litre`), `maintenance_items`, `ride_logs`, `active_sessions`, `nfc_tags` (`token`, `vehicle_id`, `status`), `nfc_tag_events` (audit log for the NFC Tools suite — write/erase/lock/read actions, see `features/nfc-tools.md`).

RLS: every table has `USING`/`WITH CHECK` on `user_id = auth.uid()`, and the expense→vehicle FK is checked inside the `save_expense` RPC so a user cannot attach an expense to another user's vehicle.

## NFC Tools module (summary — full detail in `features/nfc-tools.md`)

A dedicated in-app screen group (Settings → NFC Tools) separate from the tap-session flow:
- Tag Info / diagnostics (read-only scan)
- Write tag (mint + write a token)
- Erase / Format (free a tag for reuse or disposal)
- Replace tag (erase old + write new token, carries old tag's vehicle assignment over)
- Tag history (per-tag event log)
- Optional/advanced: Lock tag (permanent), password-protect (only on NTAG21x**F** variants)
