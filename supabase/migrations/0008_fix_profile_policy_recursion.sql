-- Fix infinite recursion in user_profiles RLS.
--
-- The 0006 policies referenced `user_profiles` from inside policies ON
-- user_profiles — every SELECT fired the SELECT policy, whose EXISTS
-- clause triggered another SELECT, which fired the policy again. Postgres
-- aborted the query ("infinite recursion detected in policy"), the UI
-- rendered as if the profile row didn't exist, and the Admin + Invite
-- cards disappeared.
--
-- Fix: lift the "am I a superadmin?" check into a SECURITY DEFINER
-- function. SECURITY DEFINER functions bypass RLS, so the inner lookup
-- doesn't re-enter the policy. We also apply the same pattern to the
-- update_admin and app_settings policies.
--
-- Paste in Supabase SQL editor.

create or replace function is_superadmin() returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'superadmin');
$$;

-- Revoke public execute — only policies and server-side callers need it.
revoke execute on function public.is_superadmin() from public, anon, authenticated;
grant execute on function public.is_superadmin() to authenticated;

-- Replace the recursive policies.
drop policy if exists user_profiles_select_self on user_profiles;
drop policy if exists user_profiles_update_admin on user_profiles;

create policy user_profiles_select_self on user_profiles for select
  using (user_id = auth.uid() or public.is_superadmin());

create policy user_profiles_update_admin on user_profiles for update
  using (public.is_superadmin());

-- app_settings had the same pattern — fix it too.
drop policy if exists app_settings_select_public on app_settings;
drop policy if exists app_settings_write_admin on app_settings;

create policy app_settings_select_public on app_settings for select
  using (is_public = true or public.is_superadmin());

create policy app_settings_write_admin on app_settings for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- Referrals had the same pattern on its SELECT policy.
drop policy if exists referrals_select_own on referrals;

create policy referrals_select_own on referrals for select
  using (inviter_user_id = auth.uid()
         or invitee_user_id = auth.uid()
         or public.is_superadmin());
