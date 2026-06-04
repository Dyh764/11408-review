# Final Handoff

## Project Status

`11408-review` is in Stage 8 production-readiness preparation. The project now has a sanitized production config check, Playwright smoke tests, and expanded Vercel/Supabase/Edge Function/real-device handoff docs.

## Current Branch

`codex/mvp-stage`

## Latest Commit

Use `git rev-parse --short HEAD` at handoff time. Stage 8 baseline was `40fbce6`.

## Local Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows, if `Access is denied` appears during npm scripts, place a usable Node 20.9+ directory at the front of PATH and rerun the same command.

## Production Deployment

1. Push the current branch to GitHub.
2. Import the repo into Vercel with Framework Preset `Next.js`.
3. Configure Vercel env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`, `SUPABASE_STORAGE_BUCKET`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `CRON_SECRET`.
4. Deploy and open `/settings/system-check` after login.
5. Complete `docs/vercel-final-deploy.md`.

## Supabase Setup

1. Run migrations in `supabase/migrations/`.
2. Confirm RLS for `profiles`, `questions`, `reviews`, `reports`, and `knowledge_stats`.
3. Create private bucket `question-images`.
4. Configure Storage policy for `users/{auth.uid()}/questions/`.
5. Verify two-account data isolation.

## Edge Functions And Cron

1. Deploy all four functions under `supabase/functions/`.
2. Configure Supabase Functions secrets.
3. Configure Cron in Supabase, not Vercel.
4. Fill `docs/edge-functions-final-check.md` after real calls.

## OpenAI Setup

`OPENAI_API_KEY` stays server-side or in Supabase Functions secrets. If missing, analysis should use mock fallback and must not white-screen.

## Mobile Flow

Login, upload question image, save question, verify detail, run AI/mock analysis, complete review, inspect reports, use sprint mode, export data, and add the app to the home screen.

## Test Commands

```bash
npm run lint
npm run build
npm run test:e2e
```

With an existing local server:

```bash
E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

Without `E2E_BASE_URL`, Playwright defaults to `http://127.0.0.1:3000`.

Production smoke test after Vercel deployment:

```bash
E2E_BASE_URL=https://your-app.vercel.app npm run test:e2e
```

Windows PowerShell:

```powershell
$env:E2E_BASE_URL="https://your-app.vercel.app"; npm run test:e2e
```

## Verified Locally

- `npm run lint`
- `npm run build`
- `npm run test:e2e -- --project=chromium`
- Home page, login page, protected route auth behavior, settings, sprint, PWA manifest, mobile viewport overflow, and `/api/settings/system-check`.

## Not Yet Real-Device Verified

- iPhone Safari camera, album, soft keyboard, and add-to-home-screen flow.
- Android Chrome camera, album, soft keyboard, and add-to-home-screen flow.
- Production Supabase Edge Function deployment and Cron execution.
- Real OpenAI API key/model/quota behavior in production.

## Known Issues

- No one-click import restore yet.
- No complex offline cache.
- Real-device acceptance requires production deployment.

## Suggested Stage 9 TODO

Use Stage 9 for production verification only: fill real-device tables, fill Edge Function measured records, inspect production logs, and fix only launch-blocking issues. Do not add social, payment, marketplace, ranking, class system, push notification, or complex AI chat features.
