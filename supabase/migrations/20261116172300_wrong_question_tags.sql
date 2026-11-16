alter table public.wrong_questions
  add column tags text[] not null default '{}'::text[]
    check (cardinality(tags) <= 10);
