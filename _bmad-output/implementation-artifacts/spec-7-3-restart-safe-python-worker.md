# Story 7.3 — Restart-safe Python Worker

Status: in-progress
Epic: 7 — Durable 3D Head Pipeline
Date: 2026-08-19

## User Story

As an Afrofade operator,
I want heavy 3D work executed by a lease-based worker rather than inside the FastAPI request lifecycle,
So that requests return a durable job ID quickly, worker crashes do not erase work, and retries cannot create uncontrolled duplicate execution.

## Acceptance Criteria

### AC-7.3.1 — Worker lifecycle RPCs

A migration adds service-role-only lifecycle operations for:

- heartbeat/lease extension;
- complete;
- fail with bounded retry or permanent failure;
- recover expired running leases.

Every lifecycle mutation verifies that the caller's `worker_id` still owns a valid running lease before accepting heartbeat/complete/fail.

### AC-7.3.2 — Restart-safe recovery

Expired `running` jobs are atomically recovered:

- jobs with attempts remaining return to `queued`;
- exhausted jobs become `failed`;
- locks/leases are cleared;
- structured `worker_lease_expired` diagnostics are persisted;
- concurrent recovery uses row locking/`SKIP LOCKED` or an equivalent atomic boundary.

### AC-7.3.3 — JobQueue lifecycle API

The Python `JobQueue` contract supports:

- `heartbeat`;
- `complete`;
- `fail`;
- `recover_expired`;

in addition to Story 7.2 enqueue/get/claim.

### AC-7.3.4 — Worker process

A separate Python worker:

- recovers expired jobs before claiming new work;
- claims jobs in bounded batches;
- dispatches through a provider-neutral handler registry;
- maintains a background heartbeat while a handler runs;
- completes only while it still owns the lease;
- schedules retry for transient handler errors;
- marks unsupported/permanent errors without retry loops;
- handles SIGTERM/SIGINT gracefully between jobs.

### AC-7.3.5 — Durable head submission endpoint

`POST /api/v1/heads` no longer calls the legacy in-memory `AsyncJobQueueManager` or executes reconstruction synchronously. It validates a trusted owner payload and enqueues `head_reconstruction`, returning HTTP 202 with the durable job ID/status before heavy processing.

`GET /api/v1/heads/{job_id}` reads the durable queue record.

### AC-7.3.6 — Transitional reconstruction handler

Until Stories 7.4/7.5 replace filesystem outputs with `AssetStorage` + `CanonicalHead`, the worker may adapt the existing `ReconstructionPipelineService` for `head_reconstruction`. This handler is explicitly transitional and must not be treated as completion of durable asset storage.

### AC-7.3.7 — Provider-independent worker validation

CI validates without a live Supabase project or paid 3D provider:

- lifecycle migration contains worker/lease ownership checks;
- expired recovery and bounded retry semantics are present;
- fake JobQueue + fake handlers prove success, transient retry, permanent failure, unsupported handler, and lease-loss behavior;
- FastAPI source no longer references `AsyncJobQueueManager` for `/api/v1/heads`;
- P0 and Stories 7.1/7.2 validators remain green.

## File Plan

- `web/supabase/migrations/05_ai_job_worker_lifecycle.sql`
- `api/services/jobs/job_queue.py`
- `api/services/jobs/worker.py`
- `api/services/jobs/handlers.py`
- `api/workers/__init__.py`
- `api/workers/job_worker.py`
- `api/main.py`
- `api/scripts/validate_worker_lifecycle.py`
- `.env.example`
- `docker-compose.yml`
- `.github/workflows/ci-cd.yml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Out of Scope

- durable GLB/object storage (Story 7.4);
- canonical FLAME adapter/output persistence (Story 7.5);
- complete real-Supabase lifecycle integration suite (Story 7.6);
- switching the public Next.js user journey to trust a fake/demo result — prohibited; UI async migration can land with 7.5 when canonical output is usable.

## Definition of Done

- all ACs implemented;
- worker lifecycle validator passes;
- code review has no open Critical/High/Medium finding;
- existing P0/7.1/7.2 gates remain green;
- production Docker stack includes a controllable worker service without requiring live external services in CI;
- story moves to `review`, then `done` after the production Docker gate is green.
