alter table public.questions
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_reason text null;

create index if not exists questions_user_deleted_created_idx
  on public.questions (user_id, deleted_at, created_at desc);
