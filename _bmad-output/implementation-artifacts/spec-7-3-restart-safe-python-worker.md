# Story 7.3 — Restart-safe Python Worker

Status: done
Epic: 7 — Durable 3D Head Pipeline
Date: 2026-08-19

## User Story

As an Afrofade operator,
I want heavy 3D work executed by a lease-based worker rather than inside the FastAPI request lifecycle,
So that requests return a durable job ID quickly, worker crashes do not erase work, and retries cannot create uncontrolled duplicate execution.

## Acceptance Criteria

### AC-7.3.1 — Worker lifecycle RPCs

A migration adds service-role-only lifecycle operations for heartbeat/lease extension, complete, fail with bounded retry/permanent failure, and expired running lease recovery. Terminal worker mutations verify `worker_id`, running state and a still-valid lease.

### AC-7.3.2 — Restart-safe recovery

Expired running jobs are recovered atomically with `FOR UPDATE SKIP LOCKED`: attempts remaining return to `queued`, exhausted jobs become `failed`, locks are cleared and `worker_lease_expired` diagnostics are persisted.

### AC-7.3.3 — JobQueue lifecycle API

The Python `JobQueue` contract supports heartbeat, complete, fail and recover-expired in addition to enqueue/get/claim. Supabase RPC mappings are validated provider-independently.

### AC-7.3.4 — Worker process

A separate Python worker recovers expired jobs before claim, dispatches through typed handlers, extends leases with a heartbeat thread, skips stale terminal writes after lease loss, applies bounded retries and handles SIGTERM/SIGINT gracefully between jobs.

### AC-7.3.5 — Durable head submission endpoint

`POST /api/v1/heads` no longer calls `AsyncJobQueueManager` or executes reconstruction synchronously. It enqueues a durable `head_reconstruction` job and returns HTTP 202. `GET /api/v1/heads/{job_id}` reads the durable queue record.

### AC-7.3.6 — Transitional reconstruction handler

The worker temporarily adapts `ReconstructionPipelineService` for head reconstruction. Its filesystem/storage behavior remains explicitly transitional and is replaced by Stories 7.4/7.5.

### AC-7.3.7 — Provider-independent worker validation

CI validates lifecycle SQL, queue RPC mappings, worker success/retry/permanent-failure/unsupported-handler/lease-loss scenarios, durable FastAPI endpoints and the existing P0/7.1/7.2 gates.

## File Plan

- `web/supabase/migrations/05_ai_job_worker_lifecycle.sql`
- `api/services/jobs/job_queue.py`
- `api/services/jobs/worker.py`
- `api/services/jobs/handlers.py`
- `api/workers/__init__.py`
- `api/workers/job_worker.py`
- `api/main.py`
- `api/scripts/validate_worker_lifecycle.py`
- `api/scripts/validate_job_queue_contract.py`
- `.env.example`
- `docker-compose.yml`
- `.github/workflows/ci-cd.yml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Out of Scope

- durable GLB/object storage (Story 7.4);
- canonical FLAME adapter/output persistence (Story 7.5);
- real-Supabase lifecycle integration suite (Story 7.6);
- public user-journey migration from the legacy sync result until a canonical stored head is usable.

## Definition of Done

- all acceptance criteria implemented;
- worker lifecycle and JobQueue RPC validators pass;
- code review has no open Critical/High/Medium finding;
- P0/7.1/7.2 gates remain green;
- production Docker stack builds/starts API, web and controllable worker service;
- runtime smoke tests remain green.

## Review

See `_bmad-output/implementation-artifacts/review-7-3-restart-safe-python-worker.md`.

## Completion Evidence

GitHub Actions run #130 (`32234341048`) passed frontend install/audit/typecheck/build, Python compile, canonical contract validation, persistent JobQueue validation, restart-safe worker lifecycle validation, P0 invariants, production Docker Compose build, API/web/worker startup and runtime smoke tests.
