# BMAD Story Spec — 7.5 HeadGenerationManager -> real FLAME pipeline

Date: 2026-08-19
Story: 7.5
Epic: 7 — Durable 3D Head Pipeline
Status: ready-for-dev

## Objective

Replace the transitional worker head handler with a durable, provider-neutral `HeadGenerationManager` that runs the validated FLAME pipeline, stores generated meshes through `AssetStorage`, persists canonical head metadata, and only returns a successful job output after both object storage and database persistence succeed.

## Current-state defects

- `FlamePyTorchProvider` imports a nonexistent `Afrofade3DReconstructor` class instead of the active `ReconstructionPipelineService`.
- the worker bypasses `HeadGenerationManager` and calls `ReconstructionPipelineService` directly.
- reconstruction writes the final GLB to `/tmp/generated_models` and returns an internal compatibility URL.
- worker output explicitly marks `transitional_storage: true`.
- no `head_assets` durable metadata table exists.
- a retry after an upload/persistence boundary can recompute FLAME unnecessarily.

## Acceptance criteria

1. `FlamePyTorchProvider` invokes the active `ReconstructionPipelineService` implementation; no stale/nonexistent provider import remains.
2. the durable worker handler delegates head reconstruction to `HeadGenerationManager`.
3. the manager validates head input and provider output before persistence.
4. the generated GLB is uploaded to the private `heads` bucket under `canonical/{users|salons}/...` through `AssetStorage`; production success never depends on `/tmp/generated_models`.
5. migration `08_head_assets.sql` creates durable `head_assets` metadata with source-job idempotency, owner-aware RLS and service-role-only mutation.
6. persistence derives ownership from the authoritative `ai_jobs` row, not from client-provided metadata.
7. job output references the durable head asset by `head_asset_id` plus a `StoredAssetRef`; it does not persist expiring signed URLs as identity.
8. retries are idempotent: if a persisted asset for the same source job still exists in object storage, the manager reuses it instead of re-running FLAME.
9. if object upload or metadata persistence fails, no completed job result is returned; best-effort orphan cleanup is attempted.
10. provider-independent validation covers manager success, idempotent reuse, storage failure, persistence failure, DB/RLS contract and the removal of `transitional_storage` from the worker output.

## Design decisions

### Reconstruction boundary

`ReconstructionPipelineService` gains a durable-generation method that returns an in-memory reconstruction payload (`glb_bytes`, vertex/polygon counts, convergence and fit metadata). The existing synchronous compatibility method remains temporarily available and may still write to `/tmp/generated_models`, but the worker path must not use it.

### Durable identity

Object identity is `StoredAssetRef { bucket, path }`. Signed URLs are read projections only and are not persisted as canonical identity.

### `head_assets`

The table stores:
- `id`;
- `source_job_id` UNIQUE;
- authoritative `user_id` / `salon_id` copied from `ai_jobs` by a SECURITY DEFINER RPC;
- provider;
- mesh bucket/path;
- canonical coordinate system/unit;
- scalp-anchor version;
- vertex/polygon counts;
- fitting metadata;
- timestamps.

The persistence RPC must reject non-head jobs and derive owner scope from `ai_jobs`.

### Retry semantics

The object path and head asset id are deterministic from `source_job_id`. Reprocessing the same job therefore upserts the same object and metadata. A previously persisted valid object short-circuits expensive inference.

### Explicitly deferred

- switching the current Next.js user journey from synchronous `/api/v1/reconstruct` to async job polling;
- atomic credit/quota reservation/refund for async execution;
- removal of the legacy `/api/v1/models/*` compatibility route;
- real scalp-anchor extraction and preview generation;
- end-to-end lifecycle/authorization tests (Story 7.6).

The synchronous user journey remains temporarily because changing it before commercial reservation/refund semantics are available could double-charge, fail to charge, or consume salon quota incorrectly.

## Required validation gates

- Python compile.
- canonical contract validation.
- JobQueue/worker lifecycle validation.
- new Story 7.5 durable FLAME manager validation.
- P0 invariants.
- Next.js typecheck/build.
- production Docker build/start/security smoke tests.
