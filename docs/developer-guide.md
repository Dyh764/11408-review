# 开发者维护手册

本文档面向后续维护者，用于理解项目结构、环境变量、Supabase、Edge Functions、复习调度、报告生成和常见故障处理。

## 项目结构

```text
app/                         Next.js App Router 页面和 API route
components/                  复用 UI 组件
lib/                         前端和服务端共享业务逻辑
lib/ai/                      单题分析、schema、prompt、分析写入保护
lib/export/                  JSON / Markdown / CSV 导出
lib/image/                   浏览器图片压缩
lib/questions/               错题编辑 payload 处理
lib/sprint/                  考前冲刺排序逻辑
lib/supabase/                浏览器和服务端 Supabase client
supabase/migrations/         数据库、RLS、Storage policy
supabase/functions/          Supabase Edge Functions
docs/                        部署、验收、用户和维护文档
public/                      PWA manifest 和图标
```

## 技术栈

- Next.js App Router。
- React。
- TypeScript。
- Tailwind CSS。
- Supabase Auth / Database / Storage / RLS。
- Supabase Edge Functions。
- OpenAI Responses API。

## 环境变量

本地 `.env.local` 可参考 `.env.example`。

前端可公开：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET
```

服务端或 Edge Functions：

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
OPENAI_API_KEY
OPENAI_MODEL
CRON_SECRET
```

规则：

- `SUPABASE_SERVICE_ROLE_KEY` 只能用于 Edge Functions，不进入浏览器。
- `OPENAI_API_KEY` 不能加 `NEXT_PUBLIC_`。
- 页面展示配置状态时只显示是否存在，不显示真实值。

## 本地启动

```bash
npm install
npm run dev
```

验证：

```bash
npm run lint
npm run build
```

Windows 如果出现 `Access is denied`，优先确认 PATH 中是否包含可用 Node 20.9+ 目录。

## Supabase migration

按顺序执行：

```text
001_initial_schema.sql
002_allow_profile_insert.sql
003_allow_question_image_delete.sql
004_allow_review_delete.sql
```

核心表：

- `profiles`
- `questions`
- `reviews`
- `reports`
- `knowledge_stats`

重要唯一约束：

- `reviews_one_schedule_per_day`：`(question_id, scheduled_date)`。
- `reports_one_per_range`：`(user_id, type, start_date, end_date)`。
- `knowledge_stats_unique_point`：`(user_id, subject, chapter, knowledge_point)`。

## Storage policy

Bucket: `question-images`。

生产要求：

- private bucket。
- MIME types: `image/jpeg`, `image/png`, `image/webp`。
- 路径：`users/{user_id}/questions/{question_id}.{ext}`。

客户端上传在 `app/upload/page.tsx`，路径由当前登录用户 id 和本地生成的 `questionId` 组成。

## RLS 策略

所有核心表都启用 RLS。普通用户只能访问自己的数据：

- `profiles.id = auth.uid()`。
- `questions.user_id = auth.uid()`。
- `reviews.user_id = auth.uid()`，插入 reviews 时还要确认 question 属于当前用户。
- `reports.user_id = auth.uid()`。
- `knowledge_stats.user_id = auth.uid()`。

前端查询仍显式加 `.eq("user_id", user.id)`，但安全边界以 RLS 为准。

## Edge Functions

函数：

- `analyze-daily-questions`：扫描未分析错题，分析、写回、生成复习计划、更新薄弱点。
- `generate-daily-report`：生成日报。
- `generate-weekly-report`：生成周报。
- `generate-monthly-report`：生成月报。

所有函数入口先调用 `requireCronSecret(request)`。未提供或不匹配 `CRON_SECRET` 时返回 401。

## Cron

建议：

```text
Daily analysis: 0 22 * * *
Daily report:   5 22 * * *
Weekly report:  30 22 * * 0
Monthly report: 30 22 28-31 * *
```

月报函数默认只在月末生成，测试时可传 `force: true`。

## OpenAI 分析逻辑

前端单题分析：

- API route: `app/api/questions/[id]/analyze/route.ts`。
- 服务：`lib/ai/analyze-question.ts`。
- Prompt: `lib/ai/prompts/analyze-question.ts`。
- Schema: `lib/ai/schema.ts`。
- 写入保护：`lib/ai/analysis-update.ts`。

Edge Function 批量分析：

- `supabase/functions/_shared/openai.ts`。

保护规则：

- 未配置 `OPENAI_API_KEY` 时使用 mock fallback。
- OpenAI 输出必须通过结构校验。
- `verified` 题干默认不被覆盖。
- 日志不输出密钥和完整图片内容。

## review scheduler

核心文件：

- 前端/Next: `lib/review-scheduler.ts`。
- Edge Functions: `supabase/functions/_shared/review-scheduler.ts`。

原则：

- 上传后生成初始复习计划。
- 完成复习后按 `still_wrong`、`improved`、`mastered`、`wrong_again` 调整。
- 用 `upsert(..., { onConflict: "question_id,scheduled_date" })` 防止重复计划。
- `mastered` 会降低优先级并取消未完成高频任务。

## weakness_score

来源：

- 错题掌握状态。
- 复习结果。
- 逾期情况。
- 重复错误次数。

`knowledge_stats` 不应盲目累加。当前实现从源数据重算并 upsert 到 `(user_id, subject, chapter, knowledge_point)`。

## reports 生成逻辑

Edge Functions 读取：

- 当前周期新增 questions。
- 当前周期 scheduled/completed reviews。
- 当前用户 knowledge_stats。

然后生成：

- summary。
- subject_distribution。
- frequent_mistake_types。
- weakest_knowledge_points。
- repeated_wrong_knowledge_points。
- next_actions。

写入 `reports` 时使用 `(user_id, type, start_date, end_date)` upsert。

## 如何新增页面

1. 在 `app/<route>/page.tsx` 新增页面。
2. 如果是保护页，把 route 加入 `proxy.ts` 的 `protectedRoutes`。
3. 使用 `createClient()` 读取 Supabase。
4. 无 Supabase env 时显示提示，不白屏。
5. 查询当前用户数据时显式校验 `auth.getUser()`。
6. 如需底部导航入口，更新 `components/bottom-nav.tsx`。
7. 运行 `npm run lint` 和 `npm run build`。

## 常见错误排查

| 现象 | 优先排查 |
| --- | --- |
| 无 env 白屏 | 页面是否对 `createClient()` 返回 null 做了提示。 |
| 未登录仍可访问保护页 | `proxy.ts` 是否包含该 route，Supabase env 是否配置。 |
| 上传失败 | 用户登录、bucket、MIME、Storage policy、路径格式。 |
| questions 写入失败 | RLS、必填字段、subject/mastery check constraint。 |
| reviews 重复 | 唯一约束和 upsert onConflict。 |
| AI 分析失败 | OPENAI_API_KEY、模型、schema 校验、Storage 下载。 |
| verified 题干被覆盖 | 检查 `allowOverwriteQuestionText` 是否被错误传 true。 |
| 报告空 | Cron、Edge secrets、reports 表、当前用户是否有周期数据。 |
| 导出失败 | 当前用户、四张表的 select 权限、RLS。 |
| 冲刺模式无数据异常 | `buildSprintItems` 输入是否允许空数组。 |

## 安全升级依赖

1. 查看当前 `package.json` 和 `package-lock.json`。
2. 小范围升级，不一次性升级大量依赖。
3. 先本地运行 `npm install`。
4. 运行 `npm run lint`。
5. 运行 `npm run build`。
6. 对登录、上传、复习、详情、报告、设置、冲刺做浏览器冒烟检查。
7. 如果 Next 主版本变更，优先阅读官方迁移文档。

