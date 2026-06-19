alter table public.questions
  add column if not exists related_practice_questions jsonb not null default '[]'::jsonb;

comment on column public.questions.related_practice_questions is
  'Imported 408 same-knowledge-point practice questions. Empty for math and unsupported subjects.';
