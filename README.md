# 11408 错题复盘助手

手机优先的 11408 考研错题复盘系统。核心流程是：手机拍题上传，保存原题图片和错题字段，生成复习计划，按日期复习，并从日报、周报、月报里查看薄弱点。

## 核心功能

- Supabase Auth 登录、注册、退出。
- 当前用户数据隔离：错题、复习、报告均依赖 RLS 读取自己的数据。
- 手机端拍题上传，保存到 private Supabase Storage。
- 上传前客户端图片压缩，压缩失败自动回退原图。
- `questions` 真实写入，保留 `image_path`。
- OpenAI 单题图片分析，未配置 `OPENAI_API_KEY` 时使用 mock fallback。
- 错题详情编辑：题干、核对状态、科目、章节、知识点、掌握状态、备注、错因、摘要、提醒。
- `verified` 题干重新分析时默认保留，只有明确允许才覆盖题目文字。
- 今日复习页显示今日、逾期数量，完成后调整后续复习计划。
- 错题库支持科目、掌握状态、题干核对状态、搜索和排序。
- 错题库支持基础批量管理：批量标记已掌握、批量标记 `needs_fix`、批量加入冲刺复习；不做批量删除。
- 报告页展示日报、周报、月报和历史报告，不直接裸显 JSON。
- 设置页支持查看登录邮箱、timezone、配置状态、数据导出和 PWA 安装说明。
- 数据导出支持 JSON、Markdown、CSV，仅导出当前登录用户自己的数据。
- 考前冲刺模式按复习后又错、仍不会、完全没思路、逾期、高危知识点和人工核对需求优先展示错题。
- PWA manifest，可添加到手机桌面。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth / Database / Storage / RLS
- Supabase Edge Functions 和 Cron
- OpenAI Responses API

## 本地运行

```bash
cd 11408-review
npm install
npm run dev
```

打开 `http://localhost:3000`。

验证：

```bash
npm run lint
npm run build
```

如果当前 Windows shell 没有 `npm` 或 `git`，先修复 PATH，或使用本机已有的 Node/npm 绝对路径运行同等命令。

## 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=question-images`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=question-images`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4.1`
- `CRON_SECRET`

不要提交 `.env.local`。`OPENAI_API_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY` 只能在服务端或 Edge Functions 使用，不能写入客户端代码。

## Supabase 设置

1. 创建 Supabase 项目。
2. 在 SQL Editor 中按顺序执行：
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_allow_profile_insert.sql`
   - `supabase/migrations/003_allow_question_image_delete.sql`
   - `supabase/migrations/004_allow_review_delete.sql`
3. 确认 `question-images` bucket 是 private。
4. Storage MIME types 使用 `image/jpeg`, `image/png`, `image/webp`。
5. 图片路径保持 `users/{user_id}/questions/{question_id}.{jpg|png|webp}`。
6. 确认 RLS policy 已启用，用户只能读写自己的 `questions`、`reviews`、`reports`。

## Edge Functions 和 Cron

Edge Functions 位于 `supabase/functions`：

- `analyze-daily-questions`
- `generate-daily-report`
- `generate-weekly-report`
- `generate-monthly-report`

部署后需要设置 Supabase secrets：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `CRON_SECRET`

Cron 设置参考 `docs/supabase-cron.md` 和 `docs/deployment.md`。

## 图片压缩策略

上传页使用 `lib/image/compress-image.ts` 在浏览器端压缩：

- 支持 jpg、jpeg、png、webp。
- 大于约 2MB 时尝试压缩。
- 最大宽度默认 1800px。
- JPEG 质量不低于 0.74，避免公式和题干糊掉。
- 压缩后不比原图小时使用原图。
- 压缩失败时使用原图上传。
- 页面显示原图大小、上传大小和压缩状态。

## 手机端使用流程

1. 手机浏览器打开站点并登录。
2. 进入“拍题”，拍摄或选择题目图片。
3. 查看预览，必要时点“放大查看题图”确认清晰。
4. 选择科目、掌握状态，写一句卡点。
5. 上传并保存错题。
6. 在“错题”里搜索、筛选、进入详情。
7. 在详情页编辑题干并把核对状态标为 `verified` 或 `needs_fix`。
8. 在“复习”里按四个结果按钮完成今日或逾期复习。
9. 在“报告”里查看日报、周报、月报和历史报告。
10. 考前进入 `/sprint`，优先处理最危险的题。
11. 进入 `/settings` 导出数据、保存 timezone 或退出登录。

手机端上线前请按 `docs/mobile-test-checklist.md` 验收。无法连接真实手机时，先用浏览器手机视口模拟；生产上线前仍需 iPhone Safari 和 Android Chrome 复测。

## 数据导出

入口：`/settings`。

导出格式：

- JSON：完整备份当前用户的 `questions`、`reviews`、`reports`、`knowledge_stats`。
- Markdown：按“科目 - 章节”分组，适合人工阅读。
- CSV：适合 Excel 查看，至少包含核心错题字段。

导出文件名包含日期，例如：

```text
11408-review-export-2026-06-04.json
11408-review-export-2026-06-04.md
11408-review-export-2026-06-04.csv
```

CSV 字段：

- `id`
- `subject`
- `chapter`
- `knowledge_point`
- `mastery_status`
- `question_text_status`
- `mistake_types`
- `user_note`
- `solution_summary`
- `one_sentence_tip`
- `created_at`

图片不会被打包进导出文件，但会保留 `image_path`。如果页面显示的是 signed URL，该 URL 可能过期，不能作为长期图片备份地址。

备份和恢复说明见 `docs/backup-and-restore.md`。当前版本只支持导出，不支持一键导入或完整自动恢复。

## 设置页

`/settings` 显示：

- 当前登录邮箱。
- timezone 设置，默认 `Asia/Shanghai`。
- Supabase 配置状态。
- OpenAI 配置状态。
- Storage bucket 配置状态。
- JSON / Markdown / CSV 数据导出入口。
- PWA 安装说明。
- 退出登录按钮。

设置页只显示配置是否存在，不显示 API Key、service role key、access token 或 refresh token。

## 考前冲刺模式

入口：`/sprint`。

冲刺模式优先展示：

- 复习后又错。
- 仍不会。
- 完全没思路。
- 逾期复习。
- `needs_manual_check`。
- `needs_fix`。
- 做对但不稳。
- 高危知识点。
- 超过 30 天仍未掌握。

每张卡片显示原题缩略图、危险原因、详情入口和“已掌握”按钮。标记已掌握会把题目更新为 `完全掌握`，降低复习优先级，并取消未完成的待复习任务。

## 部署验收

部署前按 `docs/production-checklist.md` 检查 Vercel 环境变量、Supabase URL 和 anon key、service role key 服务端使用、OpenAI API Key、Storage bucket、RLS、Edge Functions、Cron、手机端、PWA、数据导出和 `npm run lint` / `npm run build`。

## PWA

`public/manifest.json` 已配置：

- name: `11408 错题复盘助手`
- short_name: `11408 Review`
- display: `standalone`
- theme_color: `#2563eb`
- icon: `public/icon.svg`

手机添加到桌面：用移动端浏览器打开部署地址，登录后选择浏览器菜单里的“添加到主屏幕”或“安装应用”。当前不做复杂离线缓存，避免影响错题、复习和报告数据更新。

## 开发阶段说明

已完成阶段：

1. Supabase 登录和用户数据隔离。
2. 手机端拍题上传。
3. Storage 图片保存。
4. `questions` 写入。
5. `reviews` 复习计划。
6. 今日复习页。
7. OpenAI 单题图片分析和 mock fallback。
8. Edge Functions、Cron、日报、周报、月报。
9. `reports` 页面读取真实报告。
10. `knowledge_stats` 薄弱点统计。
11. 第五阶段手机体验、压缩、编辑、报告展示、PWA 和部署文档。
12. 第六阶段手机测试清单、数据导出、设置页、考前冲刺、批量管理、备份说明和生产验收清单。

未完成功能：

- 真实生产环境端到端验收。
- 更完整的自动化浏览器回归测试。
- 更细的图表组件和学习趋势分析。
- Next 16 `middleware.ts` 到 `proxy.ts` 的迁移。
- 一键导入 JSON 和完整自动恢复。

后续路线图：

- 第七阶段做真实生产环境端到端验收和 Vercel/Supabase/Cron 联调。
- 增加轻量趋势图和薄弱点变化。
- 增加错题编辑、导出、冲刺和批量操作的自动化浏览器回归测试。
- 评估 JSON 导入预检和 Storage 图片缺失检查。

## 开发约束

- 不做社交、排行、付费、题库市场、班级系统或复杂聊天。
- 不写死本地绝对路径或 Windows 路径。
- 不把 API Key 写进代码。
- 上传失败不能生成残缺数据。
- 错题编辑失败不能破坏原数据。
