-- Vehicle documents (insurance, PUC, RC, service invoice PDFs/images) and
-- a notifications ledger so a reminder is only pushed once per overdue cycle.
--
-- Paste into Supabase SQL editor. The auto-mode classifier in this session
-- blocks apply_migration for shared-resource writes.

create type vehicle_doc_type as enum (
  'insurance', 'puc', 'rc', 'service_invoice', 'warranty', 'other'
);

create table vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  doc_type vehicle_doc_type not null,
  label text,                              -- optional free-text label
  storage_path text not null,              -- key inside vehicle-docs bucket
  mime_type text,
  file_size_bytes bigint,
  expires_on date,                         -- surfaces in due-list on dashboard
  issued_on date,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicle_documents_vehicle_idx on vehicle_documents(vehicle_id) where deleted_at is null;
create index vehicle_documents_user_idx on vehicle_documents(user_id, expires_on) where deleted_at is null;

alter table vehicle_documents enable row level security;

create policy vehicle_documents_select on vehicle_documents for select using (user_id = auth.uid());
create policy vehicle_documents_insert on vehicle_documents for insert with check (
  user_id = auth.uid() and exists (select 1 from vehicles v where v.id = vehicle_id and v.user_id = auth.uid())
);
create policy vehicle_documents_update on vehicle_documents for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy vehicle_documents_delete on vehicle_documents for delete using (user_id = auth.uid());

-- Private bucket for documents — unlike vehicle-photos which is public,
-- insurance papers etc. need signed URLs so a URL leaked somewhere can't be
-- used to download the PDF without being signed in.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-docs', 'vehicle-docs', false, 10485760,
        array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do nothing;

create policy "vehicle docs user read" on storage.objects
  for select using (
    bucket_id = 'vehicle-docs'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vehicle docs user write" on storage.objects
  for insert with check (
    bucket_id = 'vehicle-docs'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vehicle docs user update" on storage.objects
  for update using (
    bucket_id = 'vehicle-docs' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vehicle docs user delete" on storage.objects
  for delete using (
    bucket_id = 'vehicle-docs' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Notification dedupe ledger — a (reminder_id, due_cycle_key) row means
-- "already notified about this specific overdue cycle" so a notification
-- isn't re-fired on every app load.
create table notification_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_id uuid references maintenance_reminders(id) on delete cascade,
  document_id uuid references vehicle_documents(id) on delete cascade,
  cycle_key text not null,                 -- e.g. '2026-11-oil-change' or 'puc-2026-12-31'
  fired_at timestamptz not null default now(),
  unique (user_id, cycle_key)
);

alter table notification_ledger enable row level security;

create policy notification_ledger_select on notification_ledger for select using (user_id = auth.uid());
create policy notification_ledger_insert on notification_ledger for insert with check (user_id = auth.uid());
create policy notification_ledger_delete on notification_ledger for delete using (user_id = auth.uid());
