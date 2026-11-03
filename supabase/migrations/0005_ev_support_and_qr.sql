-- EV support + per-unit tracking.
--
-- Replaces the fuel-only "litres" column with a general-purpose
-- (quantity, quantity_unit) pair so petrol/diesel (L), electricity (kWh),
-- and CNG (kg) all share one expense table. The `litres` column name is
-- kept because the UI already addresses it — the semantic shift is in
-- `fuel_unit` which tells the UI what to call it.
--
-- QR codes: the existing `nfc_tags` table already models an opaque token
-- per vehicle. A QR is literally just the same URL encoded differently,
-- so NO new table is needed. We just add a boolean `qr_enabled` so the
-- UI knows the vehicle has had its QR exported at least once (used for
-- the "already generated" affordance).
--
-- Paste into Supabase SQL editor.

-- 1. Fuel unit on expenses — what the "litres" column actually measures.
create type fuel_unit as enum ('L', 'kWh', 'kg');

alter table expenses
  add column fuel_unit fuel_unit not null default 'L';

-- 2. Rename the derived column for clarity. The old `price_per_litre`
--    becomes `price_per_unit` — it's amount / quantity regardless of unit.
alter table expenses drop column price_per_litre;
alter table expenses
  add column price_per_unit numeric(10, 4) generated always as (
    case when litres is not null and litres > 0
      then round(total_amount / litres, 4)
      else null
    end
  ) stored;

-- 3. Teach save_expense about the fuel unit.
create or replace function save_expense(
  p_id uuid,
  p_vehicle_id uuid,
  p_category expense_category,
  p_total_amount numeric,
  p_litres numeric,
  p_odometer_reading numeric,
  p_expense_date date,
  p_notes text,
  p_items jsonb,
  p_payment_method payment_method default 'cash',
  p_fuel_unit fuel_unit default 'L'
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_items_total numeric;
begin
  select user_id into v_owner from vehicles where id = p_vehicle_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'vehicle % does not belong to the caller', p_vehicle_id;
  end if;

  if p_category = 'maintenance' and p_items is not null and jsonb_array_length(p_items) > 0 then
    select coalesce(sum((item->>'amount')::numeric), 0) into v_items_total
    from jsonb_array_elements(p_items) as item;
    if v_items_total <> p_total_amount then
      raise exception 'total_amount (%) must equal the sum of maintenance items (%)',
        p_total_amount, v_items_total;
    end if;
  end if;

  insert into expenses (id, user_id, vehicle_id, category, total_amount, litres,
                        odometer_reading, expense_date, notes, payment_method, fuel_unit)
  values (p_id, auth.uid(), p_vehicle_id, p_category, p_total_amount, p_litres,
          p_odometer_reading, p_expense_date, p_notes, p_payment_method, p_fuel_unit)
  on conflict (id) do update set
    vehicle_id = excluded.vehicle_id,
    category = excluded.category,
    total_amount = excluded.total_amount,
    litres = excluded.litres,
    odometer_reading = excluded.odometer_reading,
    expense_date = excluded.expense_date,
    notes = excluded.notes,
    payment_method = excluded.payment_method,
    fuel_unit = excluded.fuel_unit,
    updated_at = now();

  delete from maintenance_items where expense_id = p_id;

  if p_category = 'maintenance' and p_items is not null then
    insert into maintenance_items (expense_id, user_id, label, amount)
    select p_id, auth.uid(), item->>'label', (item->>'amount')::numeric
    from jsonb_array_elements(p_items) as item;
  end if;

  insert into ride_logs (user_id, vehicle_id, ride_date)
  values (auth.uid(), p_vehicle_id, p_expense_date)
  on conflict (vehicle_id, ride_date) do nothing;

  return p_id;
end;
$$;

-- 4. QR exported flag on vehicles. The physical QR is just a printable
--    rendering of the same `https://motopulse.app/v/{token}` URL that
--    NFC tags carry — so no new storage, just a flag.
alter table vehicles
  add column qr_exported_at timestamptz;

-- 5. Add 'battery_kwh' to vehicles for EVs so analytics can compute
--    km-per-kWh and estimated range from a last-charged state.
alter table vehicles
  add column battery_kwh numeric(5, 2);

-- 6. Extend the maintenance presets concept with EV-relevant ones. (Done
--    purely at the UI level since reminders are user-defined rows.)
