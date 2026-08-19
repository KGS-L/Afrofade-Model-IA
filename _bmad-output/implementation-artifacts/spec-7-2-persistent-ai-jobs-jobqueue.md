# Story 7.2 — Persistent `ai_jobs` Schema & JobQueue

Status: done
Epic: 7 — Durable 3D Head Pipeline
Date: 2026-08-19

## User Story

As an Afrofade operator,
I want 3D jobs persisted in PostgreSQL and claimed atomically by workers,
So that submitted work no longer disappears when the FastAPI process restarts and multiple workers cannot process the same queued job concurrently.

## Acceptance Criteria

### AC-7.2.1 — Persistent job schema

Migration creates `ai_jobs` with at least:

- UUID primary key;
- `job_type` (`head_reconstruction`, `hair_generation`, `hair_normalization`, `hair_fit`);
- `user_id` and/or `salon_id` ownership;
- `status` (`queued`, `running`, `completed`, `failed`, `cancelled`);
- `provider`;
- JSON input/output payloads;
- progress;
- attempts/max attempts;
- idempotency key;
- available/lock/lease timestamps;
- structured error fields;
- created/started/completed/updated timestamps.

### AC-7.2.2 — Idempotent enqueue

A service-role RPC `enqueue_ai_job` creates a queued job or returns the existing compatible job for an existing idempotency key. Reusing an idempotency key for a different owner/job type/provider must fail rather than silently alias unrelated work. Concurrent calls with the same compatible key resolve to the same durable job rather than surfacing a UNIQUE violation.

### AC-7.2.3 — Atomic claim

A service-role RPC `claim_ai_jobs`:

- selects only available `queued` jobs with remaining attempts;
- orders deterministically by priority/creation time;
- uses `FOR UPDATE SKIP LOCKED`;
- updates claimed rows to `running` in the same transaction;
- increments attempts;
- records `locked_by`, `locked_at`, `lease_expires_at`, `started_at`;
- returns only the rows claimed by that call.

### AC-7.2.4 — RLS / ownership

Authenticated users have read-only visibility to jobs they own. Salon members may read jobs for their verified `salon_id`. Admin users may read all jobs. `anon` receives no table access. Authenticated clients receive explicit `SELECT` only and no direct INSERT/UPDATE/DELETE. Queue mutation RPCs are executable only by `service_role`.

### AC-7.2.5 — Provider-neutral Python JobQueue

Python defines a `JobQueue` contract and a Supabase/PostgREST-backed implementation using existing HTTP dependencies. It supports:

- enqueue;
- get by job ID;
- claim.

Instantiation from environment is fail-closed when Supabase server credentials are absent. Production refuses cleartext HTTP Supabase URLs.

### AC-7.2.6 — Provider-independent validation

CI validates without requiring a live Supabase project:

- migration contains concurrency-safe idempotent enqueue semantics;
- migration contains transactional `FOR UPDATE SKIP LOCKED` claim semantics;
- idempotency, RLS and explicit privilege/service-role boundaries are present;
- fake HTTP session proves enqueue/get/claim request/response mapping;
- invalid server configuration fails closed.

## File Plan

- `web/supabase/migrations/04_persistent_ai_jobs.sql`
- `api/models/jobs.py`
- `api/models/__init__.py`
- `api/services/jobs/job_queue.py`
- `api/services/jobs/__init__.py`
- `api/scripts/validate_job_queue_contract.py`
- `.env.example`
- `docker-compose.yml`
- `.github/workflows/ci-cd.yml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Out of Scope

- long-running worker loop / heartbeat / retry execution (Story 7.3);
- AssetStorage (Story 7.4);
- replacing FastAPI endpoints to submit to this queue (Story 7.3/7.5 transition);
- FLAME execution (Story 7.5).

## Definition of Done

- all ACs implemented;
- queue validator passes in CI;
- Python compile and P0/canonical invariants remain green;
- code review has no open Critical/High/Medium finding;
- production Docker build/start/smoke gate is green.

## Review

See `_bmad-output/implementation-artifacts/review-7-2-persistent-ai-jobs-jobqueue.md`.

## Completion Evidence

Run #107 passed frontend install/audit/typecheck/build, Python compile, canonical-contract validation, persistent JobQueue validation, P0 invariants, production Docker Compose build, production stack startup and runtime smoke tests.
