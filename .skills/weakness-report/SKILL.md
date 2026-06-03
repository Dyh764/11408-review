---
name: weakness-report
description: Generate daily, weekly, and monthly weakness reports.
---

# Weakness Report Skill

## When To Trigger

Use this when creating report content or changing weakness-score logic.

## Input Format

```json
{
  "type": "weekly",
  "start_date": "2026-06-01",
  "end_date": "2026-06-07",
  "user_id": "<uuid>"
}
```

## Output Format

```json
{
  "summary": {},
  "weakest_knowledge_points": [],
  "frequent_mistake_types": [],
  "next_actions": []
}
```

## Rules

- Do not only count questions.
- Calculate `weakness_score`.
- Include weakest knowledge points Top 10.
- Include frequent mistake types.
- Include concrete next review suggestions.

## Forbidden

- Do not produce generic encouragement-only reports.
- Do not mix data from different users.
