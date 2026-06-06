alter table public.questions
  add column if not exists choices jsonb not null default '[]'::jsonb;

comment on column public.questions.choices is
  'Structured multiple-choice options, for example [{"label":"A","text":"..."}].';
