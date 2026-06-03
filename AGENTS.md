# 11408-review Agent Rules

## Project Goal

Build a mobile-first 11408 postgraduate exam wrong-question review system. The core workflow is: take a question photo, choose subject, choose mastery status, write one short note, save, then let the system produce review cards, review schedules, and weakness reports.

## Required Principles

1. Mobile first. Design for phone use before desktop use.
2. The original image is the source of truth.
3. Never save only OCR text. Every question must keep `image_path`.
4. AI-recognized text is auxiliary and must default to `ai_unverified`.
5. API keys must never be hard-coded or committed.
6. Follow the rules in `.skills` before changing related behavior.
7. After each code change, run `npm run lint` and `npm run build` when available.
8. If verification cannot run, explain the concrete reason.
9. Do not install unknown third-party dependencies or templates.
10. Keep MVP scope narrow: no social features, rankings, payments, complex chat, or question marketplace.

## Safety Checks

- Confirm RLS protects per-user data.
- Confirm Storage paths stay under `users/{user_id}/questions/{question_id}`.
- Confirm mock AI does not read `OPENAI_API_KEY`.
- Confirm real OpenAI calls remain server-side only when added later.
