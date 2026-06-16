# Supabase — schema, migrations & RLS

Version-controlled database for Mug & Bean. **All schema changes are migration
files in this directory — never ad-hoc edits in the Supabase dashboard.** RLS
and schema must be reproducible.

## Layout

```
supabase/
├── config.toml                  # Supabase CLI project config
├── migrations/                  # ordered, immutable schema migrations
│   ├── 20260611120000_enable_extensions.sql   # pg_trgm
│   ├── 20260611120100_initial_schema.sql      # tables, FKs, indexes, triggers
│   └── 20260611120200_row_level_security.sql  # RLS enable + policies
└── tests/
    └── rls_isolation_test.sql   # pgTAP: cross-user isolation (two accounts)
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
  (the local Supabase stack runs in containers).
- Supabase CLI — invoked here via `npx supabase` (pinned in devDependencies),
  so no global install is required.

## Common commands

These are wired up as npm scripts (see `package.json`):

| Script             | What it does                                                  |
| ------------------ | ------------------------------------------------------------- |
| `npm run db:start` | Start the local Supabase stack (Postgres, Auth, Studio).      |
| `npm run db:stop`  | Stop the local stack.                                         |
| `npm run db:reset` | Drop, recreate, and re-apply **all** migrations from scratch. |
| `npm run db:test`  | Run the pgTAP suite in `tests/` (RLS isolation).              |
| `npm run db:diff`  | Diff the running DB against migrations (to author new ones).  |
| `npm run db:lint`  | Static lint of the schema via the CLI.                        |

Raw equivalents: `npx supabase db reset`, `npx supabase test db`, etc.

## Authoring a new migration

1. `npx supabase migration new <descriptive_name>` creates a timestamped file.
2. Write forward-only SQL. Migrations are immutable once merged — never edit an
   applied migration; add a new one.
3. `npm run db:reset` to apply locally, then `npm run db:test` to confirm RLS
   still holds.

## Connecting to a hosted project (staging / production)

`supabase init` does not create cloud projects. Create the **staging** and
**production** projects in the Supabase dashboard, then for each:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push        # apply local migrations to the linked project
```

Store each project's URL + anon/service keys in the corresponding Vercel
environment group. Locals go in `.env.local` — see `.env.example`.

## Verifying RLS

`npm run db:test` runs `tests/rls_isolation_test.sql`, which seeds two users
(Alice, Bob) and asserts that neither can read or mutate the other's personal
rows while the shared catalog stays readable to both. This is the automated form
of the "verified with two test accounts" criterion.
