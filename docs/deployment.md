# 部署到 Vercel

本文档用于把 `11408-review` 部署到 Vercel，并连接 Supabase、Storage、Edge Functions、Cron 和 OpenAI 分析。

## 1. Vercel 部署

1. 将仓库推送到 GitHub。
2. 在 Vercel 新建项目，选择该仓库。
3. Framework Preset 选择 Next.js。
4. Build Command 使用 `npm run build`。
5. Output Directory 保持默认。
6. 在 Environment Variables 中配置下方变量。
7. 部署完成后打开 Vercel 生成的域名测试登录和上传。

代码不能依赖本地绝对路径，也不要写死 Windows 路径。所有部署差异都通过环境变量配置。

## 2. 环境变量

Vercel 需要：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=question-images`
- `SUPABASE_STORAGE_BUCKET=question-images`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4.1`

Supabase Edge Functions 需要：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=question-images`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4.1`
- `CRON_SECRET`

不要把 `OPENAI_API_KEY` 或 `SUPABASE_SERVICE_ROLE_KEY` 写入源码、README 示例真实值、日志或客户端环境变量。

## 3. 连接 Supabase

1. 创建 Supabase 项目。
2. 复制 Project URL 到 `NEXT_PUBLIC_SUPABASE_URL`。
3. 复制 anon public key 到 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
4. 在 SQL Editor 执行 `supabase/migrations` 下的 migration。
5. 确认 Auth 支持 email/password 登录。
6. 确认 `questions`、`reviews`、`reports`、`knowledge_stats` 已启用 RLS。

## 4. Storage Bucket

Bucket:

- Name: `question-images`
- Public: off
- File size limit: 10MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

路径约定：

```text
users/{user_id}/questions/{question_id}.{jpg|png|webp}
```

客户端只上传到当前用户自己的路径。详情页和列表页通过 signed URL 预览图片。

## 5. Edge Functions

使用 Supabase CLI 登录后，在项目根目录执行：

```bash
supabase functions deploy analyze-daily-questions
supabase functions deploy generate-daily-report
supabase functions deploy generate-weekly-report
supabase functions deploy generate-monthly-report
```

设置 secrets：

```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set SUPABASE_STORAGE_BUCKET=question-images
supabase secrets set OPENAI_API_KEY=...
supabase secrets set OPENAI_MODEL=gpt-4.1
supabase secrets set CRON_SECRET=...
```

## 6. Cron

参考 `docs/supabase-cron.md` 配置计划任务。

建议：

- 每天运行 `analyze-daily-questions`。
- 每天运行 `generate-daily-report`。
- 每周运行 `generate-weekly-report`。
- 每月运行 `generate-monthly-report`。

Cron 请求必须带 `CRON_SECRET`，避免未授权调用。

## 7. 测试上传

1. 打开 Vercel 部署地址。
2. 注册或登录。
3. 进入 `/upload`。
4. 拍摄或选择 jpg/png/webp 题图。
5. 确认页面显示预览、原图大小、上传大小和压缩状态。
6. 点击“上传并保存错题”。
7. 在 Supabase Storage 确认文件位于当前用户路径下。
8. 在 `questions` 表确认 `image_path`、`subject`、`mastery_status`、`question_text_status` 写入。

## 8. 测试 OpenAI 分析

1. 确认 Vercel 或 Supabase Functions 已配置 `OPENAI_API_KEY`。
2. 上传一张题图。
3. 进入 `/questions/[id]`。
4. 点击“分析这道题”或“重新分析”。
5. 成功后确认 `chapter`、`knowledge_point`、`mistake_types`、`solution_summary`、`one_sentence_tip` 更新。
6. 如果题干已标为 `verified`，重新分析默认不覆盖题目文字。

## 9. 常见错误

- 页面提示 Supabase 未配置：检查 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
- 上传失败：检查 bucket 名、MIME type、file size limit 和 Storage policy。
- 数据库写入失败：检查 RLS policy 和 `questions_image_path_owner` 约束。
- 分析失败：检查 `OPENAI_API_KEY`、模型名和 Storage 下载权限。
- 报告为空：检查 Edge Functions secrets、Cron 是否执行、`reports` 表是否有当前用户数据。
- Vercel build 失败：先本地运行 `npm run lint` 和 `npm run build`，确认没有把本地绝对路径或 secret 写入代码。
- 缺少 `.env.local`：页面应显示友好提示，不应白屏；真实上传和读取会被禁用。
