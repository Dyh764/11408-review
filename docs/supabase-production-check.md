# Supabase 生产环境配置检查

本文档用于生产 Supabase 项目上线前逐项核对。所有真实密钥只在 Supabase Dashboard、Vercel Dashboard 或本机 `.env.local` 中配置，不写入仓库。

## Migration

在 Supabase SQL Editor 按顺序执行：

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_allow_profile_insert.sql
supabase/migrations/003_allow_question_image_delete.sql
supabase/migrations/004_allow_review_delete.sql
```

执行后确认以下表存在：

- `profiles`
- `questions`
- `reviews`
- `reports`
- `knowledge_stats`

## 表结构检查

`profiles`：

- 主键 `id` 引用 `auth.users(id)`。
- 默认 timezone 为 `Asia/Shanghai`。
- 新用户应能通过触发器或前端 `ensureProfile` 生成 profile。

`questions`：

- 包含 `user_id`、`subject`、`image_path`、`question_text_status`、`mastery_status`。
- `question_text_status` 支持 `ai_unverified`、`verified`、`needs_fix`。
- `image_path` 必须保存原题 Storage 路径。

`reviews`：

- 包含 `user_id`、`question_id`、`scheduled_date`、`completed_at`、`review_result`。
- 有唯一约束 `(question_id, scheduled_date)`，避免重复复习任务。

`reports`：

- 包含 `type`、`start_date`、`end_date`、`content_json`。
- 有唯一约束 `(user_id, type, start_date, end_date)`，避免重复报告。

`knowledge_stats`：

- 包含 `subject`、`chapter`、`knowledge_point`、`weakness_score`。
- 有唯一约束 `(user_id, subject, chapter, knowledge_point)`。

## RLS 检查

确认以下表开启 Row Level Security：

- `profiles`
- `questions`
- `reviews`
- `reports`
- `knowledge_stats`

必须满足：

- 用户只能 select 自己的 profile。
- 用户只能 select/insert/update/delete 自己的 questions。
- 用户只能 select/insert/update/delete 自己的 reviews。
- 用户只能 select 自己的 reports。
- 用户只能 select/insert/update 自己的 knowledge_stats。
- Edge Functions 使用 service role 执行计划任务，但仍不能把 service role key 暴露到浏览器。

建议用两个测试账号验证：

1. A 用户上传一题。
2. B 用户登录后不能在 `/questions`、`/review`、`/reports`、`/settings` 导出中看到 A 用户数据。
3. B 用户不能通过手动改 URL 访问 A 用户 `/questions/[id]`。

## Storage 检查

Bucket：

```text
question-images
```

生产要求：

- Public: off。
- File size limit: 10MB。
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`。
- 图片路径必须是 `users/{user_id}/questions/{question_id}.{jpg|png|webp}`。
- 用户只能读取、上传、更新、删除自己 `users/{auth.uid()}/questions/` 下的对象。

上传页和详情页不依赖本地文件系统。页面通过 Supabase signed URL 预览私有图片。

## Auth 检查

至少启用一种登录方式：

- Email/password。
- 或 email magic link。

生产域名上线后，检查：

- Site URL 是正式部署域名。
- Redirect URLs 包含正式部署域名和必要的预览域名。
- 手机 Safari / Chrome 登录后能回到原页面。

## Edge Functions secrets

在 Supabase Functions secrets 中配置：

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_STORAGE_BUCKET=question-images
OPENAI_API_KEY=<openai-api-key>
OPENAI_MODEL=gpt-4.1
CRON_SECRET=<long-random-secret>
```

规则：

- `SUPABASE_SERVICE_ROLE_KEY` 只存在 Supabase Edge Functions 环境。
- `OPENAI_API_KEY` 只存在服务端或 Edge Functions 环境。
- 日志中不能输出完整 key、题图内容、access token 或 refresh token。

## Cron 检查

需要配置并验证：

- `analyze-daily-questions`
- `generate-daily-report`
- `generate-weekly-report`
- `generate-monthly-report`

Cron 请求必须带：

```text
x-cron-secret: <CRON_SECRET>
```

也可以使用：

```text
Authorization: Bearer <CRON_SECRET>
```

函数中 `requireCronSecret(request)` 会校验以上两种方式。

## 简单 SQL 核对

上线前可在 SQL Editor 查看对象是否存在：

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'questions', 'reviews', 'reports', 'knowledge_stats')
order by table_name;
```

检查 RLS：

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'questions', 'reviews', 'reports', 'knowledge_stats');
```

检查 Storage bucket：

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'question-images';
```

检查唯一约束：

```sql
select conname
from pg_constraint
where conname in (
  'reviews_one_schedule_per_day',
  'reports_one_per_range',
  'knowledge_stats_unique_point'
);
```

