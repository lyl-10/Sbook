insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'user-avatars',
  'user-avatars',
  false,
  3145728,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $migration$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users read their own avatars'
  ) then
    execute $policy$
      create policy "Users read their own avatars"
        on storage.objects for select to authenticated
        using (
          bucket_id = 'user-avatars'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users upload their own avatars'
  ) then
    execute $policy$
      create policy "Users upload their own avatars"
        on storage.objects for insert to authenticated
        with check (
          bucket_id = 'user-avatars'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users update their own avatars'
  ) then
    execute $policy$
      create policy "Users update their own avatars"
        on storage.objects for update to authenticated
        using (
          bucket_id = 'user-avatars'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
        with check (
          bucket_id = 'user-avatars'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
    $policy$;
  end if;
end
$migration$;
