-- Restore EXECUTE on is_superadmin() to the authenticated role.
--
-- Migration 0009 revoked EXECUTE from public/anon/authenticated to close
-- a Supabase lint warning (function callable via /rest/v1/rpc/is_superadmin).
-- Too aggressive: the `user_profiles_select` RLS policy CALLS this function,
-- and Postgres requires the current role to have EXECUTE on functions
-- referenced from policies. Result: every authenticated SELECT on
-- user_profiles returned 403, which broke the Settings page (no Admin pill,
-- no Invite card, no role indicator).
--
-- Trade-off: a signed-in user can now POST /rest/v1/rpc/is_superadmin and
-- learn their own role. They already have this information (it's a column
-- on their own user_profiles row that RLS lets them read), so exposing it
-- via a second endpoint doesn't leak anything new. The Supabase lint will
-- re-raise as WARN; that's acceptable given the trade-off.
--
-- Paste into Supabase SQL editor.

grant execute on function public.is_superadmin() to authenticated;

-- Keep it blocked from unauthenticated probes.
revoke execute on function public.is_superadmin() from public, anon;
