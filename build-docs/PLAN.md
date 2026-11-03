# MotoPulse — Master Plan

## Goal and scope

An Android-only app that logs motorcycle/vehicle fuel and maintenance spend via NFC tap (fuel cap / handlebar tag) or manual entry, and shows spend analytics. Exact mileage/odometer tracking is optional, not required — the app's core value is reliable spend logging with minimal friction at the pump.

**For**: a rider (or small fleet of personal vehicles) who wants frictionless expense capture without typing at the pump.

**Explicitly out of scope for v1** (gap analysis "Can defer"): receipt photos, CSV export, service reminders, shared vehicles, extra expense categories (insurance/tolls/parking), home-screen widget/quick-settings tile, full mileage logic with missed-fill handling.

## Project memory

See `MEMORY.md` for the full decision log. Key points this plan respects:
- Stack: Capacitor (React+TS) + Supabase, no Express (gap analysis #6).
- Tap handling at the Android layer via App Link, not the Capacitor NFC plugin (gap analysis #2).
- One tag format: `https://motopulse.app/v/{token}` (gap analysis #4).
- Active session stored server-side (gap analysis #1).

## A concern before building (per CLAUDE.md "challenge me when I'm wrong")

Your NFC Tools request and the gap-analysis document pull in different directions:
- The gap analysis's #4 fix exists specifically to stop the original spec's three competing tag-payload formats from causing bugs — it mandates **one** format (a URL to an opaque token) across every tag.
- The reference NFC Tools app's actual strength is being a general-purpose tag read/writer with ~10 record types, Mifare Classic sector editing, and permanent locking/password protection.

Replicating NFC Tools feature-for-feature would reintroduce the format inconsistency #4 just closed, and adds real risk (a locked/password-protected tag can never be reused if lost — directly undermining the "support replacing a lost tag" requirement in the same section). `features/nfc-tools.md` proposes a **scoped replication**: every read/diagnostic/write/erase/replace/history capability relevant to MotoPulse's one-token model, with the general-purpose record types, Mifare Classic sector tools, and permanent locking placed behind an explicit, off-by-default "Advanced" screen rather than removed outright. I built it this way rather than silently narrowing the request — flag if you want full unscoped replication instead; I'll rebuild that section if so.

## Feature list, prioritized (build order by dependency)

1. **Foundation: Supabase schema & RLS** — `features/foundation-schema.md`. Everything else depends on this; must be correct and tested first (gap analysis #5).
2. **Auth, vehicle setup, manual expense entry (offline-capable)** — `features/auth-vehicles-manual-entry.md`. Proves the app works before any NFC exists (gap analysis suggested build order step 2).
3. **NFC Tools suite** — `features/nfc-tools.md`. Tag read/write/erase/format/replace/history, scoped per the concern above. Built before the tap-session flow because the tap-session flow consumes the tokens this suite mints.
4. **Tap-to-log session handling** — `features/tap-session.md`. The core "why this app exists" flow; depends on #3 for tokens and #2 for the quick-log UI it reuses.
5. **Spend analytics & ride calendar** — `features/analytics.md`.
6. **Polish** — `features/polish.md`. Undo, permissions, NFC-off banner.

## Decisions needed from you before I write any code

1. **Git**: no repository exists at this path. CLAUDE.md requires asking before `git init` — should I initialize one (and a GitHub remote, if you want pushes per step 6 of the workflow)?
2. **NFC Tools scope**: approve the scoped replication above, or want the full unscoped NFC Tools feature set (multi record-type writer, Mifare Classic sector tools, permanent lock) even though it conflicts with gap analysis #4?
3. **Supabase project**: do you already have a Supabase project (URL + keys) to target, or should the plan include provisioning one as part of step 1?
4. **Overall plan approval**: anything in the stack choice (Capacitor+React+TS), build order, or feature docs you want changed before implementation starts?

## Android-specific build checklist (carried over from gap analysis, unchanged)
- Physical device for all NFC testing (no emulator).
- Test tags on and off metal; ferrite-backed NTAG213/215.
- Screen-locked and app-killed behavior.
- Manifest NFC permission + intent filter + `onNewIntent`.
