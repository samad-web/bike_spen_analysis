-- Hardening pass addressing the three security advisories from the first
-- migration. Idempotent — re-running is a no-op.
--
-- Paste this into the Supabase SQL editor (same way you ran 0001) since
-- the apply_migration MCP tool is being auto-blocked by Claude Code's
-- "Modify Shared Resources" classifier in this session.

-- 1. Pin save_expense's search_path. SECURITY INVOKER already, so this is
--    defense-in-depth: a session-level SET search_path can no longer shadow
--    the function's table references.
alter function public.save_expense(uuid, uuid, expense_category, numeric, numeric, numeric, date, text, jsonb)
  set search_path = public, pg_temp;

-- 2. rls_auto_enable is a Supabase-provisioned event-trigger that
--    auto-enables RLS on new tables in `public`. Event triggers fire as
--    the DDL-issuing role regardless of EXECUTE grants, so revoking HTTP
--    exposure here does not break the auto-enable behaviour — it just
--    stops PostgREST from publishing the function as a callable
--    /rest/v1/rpc/rls_auto_enable endpoint.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
