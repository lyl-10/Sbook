alter table public.practice_attempts
  add column if not exists evaluation_verdict text
    check (
      evaluation_verdict is null
      or evaluation_verdict in ('correct', 'incorrect', 'uncertain', 'unavailable')
    );
