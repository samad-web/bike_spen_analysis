# Feature: NFC Tools (replicated from NFC Tools.apk, scoped to MotoPulse)

## Source of the replicated feature list

Features below were confirmed by extracting `NFC Tools.apk` (resources.arsc string table, read-only, not executed) rather than guessing from memory. Confirmed capabilities in the reference app: read tag / tag info (UID, ATQA, SAK, manufacturer IDs, technology = NTAG21x / Mifare Classic / Mifare Ultralight, memory size, writable/read-only/password-protected state, NDEF record list), write tag (record types: URL/URI custom, Text, Phone, Email, SMS, Contact/vCard, Social network, Wi-Fi network, Bluetooth device connect/disconnect/state, Launch app, Custom location, Calendar event), write modes (Overwrite / Append / "add records from existing tag"), target-UID verification before write, Erase/Clear tag, Format tag, Lock tag (permanent, irreversible), password protection (Set/Remove password, 4 access modes: read-only, read-only+password, readable+write-password, read+write password — all 8 hex chars), Mifare Classic sector-level memory viewer with per-sector access bits and HEX/BIN/NFC export, retry-failed-sectors, scan/write history, copy/clone tag.

## Purpose

Give MotoPulse a self-contained "NFC Tools" screen so the user can provision, diagnose, and recover vehicle tags without a third-party app — while keeping every tag MotoPulse writes in the single consistent format the gap analysis requires (one URL record per tag; see Gap Analysis #4). Full, unscoped replication of the reference app (all record types, Mifare Classic sector editing, permanent locking) is a decision that conflicts with that constraint — flagged under "Explicitly out of scope" with reasoning, not silently dropped.

## Architecture

- **Screens** (Settings -> NFC Tools):
  1. `TagInfoScreen` — foreground scan, shows diagnostics only, writes nothing.
  2. `WriteTagScreen` — mint a token, write the single URL record, bind to a vehicle.
  3. `EraseFormatScreen` — clear NDEF content / NDEF-format a blank/foreign tag.
  4. `ReplaceTagScreen` — guided flow: scan old tag (optional) -> mark its token `replaced` -> scan new tag -> write new token -> carry over the vehicle assignment.
  5. `TagHistoryScreen` — list of `nfc_tag_events` for a tag or vehicle.
  6. `AdvancedScreen` (collapsed by default) — Lock tag, Password protect. Double confirmation + "irreversible" warning copy, matching the reference app's own warning strings ("This process cannot be reverted if you forget your password").
- **Native bridge**: `@capgo/capacitor-nfc` (`@capacitor-community/nfc`, used in earlier drafts of this doc, is deprecated and not published on npm — see `MEMORY.md` "Correction"). Verified API: `startScanning()`/`stopScanning()`, `nfcEvent` listener delivering `{ type, tag: NfcTag }`, `write({ records, allowFormat })`, `erase()`, `makeReadOnly()` (permanent — no unlock), `isSupported()`/`getStatus()`. There is no standalone `format()`; formatting happens implicitly via `write()`'s `allowFormat` (default `true`). All implemented in `src/nfc/nfcPlugin.ts`. No custom Android plugin needed for this module (unlike the tap-session module, which needs the manifest intent filter).
- **Tag-type detection caveat**: the plugin does not expose the exact chip model (NTAG213 vs 215 vs 216) — only `tag.type` (e.g. "NFC Forum Type 2", "MIFARE Classic") and `tag.techTypes` (Android tech-list strings) and `tag.maxSize`. The compatibility check below uses `techTypes` to reject Mifare Classic and `maxSize` as a rough NTAG213/215/216 hint; it cannot tell the user which exact model they're holding. Noted as a real limitation, not glossed over.
- **Data model**:
  - `nfc_tags(token PK, vehicle_id FK, status enum[active,replaced,erased], created_at, last_scanned_at)`
  - `nfc_tag_events(id, tag_token FK nullable, vehicle_id FK nullable, user_id, event_type enum[scanned,written,erased,formatted,replaced,locked,password_set,password_removed,write_failed], tag_uid, tag_technology, detail jsonb, created_at)` — `tag_uid` captured from `TagInfoScreen`/write result for audit, never used as the identity key (token is, per gap analysis #4).
- **Compatibility check**: before any write, read tag technology; if not NTAG213/215/216 (or their `F` variants), block with the reference app's own rejection copy pattern ("This NFC tag is not supported — must be NTAG21x") rather than attempting a write that will likely fail or brick formatting on Mifare Classic.
- **Target-UID verification** (replicated as-is — it is a real safety feature, not scope creep): on `ReplaceTagScreen` and re-writes, if the user is writing to what should be a specific physical tag, compare scanned UID against the one captured at scan-start; abort the write if it changed mid-flow (user swapped tags without re-scanning).

## Impact map

- `nfc_tags`, `nfc_tag_events`: new tables, own RLS (`user_id = auth.uid()` via vehicle ownership join).
- `vehicles`: `WriteTagScreen` and `ReplaceTagScreen` both update `vehicles.active_tag_token` (nullable FK) — must handle the case where a vehicle already has an active tag (prompt: replace it, or add a spare?).
- `tap-session` module: reads `nfc_tags` to resolve `token -> vehicle_id`; must treat `status != 'active'` tokens as "tag not recognized" (e.g., a tag marked `replaced` is tapped again — show "This tag was replaced, use the new one" rather than silently logging).
- Offline queue: `WriteTagScreen`/`EraseFormatScreen` actions are **not** queued offline — they require a live NFC scan and a live Supabase write (token must be unique server-side) — if Supabase is unreachable, block with a clear "No connection — tag writing needs network" message rather than a silent local write.
- Settings nav: new "NFC Tools" entry; "Test tag" button in vehicle setup (gap analysis #3) opens `TagInfoScreen` directly.

## Edge cases and failure modes

- Tag removed mid-scan/write -> plugin throws, show "Tag moved — hold it steady and try again", no partial DB write (token insert happens only after confirmed write-success callback).
- Token collision (astronomically unlikely, opaque random token) -> regenerate and retry once, then surface error.
- Writing to a tag that already holds a *different* MotoPulse token -> warn "This tag is already registered to {vehicle}" before allowing overwrite, to prevent accidentally reassigning a tag that is physically mounted on another bike.
- Writing to a tag with foreign (non-MotoPulse) NDEF content -> allowed after the same compatibility check, with a plain "this will erase existing content" confirmation.
- NTAG21x without `F` suffix: password screens detect lack of `AUTH0`/`PWD`/`PACK` config pages and show "Password protection is not supported by this tag" instead of attempting it and failing silently.
- Lock tag requested on a tag still assigned to an active vehicle -> block with "Unassign or replace this tag first" since a locked tag can never be erased/replaced again.
- Airplane mode / NFC toggled off mid-flow -> existing gap-analysis should-fix banner ("NFC is off") reused here too.

## Acceptance criteria

- [ ] `TagInfoScreen` correctly reports UID, technology, and read-only/writable/password status for a genuine NTAG213 and NTAG215 tag, and correctly rejects a Mifare Classic test tag with the compatibility message.
- [ ] `WriteTagScreen` writes exactly one URI NDEF record, verified by reading it back with the reference NFC Tools app.
- [ ] Writing a token persists `nfc_tags` row only after the on-device write succeeds (kill the app mid-write -> no orphan DB row).
- [ ] `EraseFormatScreen` clears a MotoPulse tag back to blank NDEF and marks its `nfc_tags.status = 'erased'`.
- [ ] `ReplaceTagScreen` end-to-end: old tag tapped afterward shows "replaced" message, not a log entry; new tag logs correctly on next tap.
- [ ] `TagHistoryScreen` shows every write/erase/replace event for a vehicle in order.
- [ ] Advanced screen's Lock/Password actions are hidden behind an explicit "Advanced (irreversible)" expander and require typed confirmation ("LOCK") before executing.
- [ ] Target-UID mismatch during `ReplaceTagScreen` aborts the write and shows the mismatch message.

## Explicitly out of scope (and why)

- **Non-URL record types** (Text, Phone, Email, SMS, Contact/vCard, Social network, Wi-Fi, Bluetooth, Calendar, Launch app, Custom location): the reference app is a general-purpose tool; MotoPulse tags are purpose-built identifiers, and gap analysis #4 specifically rejects multiple payload formats. Adding a generic record-type picker would reopen the exact inconsistency #4 closes.
- **Mifare Classic sector-level memory viewer, sector keys/auth, retry-failed-sectors, HEX/BIN/NFC dump export**: Mifare Classic is not the tag type the gap analysis recommends buying (NTAG213/215), and sector-level editing needs key management infrastructure this app has no other use for. Revisit only if a concrete need shows up.
- **Permanent Lock tag and password protection**: shipped behind the Advanced screen but *off the happy path* — locking contradicts the "support replacing a lost tag" goal (#4) for the tag it is used on, and password protection only works on `F`-suffix tags, which are not the ones the setup checklist tells the user to buy. Kept available for power users who explicitly want it, not advertised.
- **Clone/copy tag content tag-to-tag**: superseded by `ReplaceTagScreen`, which mints a fresh token rather than duplicating one (two live tags sharing one token would break the token-to-vehicle lookup's implicit uniqueness assumption).
