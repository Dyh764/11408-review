-- Allow ChatGPT-imported text-only wrong-question cards while preserving image ownership checks.

alter table public.questions
  alter column image_path drop not null;

alter table public.questions
  add column if not exists source text not null default 'manual';

alter table public.questions
  drop constraint if exists questions_image_path_owner;

alter table public.questions
  add constraint questions_image_path_owner check (
    image_path is null
    or image_path like ('users/' || user_id::text || '/questions/%')
  );

alter table public.questions
  drop constraint if exists questions_source_check;

alter table public.questions
  add constraint questions_source_check check (
    source in ('upload', 'chatgpt_import', 'ai_analysis', 'manual', 'pending_chatgpt')
  );
