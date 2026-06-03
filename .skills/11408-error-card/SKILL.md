---
name: 11408-error-card
description: Generate a structured 11408 wrong-question card from an original image, user note, and mastery status.
---

# 11408 Error Card Skill

## When To Trigger

Use this when generating or reviewing the AI-created wrong-question card for a saved question.

## Input Format

```json
{
  "image_path": "users/<user_id>/questions/<question_id>.jpg",
  "subject": "数据结构",
  "mastery_status": "思路对但卡住",
  "user_note": "递归边界没想清楚"
}
```

## Output Format

Return JSON only:

```json
{
  "question_text": "",
  "question_text_status": "ai_unverified",
  "subject": "",
  "chapter": "",
  "knowledge_point": "",
  "mistake_types": [],
  "solution_summary": "",
  "one_sentence_tip": "",
  "review_priority": "medium",
  "confidence": "medium",
  "needs_manual_check": true
}
```

## Rules

- The original image is the source of truth.
- Preserve `image_path`.
- Default `question_text_status` to `ai_unverified`.
- Mark unclear images as `needs_fix` and `needs_manual_check`.
- Do not invent unreadable question conditions.
- Output valid JSON only.

## Forbidden

- Do not replace the original image with OCR text.
- Do not output Markdown.
- Do not hide low confidence.
