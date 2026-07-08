-- ---------------------------------------------------------------------------
-- scan_logs - per-user ledger of label-scan attempts.
--
-- Two jobs:
--   1. Accuracy / cost monitoring - one row per scan attempt (who, when, what
--      happened, how long the OCR call took, how much text came back).
--   2. Rate limiting - the scan endpoint counts a user's billable OCR attempts
--      (status success|failure) inside a rolling window to cap Google Vision
--      spend. Persisting the ledger in the database (not in server memory) is
--      what makes the limit hold across serverless instances.
--
-- Security posture mirrors `waitlist`: this table is server-managed. Rows are
-- written and read ONLY by the scan endpoint via the service-role client, so the
-- rate-limit ledger cannot be tampered with through the public Data API - a user
-- must not be able to DELETE their own scan_logs to reset their limit. RLS is
-- enabled with no policy (denies anon/authenticated every row) AND the base
-- grants those roles would inherit are revoked outright. The service role
-- bypasses RLS and stays the only path in.
-- ---------------------------------------------------------------------------

create type public.scan_status as enum ('success', 'failure', 'rate_limited');

create table public.scan_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  status      public.scan_status not null,
  -- OCR engine that served the attempt (e.g. 'google-vision'); null when the
  -- request was rate-limited before any engine was called.
  provider    text,
  -- Characters of raw text extracted (success only) - a cheap quality signal.
  text_length integer,
  -- Wall-clock latency of the OCR call in ms (attempts that reached the engine).
  latency_ms  integer,
  -- Short machine tag when status = 'failure', for grouping error causes.
  error_code  text,
  created_at  timestamptz not null default now()
);

comment on table public.scan_logs is
  'Per-user ledger of label-scan attempts. Powers accuracy monitoring and the endpoint rate limit. Server-managed (service role only); RLS-locked away from the public Data API roles.';

-- The rate-limit query is "count this user's recent attempts", so index the
-- exact access path: user_id + created_at.
create index scan_logs_user_created_idx
  on public.scan_logs (user_id, created_at desc);

-- Lock the table down like waitlist: RLS on with no policy denies every row to
-- anon/authenticated, and revoking the inherited base grants puts a hard
-- "permission denied" in front of RLS. The service role (server-only) bypasses
-- RLS and remains the sole reader/writer.
alter table public.scan_logs enable row level security;

revoke all on public.scan_logs from anon, authenticated;

grant select, insert on public.scan_logs to service_role;
