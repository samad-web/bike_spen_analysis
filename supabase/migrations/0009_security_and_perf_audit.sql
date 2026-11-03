-- Cyber security + performance audit remediation.
--
-- Addresses every actionable finding from supabase lint:
--   * SECURITY WARN 0029: revoke /rest/v1/rpc/is_superadmin from authenticated
--   * PERFORMANCE WARN 0003 (42x): wrap every bare `auth.uid()` inside RLS
--     policies with `(select auth.uid())` so Postgres evaluates it once
--     per query, not per row (10–100x speedup on large tables)
--   * PERFORMANCE WARN 0006 (10x): merge overlapping permissive policies
--     on user_profiles and app_settings
--   * PERFORMANCE INFO 0001 (8x): add covering indexes on foreign keys
--
-- Paste into Supabase SQL editor. Idempotent (uses create-or-replace /
-- drop-if-exists / create-if-not-exists everywhere).

-- ===========================================================================
-- SECURITY
-- ===========================================================================

-- is_superadmin() is a SECURITY DEFINER function. Policies reference it by
-- name — they don't need EXECUTE grants because the policy is evaluated in
-- the function-owner's context. HTTP callers must not be able to probe the
-- user's role via /rest/v1/rpc/is_superadmin.
revoke execute on function public.is_superadmin() from public, anon, authenticated;

-- ===========================================================================
-- PERFORMANCE — wrap auth.uid() in all policy expressions
-- ===========================================================================

-- user_settings
drop policy if exists user_settings_select on user_settings;
drop policy if exists user_settings_insert on user_settings;
drop policy if exists user_settings_update on user_settings;
create policy user_settings_select on user_settings for select using (user_id = (select auth.uid()));
create policy user_settings_insert on user_settings for insert with check (user_id = (select auth.uid()));
create policy user_settings_update on user_settings for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- vehicles
drop policy if exists vehicles_select on vehicles;
drop policy if exists vehicles_insert on vehicles;
drop policy if exists vehicles_update on vehicles;
drop policy if exists vehicles_delete on vehicles;
create policy vehicles_select on vehicles for select using (user_id = (select auth.uid()));
create policy vehicles_insert on vehicles for insert with check (user_id = (select auth.uid()));
create policy vehicles_update on vehicles for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy vehicles_delete on vehicles for delete using (user_id = (select auth.uid()));

-- nfc_tags
drop policy if exists nfc_tags_select on nfc_tags;
drop policy if exists nfc_tags_insert on nfc_tags;
drop policy if exists nfc_tags_update on nfc_tags;
create policy nfc_tags_select on nfc_tags for select using (user_id = (select auth.uid()));
create policy nfc_tags_insert on nfc_tags for insert with check (
  user_id = (select auth.uid())
  and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))
);
create policy nfc_tags_update on nfc_tags for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- nfc_tag_events
drop policy if exists nfc_tag_events_select on nfc_tag_events;
drop policy if exists nfc_tag_events_insert on nfc_tag_events;
create policy nfc_tag_events_select on nfc_tag_events for select using (user_id = (select auth.uid()));
create policy nfc_tag_events_insert on nfc_tag_events for insert with check (user_id = (select auth.uid()));

-- active_sessions
drop policy if exists active_sessions_select on active_sessions;
drop policy if exists active_sessions_insert on active_sessions;
drop policy if exists active_sessions_update on active_sessions;
drop policy if exists active_sessions_delete on active_sessions;
create policy active_sessions_select on active_sessions for select using (user_id = (select auth.uid()));
create policy active_sessions_insert on active_sessions for insert with check (
  user_id = (select auth.uid())
  and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))
);
create policy active_sessions_update on active_sessions for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy active_sessions_delete on active_sessions for delete using (user_id = (select auth.uid()));

-- ride_logs
drop policy if exists ride_logs_select on ride_logs;
drop policy if exists ride_logs_insert on ride_logs;
drop policy if exists ride_logs_delete on ride_logs;
create policy ride_logs_select on ride_logs for select using (user_id = (select auth.uid()));
create policy ride_logs_insert on ride_logs for insert with check (
  user_id = (select auth.uid())
  and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))
);
create policy ride_logs_delete on ride_logs for delete using (user_id = (select auth.uid()));

-- expenses
drop policy if exists expenses_select on expenses;
drop policy if exists expenses_insert on expenses;
drop policy if exists expenses_update on expenses;
drop policy if exists expenses_delete on expenses;
create policy expenses_select on expenses for select using (user_id = (select auth.uid()));
create policy expenses_insert on expenses for insert with check (
  user_id = (select auth.uid())
  and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))
);
create policy expenses_update on expenses for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy expenses_delete on expenses for delete using (user_id = (select auth.uid()));

-- maintenance_items
drop policy if exists maintenance_items_select on maintenance_items;
drop policy if exists maintenance_items_insert on maintenance_items;
drop policy if exists maintenance_items_delete on maintenance_items;
create policy maintenance_items_select on maintenance_items for select using (user_id = (select auth.uid()));
create policy maintenance_items_insert on maintenance_items for insert with check (user_id = (select auth.uid()));
create policy maintenance_items_delete on maintenance_items for delete using (user_id = (select auth.uid()));

-- maintenance_reminders
drop policy if exists maintenance_reminders_select on maintenance_reminders;
drop policy if exists maintenance_reminders_insert on maintenance_reminders;
drop policy if exists maintenance_reminders_update on maintenance_reminders;
drop policy if exists maintenance_reminders_delete on maintenance_reminders;
create policy maintenance_reminders_select on maintenance_reminders for select using (user_id = (select auth.uid()));
create policy maintenance_reminders_insert on maintenance_reminders for insert with check (
  user_id = (select auth.uid())
  and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))
);
create policy maintenance_reminders_update on maintenance_reminders for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy maintenance_reminders_delete on maintenance_reminders for delete using (user_id = (select auth.uid()));

-- vehicle_documents
drop policy if exists vehicle_documents_select on vehicle_documents;
drop policy if exists vehicle_documents_insert on vehicle_documents;
drop policy if exists vehicle_documents_update on vehicle_documents;
drop policy if exists vehicle_documents_delete on vehicle_documents;
create policy vehicle_documents_select on vehicle_documents for select using (user_id = (select auth.uid()));
create policy vehicle_documents_insert on vehicle_documents for insert with check (
  user_id = (select auth.uid())
  and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))
);
create policy vehicle_documents_update on vehicle_documents for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy vehicle_documents_delete on vehicle_documents for delete using (user_id = (select auth.uid()));

-- notification_ledger
drop policy if exists notification_ledger_select on notification_ledger;
drop policy if exists notification_ledger_insert on notification_ledger;
drop policy if exists notification_ledger_delete on notification_ledger;
create policy notification_ledger_select on notification_ledger for select using (user_id = (select auth.uid()));
create policy notification_ledger_insert on notification_ledger for insert with check (user_id = (select auth.uid()));
create policy notification_ledger_delete on notification_ledger for delete using (user_id = (select auth.uid()));

-- user_profiles — merge overlapping UPDATE policies
drop policy if exists user_profiles_select_self on user_profiles;
drop policy if exists user_profiles_insert_self on user_profiles;
drop policy if exists user_profiles_update_self on user_profiles;
drop policy if exists user_profiles_update_admin on user_profiles;
create policy user_profiles_select on user_profiles for select
  using (user_id = (select auth.uid()) or is_superadmin());
create policy user_profiles_insert on user_profiles for insert
  with check (user_id = (select auth.uid()));
-- One merged UPDATE policy: self can edit non-role fields OR superadmin can edit anything.
create policy user_profiles_update on user_profiles for update
  using (user_id = (select auth.uid()) or is_superadmin())
  with check (
    (user_id = (select auth.uid()) and role = 'user'::user_role)   -- self update, cannot self-promote
    or is_superadmin()                                             -- superadmin can set any field
  );

-- app_settings — merge SELECT policies into one
drop policy if exists app_settings_select_public on app_settings;
drop policy if exists app_settings_write_admin on app_settings;
create policy app_settings_select on app_settings for select
  using (is_public = true or is_superadmin());
create policy app_settings_insert on app_settings for insert with check (is_superadmin());
create policy app_settings_update on app_settings for update using (is_superadmin()) with check (is_superadmin());
create policy app_settings_delete on app_settings for delete using (is_superadmin());

-- referrals
drop policy if exists referrals_select_own on referrals;
drop policy if exists referrals_insert_self on referrals;
create policy referrals_select on referrals for select
  using (inviter_user_id = (select auth.uid()) or invitee_user_id = (select auth.uid()) or is_superadmin());
create policy referrals_insert on referrals for insert with check (inviter_user_id = (select auth.uid()));

-- ===========================================================================
-- PERFORMANCE — covering indexes on foreign keys
-- ===========================================================================

create index if not exists active_sessions_vehicle_id_idx on active_sessions(vehicle_id);
create index if not exists app_settings_updated_by_idx on app_settings(updated_by);
create index if not exists maintenance_items_user_id_idx on maintenance_items(user_id);
create index if not exists nfc_tag_events_tag_token_idx on nfc_tag_events(tag_token);
create index if not exists notification_ledger_document_id_idx on notification_ledger(document_id);
create index if not exists notification_ledger_reminder_id_idx on notification_ledger(reminder_id);
create index if not exists referrals_invitee_user_id_idx on referrals(invitee_user_id);
create index if not exists vehicles_active_tag_token_idx on vehicles(active_tag_token);
