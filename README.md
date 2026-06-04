# 11408-review

手机优先的 11408 错题复盘系统 MVP。

当前目标是留下一个可继续开发、可验收的基础版本：Next.js App Router、TypeScript、Tailwind、Supabase SSR Auth、schema/RLS migration、手机端 PWA 页面、真实登录、真实图片上传、`questions` 写入、真实 review scheduler、单题 OpenAI 分析和 mock fallback。

## 当前范围

已包含：

- 手机端 Dashboard
- 拍题上传页
- 今日复习页
- 错题库页
- 错题详情页
- 报告页
- Supabase email/password 登录、注册、退出
- 首次登录 profile 创建/补齐
- 图片上传到 Supabase Storage
- 上传后写入 `questions` 表
- `/questions` 读取当前用户自己的错题
- 上传错题后按掌握状态生成 `reviews` 复习计划
- `/review` 读取今天及以前未完成的 `reviews`
- 复习结果会完成当前 review，并按结果调整后续计划
- `/questions/[id]` 可点击分析或重新分析
- OpenAI Responses API 单题图片分析
- AI 输出 schema 校验
- 无 `OPENAI_API_KEY` 时使用 mock fallback
- Supabase schema / RLS migration
- Supabase Storage bucket policy SQL
- `.skills` 规则文件
- `AGENTS.md`
- `.env.example`

暂未包含：

- Supabase Edge Functions
- Supabase Cron
- 复杂报告系统
- 真实周报/月报自动生成

## 本地运行

当前环境如果没有 npm，需要先安装 Node.js/npm 或修复 PATH。依赖可用后运行：

```bash
cd 11408-review
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

验证：

```bash
npm run lint
npm run build
```

## 环境变量

复制 `.env.example` 为 `.env.local`，再填入真实值：

```bash
cp .env.example .env.local
```

必需变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `CRON_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

`OPENAI_API_KEY` 只在服务端 API route 中读取，缺失不会阻塞页面、登录、上传或分析按钮；系统会自动使用 mock fallback。浏览器端上传默认使用 `question-images` bucket；如果改 bucket 名，需同步设置 `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` 和 `SUPABASE_STORAGE_BUCKET`。

`.env.local` 示例：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=question-images
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=question-images
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1
CRON_SECRET=replace-with-random-secret
```

不要把 `.env.local` 提交到 git。

## Supabase 设置

1. 创建 Supabase 项目。
2. 在 SQL Editor 中按顺序执行：

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_allow_profile_insert.sql
supabase/migrations/003_allow_question_image_delete.sql
supabase/migrations/004_allow_review_delete.sql
```

3. 确认 `question-images` bucket 是 private。
4. 如果没有通过 migration 自动创建 bucket，在 Supabase Dashboard 手动创建：

- Name: `question-images`
- Public bucket: off
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- File size limit: `10485760`

5. 图片路径必须使用：

```text
users/{user_id}/questions/{question_id}.jpg
```

6. 客户端只能使用 anon key，服务端和 Edge Functions 才能使用 service role key。

## 第二阶段行为

- 未登录访问 `/upload`、`/questions`、`/questions/[id]`、`/review`、`/reports` 会跳转 `/login`。
- 如果 Supabase 环境变量缺失，页面不会白屏；上传、题库、详情、复习页会显示配置提示。
- `/upload` 保存时先上传图片，再写入 `questions`。如果数据库写入失败，会尝试删除刚上传的图片。
- `/questions` 和 `/review` 只通过当前登录用户的 RLS 视图读取数据，不使用 service role key。

## 第三阶段行为

- `/upload` 保存 question 后调用 `lib/review-scheduler.ts` 生成初始 `reviews`。
- 如果 review 计划写入失败，question 和图片不会被删除，页面会提示“错题已保存，但复习计划生成失败”。
- `/review` 读取 `scheduled_date <= 今天` 且 `completed_at is null` 的 reviews，按 scheduled_date 升序显示。
- 逾期任务会显示“已逾期”。
- 点击复习结果会写入 `completed_at` 和 `review_result`。
- `still_wrong` 会重新安排第 1、3、7 天。
- `wrong_again` 会重新安排第 1、3、7、14 天，并把 question 优先级提高到 high。
- `mastered` 会把 question 降为 low / 完全掌握，并删除未来未完成高频 reviews。
- `improved` 只完成当前 review，保留后续计划。
- `/questions/[id]` 的“分析这道题/重新分析”按钮调用 `/api/questions/[id]/analyze`。
- 服务端会先通过当前登录用户的 RLS 读取 question，用户不能分析别人的题。
- 有 `OPENAI_API_KEY` 时，服务端从 Storage 下载原图，调用 OpenAI Responses API，并要求 Structured JSON。
- 没有 `OPENAI_API_KEY` 时，服务端使用 `lib/mock-ai.ts` 生成 mock fallback，并返回 `source: "mock"`。
- 如果 AI 输出不符合 schema，不写入原始 AI 内容，回退为 `needs_fix` 安全结果。

## Mock AI 流程

`lib/mock-ai.ts` 提供 `createMockAnalysis`，输入：

- `subject`
- `mastery_status`
- `user_note`
- `imagePreview`

输出字段对齐后续 OpenAI Responses API structured JSON：

- `question_text`
- `question_text_status`
- `subject`
- `chapter`
- `knowledge_point`
- `mistake_types`
- `solution_summary`
- `one_sentence_tip`
- `review_priority`
- `confidence`
- `needs_manual_check`

## 测试 AI 分析

测试 mock fallback：

1. 不配置 `OPENAI_API_KEY`。
2. 登录后上传一张题目图片。
3. 进入 `/questions/[id]`。
4. 点击“分析这道题”或“重新分析”。
5. 页面应显示 `source: mock`，并且不会白屏。

测试真实 OpenAI：

1. 在 `.env.local` 填写 `OPENAI_API_KEY`。
2. 可选设置 `OPENAI_MODEL=gpt-4.1`。
3. 重启 `npm run dev`。
4. 进入 `/questions/[id]` 点击“重新分析”。
5. 成功后 `questions` 表会更新题目文字、知识点、错因、摘要、提醒、优先级、置信度和 `analyzed_at`。

真实 OpenAI 分析不会在客户端暴露 API Key。

## 第四阶段 TODO

1. 用真实 Supabase + OpenAI Key 做端到端验收。
2. 给 review scheduler 增加单元测试。
3. 复习结果写入后精细更新 `knowledge_stats`。
4. 实现每日分析 Edge Function 基础版。
5. 实现简单日报生成。
6. 将 `middleware.ts` 迁移为 Next 16 推荐的 `proxy.ts`。

## 开发约束

- 不要只保存 OCR 文本。
- 不要把 API Key 写进代码。
- 不要让 AI 编造看不清的题目条件。
- 不要扩展社交、排行、付费、复杂聊天或题库市场。
- 每次改动后运行 `npm run lint` 和 `npm run build`。
