-- 0011_ride_planner_and_calendar.sql
-- Enables planning / scheduling which bike a rider will use on any given date.
-- Powers the interactive Ride Calendar and syncs with daily active sessions.

create table if not exists planned_rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  plan_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planned_rides_user_date_unique unique (user_id, plan_date)
);

create index if not exists planned_rides_user_date_idx on planned_rides(user_id, plan_date);
create index if not exists planned_rides_vehicle_idx on planned_rides(vehicle_id);

alter table planned_rides enable row level security;

create policy planned_rides_select on planned_rides
  for select using (user_id = (select auth.uid()));

create policy planned_rides_insert on planned_rides
  for insert with check (
    user_id = (select auth.uid()) and
    exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))
  );

create policy planned_rides_update on planned_rides
  for update using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid()) and
    exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))
  );

create policy planned_rides_delete on planned_rides
  for delete using (user_id = (select auth.uid()));

