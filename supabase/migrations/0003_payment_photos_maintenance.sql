-- UI/UX overhaul support migration (payment-method tracking, vehicle photos,
-- maintenance reminders). Paste into Supabase SQL editor. Idempotent for the
-- storage bucket and type creation.

create type payment_method as enum ('cash', 'card', 'upi', 'wallet', 'net_banking', 'other');

alter table expenses
  add column payment_method payment_method not null default 'cash';

create index expenses_payment_method_idx on expenses(user_id, payment_method) where deleted_at is null;

alter table vehicles
  add column photo_url text,
  add column thumbnail_url text,
  add column make text,
  add column model text,
  add column year int,
  add column registration_number text,
  add column fuel_type text check (fuel_type in ('petrol', 'diesel', 'electric', 'cng', 'hybrid')),
  add column tank_capacity numeric(5, 2);

create type maintenance_schedule as enum ('odometer', 'date', 'both');

create table maintenance_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  label text not null,
  schedule_type maintenance_schedule not null,
  interval_km int,
  interval_days int,
  last_done_date date,
  last_done_odometer numeric(10, 1),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index maintenance_reminders_vehicle_idx on maintenance_reminders(vehicle_id) where deleted_at is null;
create index maintenance_reminders_user_idx on maintenance_reminders(user_id) where deleted_at is null;

alter table maintenance_reminders enable row level security;

create policy maintenance_reminders_select on maintenance_reminders for select using (user_id = auth.uid());
create policy maintenance_reminders_insert on maintenance_reminders for insert with check (
  user_id = auth.uid() and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = auth.uid())
);
create policy maintenance_reminders_update on maintenance_reminders for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy maintenance_reminders_delete on maintenance_reminders for delete using (user_id = auth.uid());

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
  p_payment_method payment_method default 'cash'
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
      raise exception 'total_amount (%) must equal the sum of maintenance items (%)', p_total_amount, v_items_total;
    end if;
  end if;

  insert into expenses (id, user_id, vehicle_id, category, total_amount, litres, odometer_reading, expense_date, notes, payment_method)
  values (p_id, auth.uid(), p_vehicle_id, p_category, p_total_amount, p_litres, p_odometer_reading, p_expense_date, p_notes, p_payment_method)
  on conflict (id) do update set
    vehicle_id = excluded.vehicle_id,
    category = excluded.category,
    total_amount = excluded.total_amount,
    litres = excluded.litres,
    odometer_reading = excluded.odometer_reading,
    expense_date = excluded.expense_date,
    notes = excluded.notes,
    payment_method = excluded.payment_method,
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-photos', 'vehicle-photos', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "vehicle photos public read" on storage.objects
  for select using (bucket_id = 'vehicle-photos');

create policy "vehicle photos user write" on storage.objects
  for insert with check (
    bucket_id = 'vehicle-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vehicle photos user update" on storage.objects
  for update using (
    bucket_id = 'vehicle-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vehicle photos user delete" on storage.objects
  for delete using (
    bucket_id = 'vehicle-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
