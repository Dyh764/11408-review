# 11408-review

手机优先的 11408 错题复盘系统 MVP 第一阶段。

今晚版本的目标是留下一个可继续开发、可验收的基础版本：Next.js App Router、TypeScript、Tailwind、Supabase SSR Auth 骨架、schema/RLS migration、手机端 PWA 原型和 mock AI 分析流程。

## 当前范围

已包含：

- 手机端 Dashboard
- 拍题上传页
- 今日复习页
- 错题库页
- 报告页
- mock AI 错题卡生成
- Supabase schema / RLS migration
- Supabase Storage bucket policy SQL
- `.skills` 规则文件
- `AGENTS.md`
- `.env.example`

暂未包含：

- 真实 OpenAI Responses API 接入
- 真实 Supabase Storage 上传
- 真实 questions/reviews 数据写入
- Supabase Edge Functions
- Supabase Cron
- 复杂报告系统

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
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `CRON_SECRET`
- `OPENAI_API_KEY`

MVP 第一阶段不会读取 `OPENAI_API_KEY`，缺失不会阻塞 mock 页面。

## Supabase 设置

1. 创建 Supabase 项目。
2. 在 SQL Editor 中执行 `supabase/migrations/001_initial_schema.sql`。
3. 确认 `question-images` bucket 是 private。
4. 图片路径必须使用：

```text
users/{user_id}/questions/{question_id}.jpg
```

5. 真实上传功能接入时，客户端只能使用 anon key，服务端和 Edge Functions 才能使用 service role key。

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

1. 修复本机 npm/git 环境，确保可安装依赖和提交。
2. 用 Supabase 项目实际环境变量运行页面。
3. 接入 Supabase Auth 登录页和 profile 初始化验证。
4. 接入真实 Storage 上传，保留 `image_path`。
5. 把 `/upload` 保存动作改为写入 `questions` 表。
6. 增加 review scheduler 工具函数和单元测试。
7. 接入 OpenAI Responses API，使用结构化输出并校验 schema。
8. 实现每日分析 Edge Function 的基础版。

## 开发约束

- 不要只保存 OCR 文本。
- 不要把 API Key 写进代码。
- 不要让 AI 编造看不清的题目条件。
- 不要扩展社交、排行、付费、复杂聊天或题库市场。
- 每次改动后运行 `npm run lint` 和 `npm run build`。
