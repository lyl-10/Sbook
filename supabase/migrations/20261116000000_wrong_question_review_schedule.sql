alter table public.wrong_questions
  add column review_count integer not null default 0
    check (review_count >= 0),
  add column last_reviewed_at timestamptz,
  add column next_review_at timestamptz not null default (now() + interval '1 day');

create index wrong_questions_owner_next_review_idx
  on public.wrong_questions (owner_id, next_review_at);
