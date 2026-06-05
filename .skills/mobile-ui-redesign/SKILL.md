---
name: Mobile UI Redesign
description: Improve 11408-review mobile-first UI and UX without breaking existing features.
---

# Mobile UI Redesign

Use this skill when modifying the home, upload, import, review, questions, reports, settings, or login pages; mobile layout; navigation; cards; buttons; forms; or status labels.

## Required Principles

- Design mobile first.
- Preserve existing login, upload, import, review, report, export, settings, and system-check behavior.
- Do not change the database schema unless the product requirement cannot be met cleanly without it.
- Do not expose API keys, service role keys, tokens, or raw secret values.
- Do not delete Supabase auth, Storage, RLS, review scheduling, reports, exports, or PWA logic.
- Do not introduce heavy UI or chart libraries.
- Keep bottom navigation to at most five primary destinations.
- Make key actions visually obvious and easy to tap.
- Prevent horizontal scrolling at phone widths.
- Keep forms comfortable for phone input.
- Provide clear empty, error, and loading states.
- Keep the product feeling like a learning app, not a generic admin dashboard.

## Forbidden

- Large business-logic rewrites unrelated to the UI change.
- ECharts or other heavy chart libraries for this app's current reporting needs.
- Unknown templates or copied UI kits.
- Replacing real user data with pure mock data.
- Removing upload, import, review, reports, export, or system-check features.
