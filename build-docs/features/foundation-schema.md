# Feature: Foundation — Supabase Schema & RLS

## Purpose
Establish the data model and security boundary before any UI exists, per gap analysis #5 (RLS gaps) and the schema-changes section.

## Architecture
Tables: `vehicles`, `expenses` (fuel + maintenance, `expense_date` separate from `created_at`), `maintenance_items` (with `user_id` added), `ride_logs`, `active_sessions`, `nfc_tags`, `nfc_tag_events` (see `nfc-tools.md`). Generated column `price_per_litre` on fuel expenses. `save_expense` Postgres RPC wraps expense + items insert in one transaction and validates the vehicle belongs to the caller.

## Impact map
Every other feature depends on this. Changing a column here means revisiting every feature doc that reads/writes it.

## Edge cases and failure modes
- RLS must deny cross-user reads/writes on all 6 tables (not just `vehicles`, which is the current gap).
- Expense referencing another user's `vehicle_id` must be rejected by the RPC, not just by RLS (defense in depth).
- `CHECK (total_amount >= 0)`, unique `(vehicle_id, ride_date)` on `ride_logs`.

## Acceptance criteria
- [ ] RLS test suite: for every table, user A cannot read/write user B's rows.
- [ ] `save_expense` RPC is atomic (kill connection mid-call -> no partial rows) and rejects a foreign vehicle_id.
- [ ] `price_per_litre` computed correctly for amount/litres, null-safe when litres is 0/null.
