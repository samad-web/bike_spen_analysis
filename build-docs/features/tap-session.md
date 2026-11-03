# Feature: Tap-to-Log Session Handling

## Purpose
Replace the broken 5-minute double-tap rule with a durable active-session state machine (gap analysis #1), using Android-layer App Link handling instead of relying on the Capacitor plugin to launch the app (gap analysis #2).

## Architecture
- Android: `https` App Link (`motopulse.app/v/*`, `assetlinks.json` served from backend), `AndroidManifest.xml` intent filter, `launchMode="singleTask"`, `onNewIntent` handling.
- Client: `appUrlOpen` listener resolves `token -> vehicle_id` via `nfc_tags`.
- State machine (server-stored in `active_sessions`, keyed by user+vehicle):
  - no active session today -> create, notify.
  - tap on active vehicle -> open quick log.
  - tap on different vehicle -> "Switch to X?" confirm.
  - repeat read within ~2s -> ignored (debounce).
  - session expires at midnight or on vehicle switch.
- Logged-out tap: queue the token locally, resume the flow after login.
- Tag status check: a `replaced`/`erased` token (see `nfc-tools.md`) shows "tag no longer valid" instead of logging.

## Impact map
- Depends on `foundation-schema.md` (`active_sessions`, `nfc_tags`) and `nfc-tools.md` (token lifecycle/status).
- Shares the quick-log UI with `auth-vehicles-manual-entry.md`.

## Edge cases and failure modes
- App killed between taps -> session must survive (server-stored, not client variable).
- Same tag fired twice by Android NFC stack within 2s -> debounced.
- Tap while logged out -> queued, not dropped.
- `POST_NOTIFICATIONS` denied on Android 13+ -> session still works, just no "Ride started" notification.
- NFC off at tap time -> not applicable (tap would not have registered); NFC-off banner is a settings-level concern.

## Acceptance criteria
- [ ] Tap with no active vehicle today creates a session and notifies.
- [ ] Tap on active vehicle opens quick log.
- [ ] Tap on a different vehicle prompts "Switch to X?".
- [ ] Double-fire within 2s produces exactly one session transition.
- [ ] Session persists across app kill.
- [ ] Session expires at midnight / on switch.
- [ ] Tap while logged out queues and resumes after login.
- [ ] Tap on a `replaced` tag shows the "no longer valid" message, does not log.
