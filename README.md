# Mug & Bean

Scan a coffee bag, rate the brew, discover your next favourite. Mug & Bean is a
web-first specialty-coffee discovery and logging app.

## Tech stack

| Layer     | Choice                                           |
| --------- | ------------------------------------------------ |
| Framework | Next.js 14 (App Router) + TypeScript             |
| Styling   | Tailwind CSS (brand tokens in `tailwind.config`) |
| Backend   | Next.js API Routes (`/api/*`)                    |
| Database  | PostgreSQL via Supabase (schema in `supabase/`)  |
| Auth      | Supabase Auth + `@supabase/ssr`                  |
| OCR       | Google Cloud Vision API                          |
| Hosting   | Vercel                                           |
| Tests     | Vitest (unit), Playwright (E2E)                  |

## Prerequisites

- **Node.js >= 18.17** (this scaffold is developed on Node 24 LTS)
- **npm** (ships with Node)
- **git**
- **Docker Desktop** (only needed to run the local Supabase stack — see
  [Database](#database-supabase))

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file and fill in the values
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local

# 3. Start the dev server
npm run dev
```

The app runs at <http://localhost:8000>. None of the `.env.local` values are
required to boot this scaffold — they become necessary as the Supabase, OCR,
and email integrations are added.

## Scripts

| Command                | What it does                             |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start the local dev server on port 8000  |
| `npm run build`        | Production build                         |
| `npm run start`        | Serve the production build               |
| `npm run lint`         | ESLint (Next.js + Prettier-aware config) |
| `npm run lint:fix`     | ESLint with autofix                      |
| `npm run format`       | Format the whole repo with Prettier      |
| `npm run format:check` | Check formatting without writing         |
| `npm run type-check`   | TypeScript type-check (no emit)          |
| `npm run test`         | Run the unit test suite once (Vitest)    |
| `npm run test:watch`   | Run unit tests in watch mode             |
| `npm run db:start`     | Start the local Supabase stack (Docker)  |
| `npm run db:stop`      | Stop the local Supabase stack            |
| `npm run db:reset`     | Re-apply all migrations from scratch     |
| `npm run db:test`      | Run the pgTAP database tests (RLS)       |

### Running a single test

```bash
# By file
npx vitest run src/lib/utils.test.ts

# By test name (substring match)
npx vitest run -t "drops falsy values"
```

## Database (Supabase)

The PostgreSQL schema is version-controlled as migrations under
[`supabase/`](./supabase) — **never edit the schema in the Supabase dashboard.**
With Docker running:

```bash
npm run db:start    # boot local Postgres + Auth + Studio
npm run db:reset    # apply all migrations from scratch
npm run db:test     # run the pgTAP RLS isolation test
```

Workflow, migration authoring, and linking to hosted projects:
[`supabase/README.md`](./supabase/README.md).

## Code quality / git hooks

Husky runs a **pre-commit** hook that invokes `lint-staged`, which lints and
formats only the staged files (ESLint `--fix` + Prettier). Commits are blocked
if ESLint reports unfixable errors. The hook is installed automatically via the
`prepare` script when you run `npm install`.

## Branching strategy

- `main` — production; protected. Merges trigger production deploys.
- `dev` — integration branch for in-progress work.
- `feature/*` — one branch per feature.

## Environment variables

All required keys are documented in [`.env.example`](./.env.example). Secrets
live only in `.env.local` (git-ignored) locally and in Vercel environment
variables in deployed environments — never committed to the repo.

## Project structure

```
src/
  app/            # Next.js App Router (routes, layouts, API routes)
    layout.tsx    # Root layout + fonts + global styles
    page.tsx      # Home / landing page
    globals.css   # Tailwind entrypoint + base styles
  components/     # Reusable UI primitives
  lib/            # Framework-agnostic helpers (keep business logic here,
                  # not coupled to React)
                  # Unit tests are colocated: foo.ts + foo.test.ts
supabase/         # Version-controlled DB: migrations, RLS, pgTAP tests
  migrations/     # Ordered, immutable schema migrations
  tests/          # pgTAP database tests (RLS isolation)
benchmark/        # OCR vendor benchmark harness
```
