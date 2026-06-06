# 11408 错题复盘助手

手机优先的 11408 考研错题复盘工具。它面向个人长期使用：拍题上传、保存原题图片、记录卡点、生成复习计划、完成今日复习、查看报告、导出数据，并在考前按风险优先冲刺。

## 功能截图

当前仓库不提交真实用户截图。上线验收时建议补充以下截图到项目文档或发布说明：

- 首页和底部导航。
- 拍题上传和图片预览。
- 错题详情和题干编辑。
- 今日复习。
- 学习报告。
- 设置页导出。
- 考前冲刺模式。

## 核心功能

- Supabase Auth 登录、注册、退出。
- 未登录访问 `/upload`、`/review`、`/questions`、`/reports`、`/settings`、`/sprint` 会跳转登录页。
- 当前用户数据隔离，错题、复习、报告和导出都走 RLS。
- 手机拍题或相册上传，题图保存到 private Supabase Storage。
- 客户端图片压缩，压缩失败或压缩无收益时自动使用原图。
- 错题写入 `questions`，并保留 `image_path`。
- 上传后生成初始复习计划。
- AI 单题分析；未配置 `OPENAI_API_KEY` 时使用 mock fallback。
- `verified` 题干重新分析时默认保留，只有明确允许才覆盖题目文字。
- 今日复习写入复习结果，并按结果调整后续复习计划。
- 错题库筛选、搜索、排序和基础批量管理。
- 题目、答案、解析和关键步骤支持 `$...$` / `$$...$$` LaTeX 公式渲染。
- 错题详情支持软删除；删除后不再进入错题库、复习和报告统计，不会自动删除 Storage 图片。
- 报告页展示日报、周报、月报和历史报告。
- 设置页显示账号、timezone、配置状态、数据导出和 PWA 安装说明。
- 数据导出支持 JSON、Markdown、CSV，只导出当前用户数据。
- 考前冲刺模式按高危错题和薄弱知识点优先展示。
- PWA manifest 和移动端 metadata，可添加到手机桌面。

## 技术栈

- Next.js App Router。
- React。
- TypeScript。
- Tailwind CSS。
- KaTeX。
- Supabase Auth / Database / Storage / RLS。
- Supabase Edge Functions / Cron。
- OpenAI Responses API。
- Optional Gemini / DeepSeek learning analysis。

## 快速开始

```bash
cd 11408-review
npm install
cp .env.example .env.local
npm run dev
```

本地打开：

```text
http://localhost:3000
```

验证：

```bash
npm run lint
npm run build
```

Windows 本机如果出现 `Access is denied`，先确认 PATH 中包含可用 Node 20.9+ 目录。

## 环境变量

`.env.example` 使用占位符，不包含真实密钥。

前端可公开：

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=question-images
```

服务端或 Edge Functions：

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=question-images
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
CRON_SECRET=
```

安全要求：

- 不提交 `.env.local`。
- 不把真实 key 写入 README、docs 或源码。
- `OPENAI_API_KEY` 不能加 `NEXT_PUBLIC_`。
- `GEMINI_API_KEY` 和 `DEEPSEEK_API_KEY` 不能加 `NEXT_PUBLIC_`。
- `SUPABASE_SERVICE_ROLE_KEY` 只能放在 Supabase Edge Functions secrets。

## Supabase 设置

按顺序执行 migration：

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_allow_profile_insert.sql
supabase/migrations/003_allow_question_image_delete.sql
supabase/migrations/004_allow_review_delete.sql
supabase/migrations/005_add_question_delete_fields.sql
supabase/migrations/006_add_question_choices.sql
```

检查：

- `profiles`、`questions`、`reviews`、`reports`、`knowledge_stats` 已创建。
- `questions.deleted_at`、`questions.deleted_reason` 已创建；正常页面默认过滤已删除错题。
- `questions.choices` 已创建；选择题选项使用 JSON 数组保存。
- RLS 已开启，用户只能访问自己的数据。
- `question-images` bucket 为 private。
- Storage 路径为 `users/{user_id}/questions/{question_id}.{jpg|png|webp}`。
- Auth 已启用邮箱密码或 magic link。

详细检查见 `docs/supabase-production-check.md`。

## Vercel 部署

Vercel 导入 GitHub 仓库后：

- Framework Preset: `Next.js`。
- Install Command: 默认。
- Build Command: `npm run build`。
- Output Directory: 留空，使用 Next.js 默认输出。
- Node.js Version: Node 20.9+。

部署后检查：

- `/`
- `/login`
- `/upload`
- `/review`
- `/questions`
- `/reports`
- `/settings`
- `/sprint`
- `/manifest.json`

详细步骤见 `docs/vercel-final-deploy.md`。

## Edge Functions 和 Cron

函数目录：

```text
supabase/functions/analyze-daily-questions
supabase/functions/generate-daily-report
supabase/functions/generate-weekly-report
supabase/functions/generate-monthly-report
```

部署：

```bash
supabase functions deploy analyze-daily-questions --project-ref <project-ref>
supabase functions deploy generate-daily-report --project-ref <project-ref>
supabase functions deploy generate-weekly-report --project-ref <project-ref>
supabase functions deploy generate-monthly-report --project-ref <project-ref>
```

所有 Cron 请求必须带 `CRON_SECRET`。报告和复习计划都使用 upsert，避免重复生成。

详细验收见：

- `docs/supabase-cron.md`
- `docs/edge-functions-final-check.md`

## OpenAI API 配置

OpenAI 用于题图分析和错题字段补全。

```text
OPENAI_API_KEY=<openai-api-key>
OPENAI_MODEL=gpt-4.1
```

如果未配置 `OPENAI_API_KEY`：

- 页面不会白屏。
- 单题分析和 Edge Function 分析会使用 mock fallback。
- mock 结果会明确标记为 fallback，不伪装真实 AI 结果。

## AI Provider 配置

`AI_PROVIDER` 支持 `gemini`、`deepseek`、`none`。Gemini 和 DeepSeek 都是可选学习分析增强；未配置 key 时，上传、导入、查看答案、复习和报告仍可使用。配置方法见 `docs/ai-provider.md`。

## 手机端使用流程

1. 手机浏览器打开站点并登录。
2. 进入“拍题”，拍摄或选择题图。
3. 确认预览清晰。
4. 选择科目和掌握状态。
5. 写一句卡点备注。
6. 保存错题。
7. 在“错题”里查看详情，核对题目文字。
8. 数学公式请使用 LaTeX：行内 `$...$`，块级 `$$...$$`。
9. 点击 AI 分析或使用 mock fallback。
10. 在“复习”里完成今日或逾期任务。
11. 在“报告”里查看日报、周报、月报。
12. 考前进入“冲刺”处理高危题。
13. 在“设置”里导出 JSON、Markdown 或 CSV。

普通用户说明见 `docs/user-guide.md`。

## 数据导出和备份

入口：`/settings`。

格式：

- JSON：完整备份当前用户核心数据。
- Markdown：按科目和章节分组，适合阅读。
- CSV：适合 Excel 查看核心错题字段。

导出包含：

- `questions`
- `reviews`
- `reports`
- `knowledge_stats`

图片不会打包进导出文件，只保留 `image_path`。备份说明见 `docs/backup-and-restore.md`。

已软删除的错题默认不会进入导出文件。

## 文档目录

- `docs/vercel-final-deploy.md`：Vercel 最终部署说明。
- `docs/supabase-production-check.md`：Supabase 生产配置检查。
- `docs/edge-functions-final-check.md`：Edge Functions 和 Cron 最终验收。
- `docs/user-guide.md`：普通用户使用手册。
- `docs/developer-guide.md`：开发者维护手册。
- `docs/real-device-acceptance.md`：真实设备验收记录。
- `docs/final-acceptance-report.md`：最终验收报告。
- `docs/known-issues.md`：已知问题。
- `docs/production-checklist.md`：生产部署验收清单。
- `docs/mobile-test-checklist.md`：手机端测试清单。
- `docs/backup-and-restore.md`：数据备份说明。
- `docs/supabase-cron.md`：Supabase Cron 操作参考。
- `docs/deployment.md`：早期部署说明。

## 当前限制

- 真实生产环境端到端验收需要部署后完成。
- iPhone Safari 和 Android Chrome 真机测试需要用户执行。
- 当前版本只支持导出，不支持一键导入恢复。
- 当前 PWA 不做复杂离线缓存。
- 不提供社交、付费、题库市场、班级系统、排行榜或 AI 聊天室。

## 后续路线图

- 完成 Vercel 生产部署和 Supabase 生产验收。
- 完成真实手机 Safari / Chrome 实测。
- 增加 Playwright 冒烟测试覆盖核心页面。
- 评估 JSON 导入预检和 Storage 图片缺失检查。
- 增加轻量趋势图和薄弱点变化展示。
## Stage 8 production readiness

Production readiness checks added in this phase:

```bash
npm run lint
npm run build
npm run test:e2e
```

Playwright first-time setup, if browsers are missing:

```bash
node ./node_modules/@playwright/test/cli.js install chromium
```

This project also supports using an already running local server:

```bash
E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

When `E2E_BASE_URL` is not set, Playwright starts or reuses a local server at `http://127.0.0.1:3000`.

Production smoke test, after Vercel deployment:

```bash
E2E_BASE_URL=https://your-app.vercel.app npm run test:e2e
```

Windows PowerShell:

```powershell
$env:E2E_BASE_URL="https://your-app.vercel.app"; npm run test:e2e
```

Production config check entrypoints:

- Page: `/settings/system-check`
- JSON API: `/api/settings/system-check`

Both entrypoints are designed to show only configured/missing status and masked values. Do not put real API keys in source code, docs, screenshots, or test fixtures.
