alter table public.questions
  add column if not exists source_info jsonb null;

comment on column public.questions.source_info is
  '题源信息 JSON，例如练习册、模拟卷、真题、AI生成或未标来源；不同于 source 录入方式枚举。';

update public.questions
set source_info = jsonb_build_object(
  'type', '未标来源',
  'name', '未标来源',
  'section', '',
  'volume', '',
  'paper', '',
  'page', '',
  'problem_number', '',
  'raw', '未标来源'
)
where source_info is null;
