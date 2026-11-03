# Feature: Polish — Edit/Undo, Permissions, Error States

## Purpose
The "should fix" items from the gap analysis that round out the MVP.

## Architecture
- Edit/delete expenses (already required by `auth-vehicles-manual-entry.md`'s acceptance criteria — this feature covers the remaining Undo-after-save affordance).
- Android 13+ `POST_NOTIFICATIONS` runtime request; NFC-off banner (settings + home screen).
- Quick-log speed: autocomplete for maintenance items, big buttons (mostly UI, cross-cutting with manual entry).

## Impact map
Touches `tap-session.md` (notification permission) and `auth-vehicles-manual-entry.md` (Undo).

## Acceptance criteria
- [ ] Undo appears after saving an expense and reverts it within the window.
- [ ] `POST_NOTIFICATIONS` requested at the right time (not on first launch, blind) and app works if denied.
- [ ] NFC-off banner shows when NFC is disabled and disappears when re-enabled.
