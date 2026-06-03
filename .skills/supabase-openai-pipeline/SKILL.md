---
name: supabase-openai-pipeline
description: Govern image upload, database writes, OpenAI analysis, cron jobs, and report generation.
---

# Supabase OpenAI Pipeline Skill

## When To Trigger

Use this when touching upload, Storage, database writes, OpenAI Responses API calls, Edge Functions, cron jobs, or report generation.

## Input Format

```json
{
  "question_id": "<uuid>",
  "image_path": "users/<user_id>/questions/<question_id>.jpg",
  "subject": "操作系统",
  "mastery_status": "有一点思路",
  "user_note": "PV 操作顺序混乱"
}
```

## Output Format

Return a validated operation result with explicit success or failure state.

## Rules

- Store images in Supabase Storage before writing analysis results.
- Database records must bind to `image_path`.
- OpenAI failure must not delete the original question.
- Scheduled tasks must be idempotent.
- Validate AI JSON schema before writing to database.

## Forbidden

- Do not expose `OPENAI_API_KEY` to the client.
- Do not mutate `image_path` during analysis.
- Do not generate duplicate reports for the same range.
