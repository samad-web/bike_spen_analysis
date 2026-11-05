-- Payment cards tracking and cashback/returns calculation.
--
-- Security: Stores strictly card name, last 4 digits, bank/network, and return/cashback
-- rules. Full card PAN, CVV, and expiry dates are NEVER collected or stored.
--
-- Paste into Supabase SQL editor.

-- 1. Payment cards table
create table if not exists payment_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_name text not null,
  last_four varchar(4) not null check (last_four ~ '^[0-9]{4}$'),
  bank_name text not null default 'Other',
  network text not null default 'visa' check (network in ('visa', 'mastercard', 'rupay', 'amex', 'other')),
  card_color text not null default 'amber' check (card_color in ('amber', 'emerald', 'indigo', 'rose', 'slate', 'gold', 'purple', 'cyan')),
  fuel_cashback_percent numeric(5, 2) not null default 0.0 check (fuel_cashback_percent >= 0 and fuel_cashback_percent <= 100),
  surcharge_waiver_percent numeric(5, 2) not null default 1.0 check (surcharge_waiver_percent >= 0 and surcharge_waiver_percent <= 100),
  surcharge_min_amount numeric(10, 2) not null default 400.0 check (surcharge_min_amount >= 0),
  surcharge_max_amount numeric(10, 2) not null default 4000.0 check (surcharge_max_amount >= surcharge_min_amount),
  partner_fuel_brand text not null default 'all' check (partner_fuel_brand in ('all', 'bpcl', 'hpcl', 'iocl', 'shell', 'none')),
  other_cashback_percent numeric(5, 2) not null default 0.0 check (other_cashback_percent >= 0 and other_cashback_percent <= 100),
  is_default boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_cards_user_idx
  on payment_cards(user_id)
  where deleted_at is null;

-- 2. RLS policies with cached auth.uid()
alter table payment_cards enable row level security;

drop policy if exists payment_cards_select on payment_cards;
drop policy if exists payment_cards_insert on payment_cards;
drop policy if exists payment_cards_update on payment_cards;
drop policy if exists payment_cards_delete on payment_cards;

create policy payment_cards_select on payment_cards for select using (user_id = (select auth.uid()));
create policy payment_cards_insert on payment_cards for insert with check (user_id = (select auth.uid()));
create policy payment_cards_update on payment_cards for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy payment_cards_delete on payment_cards for delete using (user_id = (select auth.uid()));

-- 3. Add card association and cashback tracking to expenses
alter table expenses
  add column if not exists card_id uuid references payment_cards(id) on delete set null,
  add column if not exists cashback_amount numeric(10, 2) not null default 0.0;

create index if not exists expenses_card_id_idx
  on expenses(card_id)
  where deleted_at is null;

-- 4. Update save_expense RPC with optional card_id and cashback_amount
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
  p_fuel_unit fuel_unit default 'L',
  p_card_id uuid default null,
  p_cashback_amount numeric default 0.0
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

  if p_card_id is not null then
    select user_id into v_owner from payment_cards where id = p_card_id;
    if v_owner is null or v_owner <> auth.uid() then
      raise exception 'card % does not belong to the caller', p_card_id;
    end if;
  end if;

  if p_category = 'maintenance' and p_items is not null and jsonb_array_length(p_items) > 0 then
    select coalesce(sum((item->>'amount')::numeric), 0) into v_items_total
    from jsonb_array_elements(p_items) as item;
    if v_items_total <> p_total_amount then
      raise exception 'total_amount (%) must equal the sum of maintenance items (%)',
        p_total_amount, v_items_total;
    end if;
  end if;

  insert into expenses (
    id, user_id, vehicle_id, category, total_amount, litres,
    odometer_reading, expense_date, notes, payment_method, fuel_unit,
    card_id, cashback_amount
  )
  values (
    p_id, auth.uid(), p_vehicle_id, p_category, p_total_amount, p_litres,
    p_odometer_reading, p_expense_date, p_notes, p_payment_method, p_fuel_unit,
    p_card_id, coalesce(p_cashback_amount, 0.0)
  )
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
    card_id = excluded.card_id,
    cashback_amount = excluded.cashback_amount,
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

-- Overload for backward-compatibility with callers supplying 11 parameters
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
  p_payment_method payment_method,
  p_fuel_unit fuel_unit
) returns uuid
language sql
security invoker
set search_path = public, pg_temp
as $$
  select save_expense(
    p_id, p_vehicle_id, p_category, p_total_amount, p_litres,
    p_odometer_reading, p_expense_date, p_notes, p_items,
    p_payment_method, p_fuel_unit, null::uuid, 0.0::numeric
  );
$$;
