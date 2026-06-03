-- 11408-review MVP initial schema and RLS.
-- Run this in the Supabase SQL editor or through Supabase CLI migrations.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Shanghai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (
    subject in ('数学', '数据结构', '计算机组成原理', '操作系统', '计算机网络')
  ),
  chapter text,
  knowledge_point text,
  image_path text not null,
  image_url text,
  question_text text,
  question_text_status text not null default 'ai_unverified' check (
    question_text_status in ('ai_unverified', 'verified', 'needs_fix')
  ),
  mastery_status text not null check (
    mastery_status in ('完全没思路', '有一点思路', '思路对但卡住', '计算错误', '做对但不稳', '完全掌握')
  ),
  user_note text,
  mistake_types text[] not null default '{}',
  solution_summary text,
  one_sentence_tip text,
  review_priority text check (review_priority in ('low', 'medium', 'high')),
  confidence text check (confidence in ('low', 'medium', 'high')),
  needs_manual_check boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  analyzed_at timestamptz,
  constraint questions_image_path_owner check (
    image_path like ('users/' || user_id::text || '/questions/%')
  )
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  scheduled_date date not null,
  completed_at timestamptz,
  review_result text check (
    review_result in ('still_wrong', 'improved', 'mastered', 'wrong_again')
  ),
  created_at timestamptz not null default now(),
  constraint reviews_one_schedule_per_day unique (question_id, scheduled_date)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('daily', 'weekly', 'monthly')),
  start_date date not null,
  end_date date not null,
  content_json jsonb not null,
  created_at timestamptz not null default now(),
  constraint reports_valid_range check (end_date >= start_date),
  constraint reports_one_per_range unique (user_id, type, start_date, end_date)
);

create table if not exists public.knowledge_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (
    subject in ('数学', '数据结构', '计算机组成原理', '操作系统', '计算机网络')
  ),
  chapter text,
  knowledge_point text not null,
  wrong_count int not null default 0 check (wrong_count >= 0),
  no_idea_count int not null default 0 check (no_idea_count >= 0),
  stuck_count int not null default 0 check (stuck_count >= 0),
  repeated_wrong_count int not null default 0 check (repeated_wrong_count >= 0),
  failed_review_count int not null default 0 check (failed_review_count >= 0),
  overdue_review_count int not null default 0 check (overdue_review_count >= 0),
  mastered_count int not null default 0 check (mastered_count >= 0),
  weakness_score int not null default 0,
  updated_at timestamptz not null default now(),
  constraint knowledge_stats_unique_point unique (user_id, subject, chapter, knowledge_point)
);

create index if not exists questions_user_created_idx on public.questions (user_id, created_at desc);
create index if not exists questions_user_subject_idx on public.questions (user_id, subject);
create index if not exists questions_text_search_idx on public.questions using gin (
  to_tsvector('simple', coalesce(question_text, '') || ' ' || coalesce(user_note, '') || ' ' || coalesce(knowledge_point, ''))
);
create index if not exists reviews_user_scheduled_idx on public.reviews (user_id, scheduled_date, completed_at);
create index if not exists reports_user_type_range_idx on public.reports (user_id, type, start_date desc);
create index if not exists knowledge_stats_user_score_idx on public.knowledge_stats (user_id, weakness_score desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_questions_updated_at on public.questions;
create trigger set_questions_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

drop trigger if exists set_knowledge_stats_updated_at on public.knowledge_stats;
create trigger set_knowledge_stats_updated_at
before update on public.knowledge_stats
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.knowledge_stats enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "questions_select_own" on public.questions;
create policy "questions_select_own"
on public.questions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "questions_insert_own" on public.questions;
create policy "questions_insert_own"
on public.questions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "questions_update_own" on public.questions;
create policy "questions_update_own"
on public.questions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "questions_delete_own" on public.questions;
create policy "questions_delete_own"
on public.questions for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "reviews_select_own" on public.reviews;
create policy "reviews_select_own"
on public.reviews for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own"
on public.reviews for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.questions
    where questions.id = reviews.question_id
      and questions.user_id = auth.uid()
  )
);

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own"
on public.reviews for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
on public.reports for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
on public.reports for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "knowledge_stats_select_own" on public.knowledge_stats;
create policy "knowledge_stats_select_own"
on public.knowledge_stats for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "knowledge_stats_insert_own" on public.knowledge_stats;
create policy "knowledge_stats_insert_own"
on public.knowledge_stats for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "knowledge_stats_update_own" on public.knowledge_stats;
create policy "knowledge_stats_update_own"
on public.knowledge_stats for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Storage bucket and policies for the configured bucket.
-- This bucket should be private. The client can upload only under:
-- users/{auth.uid()}/questions/{question_id}.{jpg|jpeg|png|webp}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-images',
  'question-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "question_images_select_own" on storage.objects;
create policy "question_images_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'question-images'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "question_images_insert_own" on storage.objects;
create policy "question_images_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'question-images'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (storage.foldername(name))[3] = 'questions'
);

drop policy if exists "question_images_update_own" on storage.objects;
create policy "question_images_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'question-images'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'question-images'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
);
