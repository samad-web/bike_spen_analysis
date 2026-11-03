# Feature: Spend Analytics & Ride Calendar

## Purpose
Implement the analytics the original spec listed charts for but never defined (gap analysis "Analytics definitions").

## Architecture
- Spend: total per month / per vehicle / per category (fuel vs maintenance), fleet-share per vehicle.
- Fuel price trend: avg ₹/litre per month = sum(amount)/sum(litres).
- Litres per month, average spend per fill-up.
- Ride days per month, spend per ride day = monthly spend / days ridden (from `ride_logs`).
- Optional cost/km: only if odometer logged, computed between consecutive readings (spend over period / distance).
- Ride calendar: visual calendar of `ride_logs` days.

## Impact map
Reads `expenses`, `maintenance_items`, `ride_logs` — purely additive, no schema changes expected beyond what `foundation-schema.md` defines.

## Edge cases and failure modes
- Division by zero: litres = 0 for a fuel entry -> price_per_litre must be null, not an error, and excluded from the average.
- No odometer logged at all -> cost/km section hidden, not a zero/error.
- Partial month (app installed mid-month) -> charts should not imply a full month of data.

## Acceptance criteria
- [ ] Each chart's number matches a manual SQL spot-check against seed data.
- [ ] Odometer-optional charts degrade gracefully when odometer data is absent.
- [ ] Ride calendar correctly marks days with at least one `ride_logs` entry.
