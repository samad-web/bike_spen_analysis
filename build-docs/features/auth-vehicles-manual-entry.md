# Feature: Auth, Vehicle Setup, Manual Expense Entry (offline-capable)

## Purpose
Prove the app works end-to-end before any NFC is wired in (suggested build order step 2).

## Architecture
- Auth: Supabase Auth, email magic link or Google sign-in.
- Vehicles: CRUD, multi-vehicle per user, "Test tag" button stub (wired to `TagInfoScreen` once NFC Tools lands).
- Manual entry: "Log expense" button, fuel (amount + litres, odometer optional) and itemized maintenance, numeric keypad, last-used amount prefilled.
- Offline: writes go to SQLite queue first with a client-generated UUID, then sync to Supabase via `save_expense` RPC; retry-safe by UUID.

## Impact map
- Depends on `foundation-schema.md`.
- `tap-session` and `nfc-tools` both reuse the same quick-log UI this feature builds.

## Edge cases and failure modes
- No network at all (poor pump signal): entry must fully work offline and sync later.
- Duplicate sync attempt after a retry must not create a duplicate row (UUID idempotency).
- Logged-out tap/entry: not applicable here (manual only) — see `tap-session.md`.

## Acceptance criteria
- [ ] Create/edit/delete a vehicle.
- [ ] Log a fuel expense and a maintenance expense fully offline (airplane mode), confirm sync on reconnect.
- [ ] Kill the app mid-sync, relaunch -> no duplicate row.
- [ ] Edit and delete an existing expense.
