-- Corrective migration. Paste in Supabase SQL editor.
--
-- Fixes:
--   1. Backfills user_profiles for the single existing user who signed up
--      before the auth trigger was added.
--   2. Promotes abduljinnah641@gmail.com to superadmin so you can hit /admin.
--   3. Rebuilds admin_user_stats as a security_invoker view so it respects
--      the caller's RLS instead of exposing auth.users (closes the Supabase
--      lint "Exposed Auth Users" ERROR + "Security Definer View" ERROR).
--   4. Revokes handle_new_user() from public — it's a trigger function,
--      not an RPC. (Closes the two WARN advisories.)

insert into user_profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

update user_profiles
   set role = 'superadmin', updated_at = now()
 where user_id = (select id from auth.users where email = 'abduljinnah641@gmail.com');

drop view if exists admin_user_stats;

create view admin_user_stats
  with (security_invoker = on) as
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

revoke all on admin_user_stats from anon;
grant select on admin_user_stats to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
