create extension if not exists pgcrypto;

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 255),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  category text not null default '' check (char_length(category) <= 50),
  tags text[] not null default '{}',
  extracted_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wrong_questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 10000),
  correct_answer text not null default '' check (char_length(correct_answer) <= 10000),
  explanation text not null default '' check (char_length(explanation) <= 10000),
  knowledge_point text not null default '' check (char_length(knowledge_point) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid references public.wrong_questions(id) on delete set null,
  question_snapshot text not null check (char_length(question_snapshot) between 1 and 10000),
  answer text not null check (char_length(answer) between 1 and 10000),
  created_at timestamptz not null default now()
);

create index knowledge_documents_owner_created_idx
  on public.knowledge_documents (owner_id, created_at desc);
create index wrong_questions_owner_created_idx
  on public.wrong_questions (owner_id, created_at desc);
create index practice_attempts_owner_created_idx
  on public.practice_attempts (owner_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger knowledge_documents_set_updated_at
  before update on public.knowledge_documents
  for each row execute function public.set_updated_at();
create trigger wrong_questions_set_updated_at
  before update on public.wrong_questions
  for each row execute function public.set_updated_at();

alter table public.knowledge_documents enable row level security;
alter table public.wrong_questions enable row level security;
alter table public.practice_attempts enable row level security;

create policy "Users manage their own knowledge documents"
  on public.knowledge_documents for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "Users manage their own wrong questions"
  on public.wrong_questions for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "Users manage their own practice attempts"
  on public.practice_attempts for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (
      question_id is null
      or exists (
        select 1 from public.wrong_questions
        where wrong_questions.id = practice_attempts.question_id
          and wrong_questions.owner_id = (select auth.uid())
      )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge-files',
  'knowledge-files',
  false,
  10485760,
  array['application/pdf', 'text/plain', 'text/markdown']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users read their own knowledge files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'knowledge-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Users upload their own knowledge files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'knowledge-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Users delete their own knowledge files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'knowledge-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );