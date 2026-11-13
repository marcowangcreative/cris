-- Private Storage bucket. Objects live under {client_id}/...
-- Apply on Supabase, where the storage schema already exists.
-- The pglite test creates a stub schema before running this file.

insert into storage.buckets (id, name, public)
values ('client-assets', 'client-assets', false)
on conflict (id) do nothing;

grant usage on schema storage to authenticated;
grant select, insert on storage.objects to authenticated;
grant select on storage.buckets to authenticated;

alter table storage.objects enable row level security;

create policy client_assets_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = public.current_client_id()::text
  );

create policy client_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = public.current_client_id()::text
  );
