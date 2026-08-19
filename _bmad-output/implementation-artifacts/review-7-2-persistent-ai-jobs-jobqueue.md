# BMAD Code Review — Story 7.2 Persistent `ai_jobs` & JobQueue

Date: 2026-08-19
Story: 7.2
Review result: PASS WITH FIXES APPLIED

## Scope reviewed

- `web/supabase/migrations/04_persistent_ai_jobs.sql`
- `api/models/jobs.py`
- `api/services/jobs/job_queue.py`
- `api/services/jobs/__init__.py`
- `api/scripts/validate_job_queue_contract.py`
- FastAPI/Docker server configuration for Supabase service-role access
- Story 7.2 acceptance criteria

## Findings

### Fixed — owner deletion semantics conflicted with the owner-required invariant

The initial draft used `ON DELETE SET NULL` for `user_id` / `salon_id` while `ai_jobs` requires at least one owner. Deleting a sole owner could therefore violate the table constraint.

Resolution: owned jobs now use `ON DELETE CASCADE`, which is also aligned with privacy/deletion semantics.

Status: RESOLVED.

### Fixed — concurrent idempotent enqueue race

The first implementation performed `SELECT` followed by `INSERT`. Two concurrent calls using the same idempotency key could both observe no row, then one call would fail on the UNIQUE constraint instead of resolving to the same job.

Resolution: `enqueue_ai_job` now performs `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING`, returns the inserted row when successful, otherwise reads and validates the existing row. A conflicting owner/job-type/provider raises `idempotency_key_conflict`.

Status: RESOLVED.

### Fixed — implicit Supabase table grants

Relying on platform default grants made the intended browser permission boundary less portable/auditable.

Resolution:

- `anon`: explicit `REVOKE ALL`;
- `authenticated`: explicit `SELECT` only, still filtered by RLS;
- no direct INSERT/UPDATE/DELETE for authenticated clients;
- queue mutation RPC execution remains `service_role` only.

Status: RESOLVED.

### Fixed — server queue could accept cleartext Supabase URL in production

Resolution: `SupabasePostgresJobQueue` rejects non-HTTPS `SUPABASE_URL` when `FASTAPI_ENV=production`, and deployment validates the same invariant.

Status: RESOLVED.

## Acceptance criteria review

- Persistent `ai_jobs` schema: PASS.
- Concurrency-safe idempotent enqueue: PASS.
- Atomic `FOR UPDATE SKIP LOCKED` claim: PASS.
- Lease/attempt metadata on claim: PASS.
- Owner/salon/admin read RLS: PASS.
- Browser mutation boundary: PASS.
- `service_role` RPC boundary: PASS.
- Provider-neutral Python `JobQueue` enqueue/get/claim contract: PASS.
- Fail-closed server configuration: PASS.
- Provider-independent CI validator: PASS.

## Explicitly deferred to Story 7.3

The following are not defects in 7.2 because they are the next story's lifecycle scope:

- heartbeat/lease extension;
- recovery of expired running leases;
- success/failure completion RPCs;
- retry scheduling after handler failure;
- worker process and handler registry;
- replacement of the legacy in-memory execution path.

## Validation evidence

Current-head CI confirms frontend build/typecheck, Python compile, canonical-contract validation, persistent JobQueue contract, P0 security invariants and model gatekeeper all pass. The PR-level production Docker build/start/smoke-test gate must remain green before the story is marked `done`.

## Review conclusion

No open Critical/High/Medium issue remains within Story 7.2 scope. Story can move to `review`; it moves to `done` only when the production Docker gate is green on the stabilized head.
