# ChatGPT Import And Mobile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ChatGPT JSON wrong-question-card import flow, allow text-only questions with nullable images, and improve the mobile workflow without breaking existing upload, review, report, settings, export, or system-check behavior.

**Architecture:** Keep the database change minimal: `questions.image_path` becomes nullable, the owner constraint still applies when present, and a lightweight `source` field records upload/import provenance. Import validation lives in `lib/import/import-schema.ts`; persistence lives in `app/api/import/route.ts`; the client page lives in `app/import/page.tsx`.

**Tech Stack:** Next.js App Router, React 19, Supabase SSR/client SDK, Tailwind CSS, Playwright e2e tests, custom TypeScript validation instead of adding Zod.

---

### Task 1: Red Tests

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] Add `/import` to the reachable/protected route checks.
- [ ] Add a home-page assertion for a visible "导入 ChatGPT 错题卡" entry.
- [ ] Run `npm run test:e2e` and confirm it fails before implementation because `/import` is missing.

### Task 2: Database And Types

**Files:**
- Create: `supabase/migrations/002_allow_text_imports.sql`
- Modify: `lib/types.ts`
- Modify: `lib/questions.ts`

- [ ] Add migration SQL to drop `questions.image_path` `not null`, replace the owner check with `image_path is null or ...`, and add `source text not null default 'manual'` with a constrained source set.
- [ ] Update question types so `image_path` is nullable and `source` is available.
- [ ] Change signed-url loading so null image paths do not call Supabase Storage.

### Task 3: Import Validation And API

**Files:**
- Create: `lib/import/import-schema.ts`
- Create: `app/api/import/route.ts`

- [ ] Validate only JSON arrays.
- [ ] Validate each row independently and return one-based row failures.
- [ ] Default `question_text_status` to `ai_unverified`, `source` to `chatgpt_import`, `needs_manual_check` to `true`, and `review_priority` from `mastery_status` when missing.
- [ ] Reject `image_path` values that do not start with `users/{currentUserId}/questions/`.
- [ ] Insert successful rows into `questions`, upsert initial `reviews`, and update `knowledge_stats` per inserted question.

### Task 4: Import Page

**Files:**
- Create: `app/import/page.tsx`
- Modify: `proxy.ts`
- Modify: `app/page.tsx`
- Modify: `components/bottom-nav.tsx`
- Modify: `app/settings/page.tsx`

- [ ] Protect `/import` like other user-data pages.
- [ ] Add paste, insert-example, parse, preview, and confirm-import controls.
- [ ] Show image binding status and row-level validation errors.
- [ ] Add import entry on the home page and settings page.
- [ ] Reduce bottom navigation to five entries: 首页, 拍题, 复习, 错题, 我的.

### Task 5: Upload Pending ChatGPT Mode

**Files:**
- Modify: `app/upload/page.tsx`

- [ ] Add a save-mode selector with pending ChatGPT as default.
- [ ] Pending mode keeps the real uploaded `image_path`, sets `source` to `pending_chatgpt`, `question_text_status` to `needs_fix`, `needs_manual_check` to `true`, and `user_note` to include "待 ChatGPT 整理".
- [ ] Automatic analysis mode preserves existing mock analysis behavior.

### Task 6: Nullable Image UI

**Files:**
- Modify: `app/questions/page.tsx`
- Modify: `app/questions/[id]/page.tsx`
- Modify: `app/review/page.tsx`
- Modify: `app/sprint/page.tsx`

- [ ] When `image_path` is null, show "文字错题卡" or "未绑定原图" instead of attempting to load Storage.
- [ ] Add provenance/status labels inferred from `source`, `question_text_status`, and `needs_manual_check`.

### Task 7: Mobile UI Skill And Verification

**Files:**
- Create: `.skills/mobile-ui-redesign/SKILL.md`
- Modify: `AGENTS.md`
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] Add the requested skill text and AGENTS guidance.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `npm run test:e2e`.
- [ ] Report modified files and Git limitation if `git.exe` remains unavailable.
