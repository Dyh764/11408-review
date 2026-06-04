# Edge Functions 和 Cron 最终验收

本文档用于检查 Supabase Edge Functions、secrets、Cron 和报告生成任务。当前项目的函数代码位于 `supabase/functions/`。

## 函数清单

- `analyze-daily-questions`
- `generate-daily-report`
- `generate-weekly-report`
- `generate-monthly-report`

共享代码：

- `_shared/auth.ts`：校验 `CRON_SECRET`。
- `_shared/openai.ts`：OpenAI Responses API 调用、mock fallback、写入题目分析。
- `_shared/review-scheduler.ts`：生成复习计划。
- `_shared/report-utils.ts`：生成日报、周报、月报内容并 upsert。
- `_shared/weakness-score.ts`：更新薄弱点统计。
- `_shared/supabase-admin.ts`：创建 service role Supabase client。

## 部署函数

在已登录 Supabase CLI 的环境中运行：

```bash
supabase functions deploy analyze-daily-questions --project-ref <project-ref>
supabase functions deploy generate-daily-report --project-ref <project-ref>
supabase functions deploy generate-weekly-report --project-ref <project-ref>
supabase functions deploy generate-monthly-report --project-ref <project-ref>
```

## 设置 secrets

```bash
supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co --project-ref <project-ref>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key> --project-ref <project-ref>
supabase secrets set SUPABASE_STORAGE_BUCKET=question-images --project-ref <project-ref>
supabase secrets set OPENAI_API_KEY=<openai-api-key> --project-ref <project-ref>
supabase secrets set OPENAI_MODEL=gpt-4.1 --project-ref <project-ref>
supabase secrets set CRON_SECRET=<long-random-secret> --project-ref <project-ref>
```

不要把真实值写入 shell 历史以外的文件。团队协作时优先使用控制台 secrets 管理。

## 手动调用

所有手动调用都必须带 `x-cron-secret`。

```bash
curl -X POST 'https://<project-ref>.functions.supabase.co/analyze-daily-questions' \
  -H 'x-cron-secret: <CRON_SECRET>' \
  -H 'content-type: application/json' \
  -d '{"date":"2026-06-04"}'
```

```bash
curl -X POST 'https://<project-ref>.functions.supabase.co/generate-daily-report' \
  -H 'x-cron-secret: <CRON_SECRET>' \
  -H 'content-type: application/json' \
  -d '{"date":"2026-06-04"}'
```

```bash
curl -X POST 'https://<project-ref>.functions.supabase.co/generate-weekly-report' \
  -H 'x-cron-secret: <CRON_SECRET>' \
  -H 'content-type: application/json' \
  -d '{"date":"2026-06-07"}'
```

```bash
curl -X POST 'https://<project-ref>.functions.supabase.co/generate-monthly-report' \
  -H 'x-cron-secret: <CRON_SECRET>' \
  -H 'content-type: application/json' \
  -d '{"date":"2026-06-30"}'
```

月报函数默认只在月末生成。非月末测试可使用：

```bash
curl -X POST 'https://<project-ref>.functions.supabase.co/generate-monthly-report' \
  -H 'x-cron-secret: <CRON_SECRET>' \
  -H 'content-type: application/json' \
  -d '{"date":"2026-06-04","force":true}'
```

## 查看 logs

```bash
supabase functions logs analyze-daily-questions --project-ref <project-ref>
supabase functions logs generate-daily-report --project-ref <project-ref>
supabase functions logs generate-weekly-report --project-ref <project-ref>
supabase functions logs generate-monthly-report --project-ref <project-ref>
```

日志允许包含任务状态、计数、question id、user id。日志不能包含完整 API key、service role key、access token、refresh token、题图 base64 或完整题干。

## Cron 配置

建议计划：

```text
Daily analysis: 0 22 * * *
Daily report:   5 22 * * *
Weekly report:  30 22 * * 0
Monthly report: 30 22 28-31 * *
```

月报函数会判断是否月末，因此 28-31 日重复触发是安全的。

## 幂等和失败处理检查

代码检查结论：

- `requireCronSecret(request)` 校验 `x-cron-secret` 或 Bearer token。
- `analyze-daily-questions` 单条错题失败会记录到 `results`，不会中断整个批次。
- OpenAI 未配置时返回 mock fallback，不阻塞分析流程。
- OpenAI 返回无效 JSON 时会失败并记录单条错误，不写入无效结构。
- `writeQuestionAnalysis` 默认保留 `verified` 的 `question_text` 和 `question_text_status`。
- 初始复习计划使用 `(question_id, scheduled_date)` upsert，避免重复 reviews。
- 报告使用 `(user_id, type, start_date, end_date)` upsert，避免重复 reports。
- `knowledge_stats` 根据源数据重算后 upsert，避免盲目累加。

## 验证 Cron 是否执行

1. 在 Supabase Cron 或 pg_cron 控制台确认 job 状态。
2. 手动调用同一 function，确认返回 200。
3. 查看 function logs，确认有最近运行记录。
4. 在 `reports` 表查当天、当周或当月报告。
5. 在前端 `/reports` 刷新，确认当前用户能看到报告。

## 常见故障

| 现象 | 处理 |
| --- | --- |
| 401 Unauthorized cron request | 检查 `CRON_SECRET` 是否设置，header 是否正确。 |
| Supabase service configuration is missing | 检查 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`。 |
| Question image could not be downloaded | 检查 bucket、`image_path`、Storage policy。 |
| OpenAI request failed | 检查 API key、模型、额度和网络。缺 key 时应走 mock fallback。 |
| 报告重复 | 检查唯一约束 `reports_one_per_range` 是否存在，函数是否使用 upsert。 |
| reviews 重复 | 检查唯一约束 `reviews_one_schedule_per_day` 是否存在，函数是否使用 upsert。 |
## Stage 8 measured test record

Current status: keep this template until Supabase production secrets are configured.

| Function | Deploy time | Test command | HTTP status | Response summary | DB write | Idempotent | Error logs | Conclusion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `analyze-daily-questions` | To fill | `curl -X POST https://<project-ref>.functions.supabase.co/analyze-daily-questions -H 'x-cron-secret: <CRON_SECRET>' -H 'content-type: application/json' -d '{"date":"2026-06-04"}'` | To fill | To fill | To fill | To fill | To fill | Run after Supabase production secrets are configured. |
| `generate-daily-report` | To fill | `curl -X POST https://<project-ref>.functions.supabase.co/generate-daily-report -H 'x-cron-secret: <CRON_SECRET>' -H 'content-type: application/json' -d '{"date":"2026-06-04"}'` | To fill | To fill | To fill | To fill | To fill | Run after Supabase production secrets are configured. |
| `generate-weekly-report` | To fill | `curl -X POST https://<project-ref>.functions.supabase.co/generate-weekly-report -H 'x-cron-secret: <CRON_SECRET>' -H 'content-type: application/json' -d '{"date":"2026-06-07"}'` | To fill | To fill | To fill | To fill | To fill | Run after Supabase production secrets are configured. |
| `generate-monthly-report` | To fill | `curl -X POST https://<project-ref>.functions.supabase.co/generate-monthly-report -H 'x-cron-secret: <CRON_SECRET>' -H 'content-type: application/json' -d '{"date":"2026-06-30","force":true}'` | To fill | To fill | To fill | To fill | To fill | Run after Supabase production secrets are configured. |
