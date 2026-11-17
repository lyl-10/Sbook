alter table public.wrong_questions
  add column if not exists correct_answer_image_path text
    check (
      correct_answer_image_path is null
      or char_length(correct_answer_image_path) <= 255
    );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'wrong-answer-images',
  'wrong-answer-images',
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
      and policyname = 'Users read their own wrong answer images'
  ) then
    execute $policy$
      create policy "Users read their own wrong answer images"
        on storage.objects for select to authenticated
        using (
          bucket_id = 'wrong-answer-images'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users upload their own wrong answer images'
  ) then
    execute $policy$
      create policy "Users upload their own wrong answer images"
        on storage.objects for insert to authenticated
        with check (
          bucket_id = 'wrong-answer-images'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users delete their own wrong answer images'
  ) then
    execute $policy$
      create policy "Users delete their own wrong answer images"
        on storage.objects for delete to authenticated
        using (
          bucket_id = 'wrong-answer-images'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
    $policy$;
  end if;
end
$migration$;
