---
name: review-scheduler
description: Generate review dates from mastery status and review results.
---

# Review Scheduler Skill

## When To Trigger

Use this when creating initial review plans or adjusting future reviews after a user marks a review result.

## Input Format

```json
{
  "mastery_status": "完全没思路",
  "review_result": "wrong_again",
  "base_date": "2026-06-03"
}
```

## Output Format

```json
{
  "scheduled_dates": ["2026-06-04", "2026-06-06", "2026-06-10"],
  "priority": "high"
}
```

## Rules

- `完全没思路` gets the highest review frequency.
- `计算错误` gets a lower frequency than conceptual failures.
- `复习后又错` increases priority and increments repeated wrong counts.
- `已掌握` lowers priority.
- `完全掌握` should not receive excessive tasks.

## Forbidden

- Do not create duplicate review tasks for the same question and date.
- Do not erase historical review records.
