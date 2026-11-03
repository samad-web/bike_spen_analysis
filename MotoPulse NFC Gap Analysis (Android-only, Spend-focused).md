# MotoPulse NFC: Gap Analysis (Android-only, Spend-focused)

Scope: Android only. Fuel entries record amount and litres. Analytics focus on amount spent. Everything iOS-specific from the original review is dropped, and exact mileage becomes optional.

## Must fix before building

### 1. Replace the 5-minute double-tap rule

Fuel is usually logged at the pump, long after the ride started, so a 5-minute window will almost always have expired. Use a simple state instead:

- Tap with no active vehicle today: mark it active and show a notification.
- Tap on the already-active vehicle: open the quick log.
- Tap on a different vehicle: ask "Switch to X?"
- Ignore repeat reads within about 2 seconds, since Android can fire the same tag twice.

Store the active session in the database, not in a client variable that is lost when the app is killed.

### 2. Handle the tap at the Android layer

The Capacitor NFC plugin is mainly for foreground scanning and writing, so don't rely on it to launch the app from a tag.

- Write one URL to the tag and register an intent filter for it in `AndroidManifest.xml`, with `launchMode="singleTask"`.
- Read it in the app with Capacitor's `appUrlOpen` listener.
- An `https` App Link (`assetlinks.json`) is safer than a custom `motopulse://` scheme, because other apps can claim a custom scheme. It also gives you a web fallback.
- Use the NFC plugin only for the "write tag" screen.

### 3. Use on-metal NFC tags

Standard stickers don't read on a fuel cap or handlebar. Buy ferrite-backed, waterproof NTAG213/215 tags and add a "test tag" button in setup.

### 4. Make the tag format consistent

The spec has three different payload formats. Use one random opaque token per tag (`https://motopulse.app/v/{token}`) and keep a small `nfc_tags` table (`token`, `vehicle_id`, `status`). This supports replacing a lost tag. Also, `nfc_tag_id` is described as the hardware UID, but what you write to the tag is the token.

### 5. Finish the RLS policies

Only `vehicles` has a policy, so every other table would deny all access.

- Add `USING` and `WITH CHECK` policies to `ride_logs`, `expenses`, and `maintenance_items`.
- Add `user_id` to `maintenance_items`.
- Make sure an expense can't reference another user's vehicle.

### 6. Drop Express for the MVP

You already have Supabase Auth, RLS, and Realtime. Express adds hosting and security work, and `supabase-js` can't run multi-step transactions anyway.

- Call Supabase directly from the app.
- Write a Postgres function via `rpc()` for "save expense plus its items" so it is atomic.
- Add Edge Functions later only if you need server logic.

### 7. Support offline entry

Petrol pumps often have poor signal. Save locally first (SQLite or IndexedDB), queue the write, and sync later. Generate the UUID on the device so a retry never creates a duplicate.

## Schema changes for a spend-focused app

- **`expenses.expense_date`:** separate from `created_at`, so entries can be backdated.
- **Fuel fields:** `total_amount` and `litres`. Compute `price_per_litre = amount / litres` as a view or generated column rather than a typed field.
- **Optional fields:** make `odometer_reading` and `litres_filled` nullable. Skipping the odometer loses km-based stats but keeps all spend analytics.
- **Constraints:** `CHECK (total_amount >= 0)`, a unique `(vehicle_id, ride_date)` on `ride_logs`, and indexes on `(user_id, expense_date)` and `(vehicle_id, expense_date)`.
- **Currency:** the mockup shows `$ / ₹`. Pick one, probably ₹, in a user settings field.
- **Deletes:** use soft delete, so removing a vehicle doesn't wipe its history.
- **Item totals:** keep `total_amount` equal to the sum of maintenance items, computed inside the RPC.

## Analytics definitions

The spec lists the charts but never defines them. For an amount-focused app:

- **Spend:** total per month, per vehicle, and per category (fuel vs maintenance), plus each vehicle's share of the fleet total.
- **Fuel price trend:** average ₹/litre per month, from amount ÷ litres.
- **Litres per month** and **average spend per fill-up**.
- **Ride days per month** and **spend per ride day** (monthly spend ÷ days ridden).
- **Optional:** cost per km, only if the odometer is logged. Calculate it between two consecutive readings: spend over that period ÷ distance.

## Should fix

- **Edit and delete expenses:** you will mistype amounts, so this is not optional.
- **Manual entry:** a "Log expense" button for when the tag is damaged or you forgot to tap.
- **Android 13+ permission:** request `POST_NOTIFICATIONS` at runtime, and show a banner if NFC is off.
- **Quick-log speed:** numeric keypad, last-used amount prefilled, big buttons, autocomplete for maintenance items, and Undo after saving.
- **Auth:** email magic link or Google sign-in. Decide what happens if a tag is tapped while logged out: queue the tap and resume after login.
- **Active ride expiry:** end the "active" status at midnight or when switching vehicles, so it doesn't go stale.

## Can defer

Receipt photos, CSV export, service reminders, shared vehicles, extra categories (insurance, tolls, parking), a widget or quick-settings tile, and full mileage logic with missed-fill handling.

## Android-specific build checklist

- Use a physical device, since emulators can't test NFC.
- Test tags on and off metal.
- Check behavior with the screen locked and with the app killed.
- Configure the manifest NFC permission and the intent filter.
- Handle `onNewIntent` so a second tap doesn't start a second app instance.

## Suggested build order

1. Supabase schema, RLS, and an RLS test.
2. Auth, vehicle setup, and manual expense entry (fuel and itemized maintenance) with offline sync. This proves the app works before any NFC.
3. NFC tag writing and tap handling, with the new session logic.
4. Spend-focused analytics and the ride calendar.
5. Polish: edit and undo, permissions, and error states.
