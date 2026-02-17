# Coffee Brew Lab (Next.js Migration)

This is the new `Next.js + TypeScript` version of Coffee Brew Cards.

## Features implemented

- Fully restyled recipe card library with animated front/back card interactions.
- Structured recipe specs (`Recipe -> Version -> Step`) for step-by-step brew guidance.
- Guided brew player with:
  - pre-brew water/ratio scaling
  - timed and pour-target step handling
  - pause/back/next/skip/restart controls
  - local session persistence + restore
- Studio authoring flow for custom recipe cards:
  - create/edit cards
  - add/reorder/delete typed steps
  - live card preview
  - preset image selection + optional custom upload (Supabase storage)
- Sharing and remix flow:
  - publish recipe
  - generate share link `/share/[token]`
  - public read-only shared page
  - remix into signed-in user studio
- Supabase-ready schema and policies in `supabase/schema.sql`.
- Seed automation from legacy cards to SQL in `scripts/generate-seed-sql.mjs` + `supabase/seed.sql`.
- Unit tests for scaling/session/remix logic with Vitest.
- Playwright end-to-end workflow tests for create/publish/share/remix flows.

## Routes

- `/` library
- `/recipes/[slug]` recipe detail
- `/brew/[slug]` interactive brew session
- `/studio` creator dashboard
- `/studio/new` new recipe flow
- `/studio/[recipeId]/edit` editor
- `/share/[token]` public share page
- `/auth/callback` magic-link callback
- `/profile` auth profile

## Setup

1. Install deps

```bash
npm install
```

2. Configure env vars

```bash
cp .env.example .env.local
```

Then set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Optional:

- `SUPABASE_SECRET_KEY` (server-only admin operations)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy fallback only)

3. Optional: apply Supabase schema

- Run SQL in `supabase/schema.sql` via Supabase SQL editor.
- Run SQL in `supabase/seed.sql` to import baseline brew cards.

## Seed workflow

Generate fresh seed SQL from `src/data/legacyCards.json`:

```bash
npm run seed:generate
```

Verify generated seed SQL is current (used in CI):

```bash
npm run seed:check
```

4. Run app

```bash
npm run dev
```

## Tests

```bash
npm run test
```

Run Playwright end-to-end workflows:

```bash
npm run test:e2e
```

Install browser dependencies once for E2E:

```bash
npx playwright install --with-deps chromium
```

## GitHub workflows

- `next-app-ci.yml`: seed drift check + lint + unit tests + production build.
- `next-app-e2e.yml`: Playwright end-to-end workflow coverage.

## Notes

- If Supabase env vars are missing, app runs in local author mode using localStorage fallback.
- Legacy recipe data has been migrated from `../src/cardData.json` into typed seed data.
- Modern key practice:
  - Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in browser/client code.
  - Keep `SUPABASE_SECRET_KEY` server-only (never in `NEXT_PUBLIC_*`).
  - Avoid creating new projects with legacy anon/service-role key usage.
