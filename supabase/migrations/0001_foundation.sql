-- MotoPulse foundation schema + RLS
-- See build-docs/features/foundation-schema.md for the design doc this implements.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- user_settings: currency + notification prefs (gap analysis: currency is a
-- setting, not hardcoded)
-- ---------------------------------------------------------------------------
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'INR' check (currency in ('INR', 'USD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

create policy user_settings_select on user_settings
  for select using (user_id = auth.uid());
create policy user_settings_insert on user_settings
  for insert with check (user_id = auth.uid());
create policy user_settings_update on user_settings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------------
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  active_tag_token text, -- FK to nfc_tags(token), added after that table exists
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_user_id_idx on vehicles(user_id) where deleted_at is null;

alter table vehicles enable row level security;

create policy vehicles_select on vehicles
  for select using (user_id = auth.uid());
create policy vehicles_insert on vehicles
  for insert with check (user_id = auth.uid());
create policy vehicles_update on vehicles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy vehicles_delete on vehicles
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- nfc_tags + nfc_tag_events  (build-docs/features/nfc-tools.md)
-- ---------------------------------------------------------------------------
create type nfc_tag_status as enum ('active', 'replaced', 'erased');

create table nfc_tags (
  token text primary key, -- opaque random token written to the physical tag
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status nfc_tag_status not null default 'active',
  created_at timestamptz not null default now(),
  last_scanned_at timestamptz
);

create index nfc_tags_vehicle_id_idx on nfc_tags(vehicle_id);
create index nfc_tags_user_id_idx on nfc_tags(user_id);

alter table vehicles
  add constraint vehicles_active_tag_token_fkey
  foreign key (active_tag_token) references nfc_tags(token) on delete set null;

alter table nfc_tags enable row level security;

create policy nfc_tags_select on nfc_tags
  for select using (user_id = auth.uid());
create policy nfc_tags_insert on nfc_tags
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = auth.uid())
  );
create policy nfc_tags_update on nfc_tags
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create type nfc_tag_event_type as enum (
  'scanned', 'written', 'erased', 'formatted', 'replaced',
  'locked', 'password_set', 'password_removed', 'write_failed'
);

create table nfc_tag_events (
  id uuid primary key default gen_random_uuid(),
  tag_token text references nfc_tags(token) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type nfc_tag_event_type not null,
  tag_uid text, -- hardware UID captured for audit only, never an identity key
  tag_technology text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index nfc_tag_events_vehicle_id_idx on nfc_tag_events(vehicle_id, created_at desc);
create index nfc_tag_events_user_id_idx on nfc_tag_events(user_id, created_at desc);

alter table nfc_tag_events enable row level security;

create policy nfc_tag_events_select on nfc_tag_events
  for select using (user_id = auth.uid());
create policy nfc_tag_events_insert on nfc_tag_events
  for insert with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- active_sessions  (build-docs/features/tap-session.md — gap analysis #1)
-- ---------------------------------------------------------------------------
create table active_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null, -- set to the next local midnight by the app/RPC
  primary key (user_id)
);

alter table active_sessions enable row level security;

create policy active_sessions_select on active_sessions
  for select using (user_id = auth.uid());
create policy active_sessions_insert on active_sessions
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = auth.uid())
  );
create policy active_sessions_update on active_sessions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy active_sessions_delete on active_sessions
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ride_logs
-- ---------------------------------------------------------------------------
create table ride_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  ride_date date not null,
  created_at timestamptz not null default now(),
  unique (vehicle_id, ride_date)
);

create index ride_logs_user_date_idx on ride_logs(user_id, ride_date);

alter table ride_logs enable row level security;

create policy ride_logs_select on ride_logs
  for select using (user_id = auth.uid());
create policy ride_logs_insert on ride_logs
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = auth.uid())
  );
create policy ride_logs_delete on ride_logs
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- expenses (fuel + maintenance) + maintenance_items
-- ---------------------------------------------------------------------------
create type expense_category as enum ('fuel', 'maintenance');

create table expenses (
  id uuid primary key default gen_random_uuid(), -- client-generated for offline idempotency
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  category expense_category not null,
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  litres numeric(8, 3) check (litres is null or litres > 0),
  price_per_litre numeric(10, 4) generated always as (
    case when litres is not null and litres > 0
      then round(total_amount / litres, 4)
      else null
    end
  ) stored,
  odometer_reading numeric(10, 1), -- optional, gap analysis: nullable
  expense_date date not null, -- separate from created_at, supports backdating
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_user_date_idx on expenses(user_id, expense_date) where deleted_at is null;
create index expenses_vehicle_date_idx on expenses(vehicle_id, expense_date) where deleted_at is null;

alter table expenses enable row level security;

create policy expenses_select on expenses
  for select using (user_id = auth.uid());
create policy expenses_insert on expenses
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = auth.uid())
  );
create policy expenses_update on expenses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy expenses_delete on expenses
  for delete using (user_id = auth.uid());

create table maintenance_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, -- gap analysis #5: was missing
  label text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index maintenance_items_expense_id_idx on maintenance_items(expense_id);

alter table maintenance_items enable row level security;

create policy maintenance_items_select on maintenance_items
  for select using (user_id = auth.uid());
create policy maintenance_items_insert on maintenance_items
  for insert with check (user_id = auth.uid());
create policy maintenance_items_delete on maintenance_items
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- save_expense RPC: atomic expense + maintenance items insert
-- (gap analysis #6 — replaces Express, since supabase-js alone can't do a
-- multi-step transaction). Validates vehicle ownership itself as
-- defense-in-depth on top of RLS.
-- ---------------------------------------------------------------------------
create or replace function save_expense(
  p_id uuid,
  p_vehicle_id uuid,
  p_category expense_category,
  p_total_amount numeric,
  p_litres numeric,
  p_odometer_reading numeric,
  p_expense_date date,
  p_notes text,
  p_items jsonb -- array of {label, amount}, only used when category = 'maintenance'
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp -- pinned so session-level SET search_path can't shadow table refs
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

  insert into expenses (
    id, user_id, vehicle_id, category, total_amount, litres,
    odometer_reading, expense_date, notes
  ) values (
    p_id, auth.uid(), p_vehicle_id, p_category, p_total_amount, p_litres,
    p_odometer_reading, p_expense_date, p_notes
  )
  on conflict (id) do update set
    vehicle_id = excluded.vehicle_id,
    category = excluded.category,
    total_amount = excluded.total_amount,
    litres = excluded.litres,
    odometer_reading = excluded.odometer_reading,
    expense_date = excluded.expense_date,
    notes = excluded.notes,
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
