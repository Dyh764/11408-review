-- Add optional answer reveal fields to wrong-question cards.
-- Existing rows keep nullable answer content and default metadata.

alter table public.questions
  add column if not exists difficulty text;

alter table public.questions
  add column if not exists standard_answer text;

alter table public.questions
  add column if not exists answer_explanation text;

alter table public.questions
  add column if not exists key_steps text[] not null default '{}';

alter table public.questions
  add column if not exists answer_status text not null default 'ai_unverified';

alter table public.questions
  add column if not exists answer_source text not null default 'chatgpt_import';

alter table public.questions
  drop constraint if exists questions_difficulty_check;

alter table public.questions
  add constraint questions_difficulty_check check (
    difficulty is null
    or difficulty in ('基础', '中等', '较难', '压轴')
  );

alter table public.questions
  drop constraint if exists questions_answer_status_check;

alter table public.questions
  add constraint questions_answer_status_check check (
    answer_status in ('ai_unverified', 'verified', 'needs_fix')
  );

alter table public.questions
  drop constraint if exists questions_answer_source_check;

alter table public.questions
  add constraint questions_answer_source_check check (
    answer_source in ('chatgpt_import', 'manual', 'ai_enhanced', 'unknown')
  );
