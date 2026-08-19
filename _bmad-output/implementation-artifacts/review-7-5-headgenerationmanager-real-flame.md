# BMAD Code Review — Story 7.5 HeadGenerationManager -> Real FLAME

Date: 2026-08-19
Story: 7.5
Review result: PASS — CODE HEAD GATES GREEN

## Scope reviewed

- `api/models/head_generation.py`
- `api/services/reconstructor.py`
- `api/services/fitting/head_provider.py`
- `api/services/jobs/handlers.py`
- `api/services/heads/head_asset_repository.py`
- `api/services/storage/supabase_storage.py`
- `web/supabase/migrations/08_head_assets.sql`
- `api/scripts/validate_head_generation_manager.py`
- `api/scripts/validate_head_asset_repository.py`
- `api/scripts/validate_asset_storage.py`
- `.github/workflows/p1-head-generation-manager.yml`

## Findings fixed during review

### Fixed — stale FLAME provider entry point

`FlamePyTorchProvider` referenced the nonexistent `Afrofade3DReconstructor` instead of the active reconstruction service.

Resolution:
- provider now invokes `ReconstructionPipelineService.generate_3d_head_asset()`;
- heavy FLAME/PyTorch/MediaPipe imports are lazy and occur only when the real provider is invoked;
- the provider returns a lightweight `ReconstructedHeadPayload` before persistence.

Status: RESOLVED.

### Fixed — durable worker bypassed HeadGenerationManager

The worker handler called `ReconstructionPipelineService` directly and returned `transitional_storage: true`.

Resolution:
- durable head jobs now delegate to `HeadGenerationManager`;
- final GLB bytes are uploaded through `AssetStorage`;
- successful worker output references `head_asset_id` + durable `StoredAssetRef`;
- no expiring signed URL or `/tmp` path is persisted as object identity;
- `transitional_storage` is removed from the durable worker result.

Status: RESOLVED.

### Fixed — no durable head metadata persistence

No authoritative record connected a generated mesh to its source durable job.

Resolution:
- migration `08_head_assets.sql` creates `head_assets`;
- `source_job_id` is unique and references `ai_jobs`;
- RLS permits owner/salon/admin reads;
- anonymous access is revoked;
- authenticated mutation is revoked;
- service-role `persist_head_asset` is the mutation boundary.

Status: RESOLVED.

### Fixed — storage path was not cryptographically/authoritatively bound to job ownership

Deriving `user_id`/`salon_id` from `ai_jobs` was insufficient if a service-role caller could persist a mesh path under another tenant prefix.

Resolution:
- `mesh_bucket` is constrained to `heads`;
- the persistence RPC derives the expected prefix from the locked `ai_jobs` row;
- customer path must begin `canonical/users/<job.user_id>/`;
- salon path must begin `canonical/salons/<job.salon_id>/`;
- ambiguous traversal/double-slash/backslash/dot path forms are rejected.

Status: RESOLVED.

### Fixed — repository ownership mapping was not directly tested

A worker-side regression could have started supplying owner fields to the RPC without provider-independent tests noticing it.

Resolution:
- `validate_head_asset_repository.py` asserts the exact PostgREST/RPC mapping;
- persistence sends source job, provider, mesh ref and metadata only;
- `p_user_id`, `p_salon_id`, `p_owner_id` and `p_owner_type` are forbidden from the client mapping;
- ownership remains derived in SQL.

Status: RESOLVED.

### Fixed — AssetStorage signed-upload boolean regression from merged main

The 7.4 review had established that the Supabase signed-upload API expects a boolean `upsert`, but merged `main` had regressed to string values.

Resolution:
- signed upload again sends `options={"upsert": <bool>}`;
- validator asserts both `False` and `True` by identity, preventing string coercion regressions.

Status: RESOLVED.

### Fixed — raw object path normalization regression from merged main

`PurePosixPath` can silently normalize repeated separators and dot segments before validation.

Resolution:
- raw path segments are validated before normalization;
- `//`, `.`, `..`, absolute paths, backslashes, URL-like paths and NUL-containing paths fail closed;
- provider-independent validator locks this behavior.

Status: RESOLVED.

### Fixed — Story branch initially omitted login-redesign assets while syncing main

`main` advanced during Story 7.5 with the login redesign. The first merge tree included the page but not its binary showcase asset/build-info blob, which made the PR appear to delete/modify unrelated login files.

Resolution:
- branch was synchronized with current `main` using a real merge ancestry;
- `web/public/auth-showcase.png` and `web/tsconfig.tsbuildinfo` were restored bit-for-bit from `main`;
- final comparison is `behind_by: 0` and the PR diff no longer contains login redesign files.

Status: RESOLVED.

## Acceptance criteria review

1. active FLAME provider entry point: PASS.
2. worker delegates to `HeadGenerationManager`: PASS.
3. manager validates input/provider output: PASS.
4. durable GLB upload through private `heads` storage: PASS.
5. `head_assets` persistence + source-job idempotency: PASS.
6. ownership derived from authoritative `ai_jobs`: PASS.
7. durable job output uses `head_asset_id` + `StoredAssetRef`: PASS.
8. persisted existing mesh is reused without rerunning FLAME: PASS.
9. upload/persistence failures cannot return completed output; orphan cleanup attempted: PASS.
10. provider-independent manager/repository/storage regression gates: PASS.

## CI evidence for code head `70176b9c813d7f7a1f95f678d73c970e806af152`

- `P1 Durable Head Generation` — run #9 / `32245315269`: PASS.
- `P1 AssetStorage Contract` — run #23 / `32245315253`: PASS.
- `P1 AssetStorage Layout` — run #19 / `32245315322`: PASS.
- `Afrofade CI/CD Pipeline` — run #168 / `32245315341`: PASS.
  - FastAPI/Python compile: PASS.
  - canonical contracts: PASS.
  - persistent JobQueue: PASS.
  - restart-safe worker: PASS.
  - P0 security invariants: PASS.
  - AI model gatekeeper: PASS.
  - npm audit / TypeScript / Next.js production build: PASS.
  - production Docker Compose build: PASS.
  - production stack startup: PASS.
  - P0 runtime security smoke tests: PASS.
  - deploy: SKIPPED correctly for PR.

## Explicitly deferred

- async migration of the current Next.js synchronous reconstruction user journey;
- atomic B2C credit / B2B quota reserve, commit and refund around async inference;
- Story 7.6 end-to-end ownership, lifecycle and retry integration tests;
- replacing arbitrary remote photo URLs with owned `StoredAssetRef` + server-created short-lived reads to close SSRF/ownership ambiguity;
- real scalp-anchor artifact extraction and preview generation;
- removal of legacy `/api/v1/models/*` and `/tmp/generated_models` compatibility path after the user journey migrates;
- published hair catalogue delivery policy (Epic 8).

## Review conclusion

No open Critical/High/Medium finding remains inside Story 7.5 scope. The durable worker path is now `ai_jobs -> worker -> HeadGenerationManager -> FLAME -> AssetStorage -> head_assets -> job output`, with fail-closed persistence and idempotent reuse.

Story 7.5 may be marked DONE after the BMAD status/review documentation commit itself passes the required final-head CI gates.
