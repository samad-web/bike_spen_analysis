-- 0012_ride_logs_update_policy.sql
-- Allow updates on ride_logs so upsert (ON CONFLICT DO UPDATE) succeeds under RLS.

drop policy if exists ride_logs_update on ride_logs;
create policy ride_logs_update on ride_logs for update using (
  user_id = (select auth.uid())
) with check (
  user_id = (select auth.uid())
  and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))
);

