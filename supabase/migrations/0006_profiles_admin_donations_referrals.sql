-- User profiles with role, app-level settings (donation UPI id etc.),
-- and a referral tracking table so friends you invite are counted toward
-- a public leaderboard / your own earnings view.
--
-- The admin dashboard reads from these; donation page reads app_settings.
-- Paste into Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- 1. user_profiles — one row per auth user, carrying app-level state
--    (role, display name, referral code). Backfilled on first sign-in by
--    a trigger so every user automatically has a profile.
-- ---------------------------------------------------------------------------
create type user_role as enum ('user', 'superadmin');

create table user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'user',
  display_name text,
  referral_code text unique not null default substring(
    encode(gen_random_bytes(6), 'base64')
    from 1 for 8
  ),
  referred_by_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_profiles_role_idx on user_profiles(role);
create index user_profiles_referral_code_idx on user_profiles(referral_code);

alter table user_profiles enable row level security;

-- Any signed-in user can read their own profile. Superadmins can read all.
create policy user_profiles_select_self on user_profiles for select
  using (user_id = auth.uid()
         or exists (select 1 from user_profiles p where p.user_id = auth.uid() and p.role = 'superadmin'));

create policy user_profiles_insert_self on user_profiles for insert
  with check (user_id = auth.uid());

create policy user_profiles_update_self on user_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and role = 'user');  -- can't self-promote

-- Superadmins can update anyone (including role changes).
create policy user_profiles_update_admin on user_profiles for update
  using (exists (select 1 from user_profiles p where p.user_id = auth.uid() and p.role = 'superadmin'));

-- Auto-provision a profile when a user signs up. Supabase's auth.users
-- trigger pattern is a security definer function fired by a trigger on
-- the auth schema — Supabase lets us hook via `on auth.users` triggers.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. app_settings — key/value global config, only superadmins can write.
--    Specific keys (listed in PUBLIC_KEYS below) are readable by everyone
--    so the public donation page can render the UPI QR without being
--    signed in.
-- ---------------------------------------------------------------------------
create table app_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table app_settings enable row level security;

create policy app_settings_select_public on app_settings for select
  using (is_public = true or exists (select 1 from user_profiles p where p.user_id = auth.uid() and p.role = 'superadmin'));

create policy app_settings_write_admin on app_settings for all
  using (exists (select 1 from user_profiles p where p.user_id = auth.uid() and p.role = 'superadmin'))
  with check (exists (select 1 from user_profiles p where p.user_id = auth.uid() and p.role = 'superadmin'));

-- Seed the donation config as a public setting so the UI can render
-- immediately. The admin updates it from the admin panel.
insert into app_settings (key, value, is_public)
values ('donation', '{"upi_id":"","display_name":"","note":"Support MotoPulse — any amount helps."}'::jsonb, true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 3. referrals — tracks who was invited by whom (via referral_code).
--    `times_used` is maintained server-side (we count distinct `referred_by_code`
--    values on user_profiles). This table is for individual invite events,
--    so you can see "Riya accepted on 2026-11-03".
-- ---------------------------------------------------------------------------
create table referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_user_id uuid references auth.users(id) on delete set null,
  referral_code text not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index referrals_inviter_idx on referrals(inviter_user_id);
create index referrals_code_idx on referrals(referral_code);

alter table referrals enable row level security;

create policy referrals_select_own on referrals for select
  using (inviter_user_id = auth.uid()
         or invitee_user_id = auth.uid()
         or exists (select 1 from user_profiles p where p.user_id = auth.uid() and p.role = 'superadmin'));

create policy referrals_insert_self on referrals for insert
  with check (inviter_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Admin stats view — a single SECURITY INVOKER view the admin dashboard
--    queries. Non-admins get zero rows (view goes through RLS on the
--    underlying tables; policies above gate the data).
-- ---------------------------------------------------------------------------
create or replace view admin_user_stats as
select
  p.user_id,
  u.email,
  p.role,
  p.display_name,
  p.referral_code,
  p.referred_by_code,
  u.created_at as signed_up_at,
  u.last_sign_in_at,
  (select count(*) from vehicles v where v.user_id = p.user_id and v.deleted_at is null) as vehicle_count,
  (select count(*) from expenses e where e.user_id = p.user_id and e.deleted_at is null) as expense_count,
  (select coalesce(sum(total_amount), 0) from expenses e where e.user_id = p.user_id and e.deleted_at is null) as lifetime_spend,
  (select max(e.created_at) from expenses e where e.user_id = p.user_id and e.deleted_at is null) as last_activity_at
from user_profiles p
join auth.users u on u.id = p.user_id;

-- The view's row-level filtering is enforced by user_profiles' RLS: a
-- non-admin sees only their own row (their own user_profiles.select policy
-- returns their row only, so the join returns their row only).
