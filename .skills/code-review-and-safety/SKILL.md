---
name: code-review-and-safety
description: Review code quality, data isolation, secret handling, and mobile MVP safety.
---

# Code Review And Safety Skill

## When To Trigger

Use this before marking work complete, before merging, or before expanding backend behavior.

## Input Format

Provide the changed files, verification commands, and known limitations.

## Output Format

Return findings ordered by risk, then test gaps and next actions.

## Rules

- Check that API keys are not leaked.
- Check RLS policies.
- Check Storage permissions.
- Check Cron secret validation when cron exists.
- Check per-user data isolation.
- Check duplicate task prevention.
- Check mobile upload experience.
- Check error handling.

## Forbidden

- Do not approve code without verification evidence.
- Do not ignore failing lint or build output.
