# 11408-review

手机优先的 11408 错题复盘系统 MVP 第一阶段。

当前目标是留下一个可继续开发、可验收的基础版本：Next.js App Router、TypeScript、Tailwind、Supabase SSR Auth、schema/RLS migration、手机端 PWA 页面、真实登录、真实图片上传、`questions` 写入和 mock AI 分析流程。

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
- `/review` 基于当前用户 `questions` 显示基础复盘列表，并写入基础 `reviews`
- mock AI 错题卡生成并写入 `questions`
- Supabase schema / RLS migration
- Supabase Storage bucket policy SQL
- `.skills` 规则文件
- `AGENTS.md`
- `.env.example`

暂未包含：

- 真实 OpenAI Responses API 接入
- Supabase Edge Functions
- Supabase Cron
- 复杂报告系统
- 完整 review scheduler

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

`OPENAI_API_KEY` 当前不会被读取，缺失不会阻塞页面、登录或上传。浏览器端上传默认使用 `question-images` bucket；如果改 bucket 名，需同步设置 `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` 和 `SUPABASE_STORAGE_BUCKET`。

`.env.local` 示例：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=question-images
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=question-images
OPENAI_API_KEY=
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

## 第二天继续开发 TODO

1. 用真实 Supabase 项目手动验收注册、登录、上传和详情页。
2. 增加 review scheduler 工具函数和单元测试。
3. 根据掌握状态生成初始 `reviews` 计划。
4. 在复习结果写入后更新 `knowledge_stats`。
5. 接入 OpenAI Responses API，使用结构化输出并校验 schema。
6. 实现每日分析 Edge Function 的基础版。
7. 将 `middleware.ts` 迁移为 Next 16 推荐的 `proxy.ts`。

## 开发约束

- 不要只保存 OCR 文本。
- 不要把 API Key 写进代码。
- 不要让 AI 编造看不清的题目条件。
- 不要扩展社交、排行、付费、复杂聊天或题库市场。
- 每次改动后运行 `npm run lint` 和 `npm run build`。
