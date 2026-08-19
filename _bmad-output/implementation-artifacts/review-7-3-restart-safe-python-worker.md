# BMAD Code Review — Story 7.3 Restart-safe Python Worker

Date: 2026-08-19
Story: 7.3
Review result: PASS WITH FIXES APPLIED

## Scope reviewed

- `web/supabase/migrations/05_ai_job_worker_lifecycle.sql`
- `api/services/jobs/job_queue.py`
- `api/services/jobs/worker.py`
- `api/services/jobs/handlers.py`
- `api/workers/job_worker.py`
- `api/main.py`
- `api/scripts/validate_job_queue_contract.py`
- `api/scripts/validate_worker_lifecycle.py`
- worker Docker/config/CI integration

## Findings fixed during review

### Fixed — lifecycle RPC mapping coverage gap

The worker unit validator used a fake `JobQueue`, but the real Supabase client mappings for heartbeat/complete/fail/recover were not explicitly tested. A PostgREST RPC parameter typo could therefore have escaped the worker tests.

Resolution: `validate_job_queue_contract.py` now validates the exact RPC paths and payload names for all lifecycle operations.

Status: RESOLVED.

### Fixed — lifecycle test fixture override collision

The `running_job` test helper initially supplied fields such as `status` both as defaults and keyword overrides, which could raise a Python duplicate-keyword error before assertions ran.

Resolution: the helper now creates the default dict then applies explicit overrides.

Status: RESOLVED.

### Fixed — malformed queue payload could escape as Pydantic `ValidationError`

`SupabasePostgresJobQueue` originally let `AIJobRecord.model_validate` errors escape directly. The worker loop handles queue failures as `JobQueueError`, so an unexpected PostgREST payload could terminate the worker process rather than produce a recoverable queue error.

Resolution: all queue record validation is centralized in `_validate_job`; Pydantic `ValidationError` is normalized to `JobQueueError`.

Status: RESOLVED.

## Acceptance criteria review

- heartbeat/complete/fail/recover lifecycle RPCs: PASS.
- active lease + `worker_id` ownership required for terminal writes: PASS.
- expired lease recovery with `FOR UPDATE SKIP LOCKED`: PASS.
- bounded retry / attempts exhausted -> failed: PASS.
- Python JobQueue lifecycle methods: PASS.
- separate worker process and signal handling: PASS.
- heartbeat while handler runs: PASS.
- stale worker cannot complete/fail after lease loss: PASS.
- `POST /api/v1/heads` returns durable queued job without synchronous reconstruction: PASS.
- `GET /api/v1/heads/{job_id}` reads durable job record: PASS.
- legacy `AsyncJobQueueManager` removed from FastAPI head endpoints: PASS.
- transitional FLAME handler explicitly isolated for Story 7.5 replacement: PASS.
- provider-independent worker validation: PASS.
- Docker worker service: PASS.

## Explicitly deferred

These are deliberate Story 7.4/7.5 concerns, not open Story 7.3 defects:

- transitional reconstruction output may still reference current filesystem-based assets;
- legacy synchronous `/api/v1/reconstruct` remains until the canonical stored-head path is usable;
- `HeadGenerationManager`/FLAME canonical normalization is Story 7.5;
- durable asset/object storage is Story 7.4.

## Validation evidence

GitHub Actions run #130 (`32234341048`) passed end-to-end on Story 7.3 head:

- frontend install/audit/typecheck/build: PASS;
- Python compile: PASS;
- canonical contracts: PASS;
- durable JobQueue contract + lifecycle RPC mappings: PASS;
- restart-safe worker lifecycle: PASS;
- P0 security invariants: PASS;
- production Docker Compose build: PASS;
- API/web/worker containers startup: PASS;
- runtime P0 smoke tests: PASS;
- cleanup: PASS.

## Review conclusion

No open Critical/High/Medium finding remains in Story 7.3 scope. Story is DONE and Story 7.4 may start.
