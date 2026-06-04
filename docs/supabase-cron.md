# Supabase Edge Functions and Cron

This project uses Supabase Edge Functions for scheduled backend jobs. The service role key is only set as a Supabase secret and must never be exposed to the browser.

## Deploy Edge Functions

Install and log in to the Supabase CLI, then deploy from the project root:

```bash
supabase functions deploy analyze-daily-questions --project-ref <project-ref>
supabase functions deploy generate-daily-report --project-ref <project-ref>
supabase functions deploy generate-weekly-report --project-ref <project-ref>
supabase functions deploy generate-monthly-report --project-ref <project-ref>
```

The function paths are:

```text
supabase/functions/analyze-daily-questions/index.ts
supabase/functions/generate-daily-report/index.ts
supabase/functions/generate-weekly-report/index.ts
supabase/functions/generate-monthly-report/index.ts
```

## Set Secrets

Set secrets in Supabase, not in client code:

```bash
supabase secrets set OPENAI_API_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set SUPABASE_STORAGE_BUCKET=...
supabase secrets set CRON_SECRET=...
```

Also set `NEXT_PUBLIC_SUPABASE_URL` if your Edge Function environment does not already expose `SUPABASE_URL`.

## Configure Cron

Use Supabase Dashboard Cron or SQL cron to call the deployed function URLs with the `x-cron-secret` header.

Schedules in Asia/Shanghai:

```text
Daily analysis:      0 22 * * *
Daily report:        5 22 * * *
Weekly report:       30 22 * * 0
Monthly report:      30 22 28-31 * *
```

The monthly function checks whether the provided date is the last day of the month, so it is safe to schedule it on days 28-31.

Example pg_cron SQL shape:

```sql
select cron.schedule(
  '11408-analyze-daily-questions',
  '0 22 * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.functions.supabase.co/analyze-daily-questions',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
  );
  $$
);
```

Create equivalent jobs for:

```text
https://<project-ref>.functions.supabase.co/generate-daily-report
https://<project-ref>.functions.supabase.co/generate-weekly-report
https://<project-ref>.functions.supabase.co/generate-monthly-report
```

## Manual Test

Run each function with the cron secret. The `date` body is optional and is useful for testing fixed ranges.

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

For a non-last-day monthly manual test:

```bash
curl -X POST 'https://<project-ref>.functions.supabase.co/generate-monthly-report' \
  -H 'x-cron-secret: <CRON_SECRET>' \
  -H 'content-type: application/json' \
  -d '{"date":"2026-06-04","force":true}'
```

## View Logs

```bash
supabase functions logs analyze-daily-questions --project-ref <project-ref>
supabase functions logs generate-daily-report --project-ref <project-ref>
supabase functions logs generate-weekly-report --project-ref <project-ref>
supabase functions logs generate-monthly-report --project-ref <project-ref>
```

Logs intentionally include job status, question ids, and user ids only when needed for debugging. They do not print full API keys, image content, notes, or question text.

## Common Errors

- `401 Unauthorized cron request`: `CRON_SECRET` is missing or the request header does not match.
- `Supabase service configuration is missing`: set `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`.
- `Question image could not be downloaded`: check `SUPABASE_STORAGE_BUCKET`, private bucket policies, and `image_path`.
- OpenAI status error: check `OPENAI_API_KEY`, model access, and project quota. The key is never printed.
- Duplicate report concerns: reports use `upsert` on `(user_id,type,start_date,end_date)`, so reruns update the same report.
- Duplicate review concerns: reviews use `upsert` on `(question_id,scheduled_date)`, so reruns do not duplicate schedules.
