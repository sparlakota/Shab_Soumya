-- ============================================================
-- STORAGE — private buckets, served via short-lived signed URLs
-- from the app (see src/lib/storage.ts). Nothing is public.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('avatars', 'avatars', false, 5242880),
  ('memories', 'memories', false, 104857600),
  ('world', 'world', false, 20971520),
  ('little-things', 'little-things', false, 20971520)
on conflict (id) do nothing;

create policy "storage_authenticated_select" on storage.objects
  for select using (
    bucket_id in ('avatars', 'memories', 'world', 'little-things')
    and auth.role() = 'authenticated'
  );

create policy "storage_authenticated_insert" on storage.objects
  for insert with check (
    bucket_id in ('avatars', 'memories', 'world', 'little-things')
    and auth.role() = 'authenticated'
  );

create policy "storage_authenticated_update" on storage.objects
  for update using (
    bucket_id in ('avatars', 'memories', 'world', 'little-things')
    and auth.role() = 'authenticated'
  );

create policy "storage_authenticated_delete" on storage.objects
  for delete using (
    bucket_id in ('avatars', 'memories', 'world', 'little-things')
    and auth.role() = 'authenticated'
  );
