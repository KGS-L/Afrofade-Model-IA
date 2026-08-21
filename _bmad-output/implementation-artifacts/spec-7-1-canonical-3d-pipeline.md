---
title: 'Epic 7 — Durable 3D Head Pipeline'
type: 'feature'
created: '2026-08-21'
status: 'done'
baseline_commit: '5ac0488'
review_loop_iteration: 0
context: ['_bmad-output/planning-artifacts/epics.md']
---

## Intent

**Problem:** Head 3D reconstruction must operate as a durable, restart-safe, asynchronous pipeline producing `CanonicalHead` assets with explicit coordinate systems and scale.

**Approach:** 
- Formalized `CanonicalHead`, `CanonicalHairAsset`, `TryOnAsset` data contracts in TypeScript & Python.
- Leveraged `ai_jobs` table queue with `FOR UPDATE SKIP LOCKED` and lease heartbeats.
- Implemented `AssetStorage` prefix abstraction separating `heads/`, `hair/`, `temp_photos/`, and `exports/`.
- Integrated `HeadGenerationManager` with PyTorch/FLAME backend.

## Tasks & Acceptance

- [x] **Story 7.1 — Canonical 3D data contracts**: Created `web/src/lib/types/canonical-3d.ts` and `api/models/canonical_3d.py`.
- [x] **Story 7.2 — Persistent `ai_jobs` schema & JobQueue**: Verified `05_persistent_ai_jobs.sql`.
- [x] **Story 7.3 — Restart-safe Python worker**: Verified `06_ai_job_worker_lifecycle.sql` and `api/workers/job_worker.py`.
- [x] **Story 7.4 — AssetStorage abstraction**: Implemented `web/src/lib/server/asset-storage.ts` and `api/services/storage/asset_storage.py`.
- [x] **Story 7.5 — `HeadGenerationManager` FLAME pipeline**: Verified PyTorch FLAME provider.
- [x] **Story 7.6 — Integration tests**: Created `scripts/test_epic7_head_pipeline.py` (5/5 PASS).

## Verification

- `python3 scripts/test_epic7_head_pipeline.py` -- expected: 5/5 PASS
- `./web/node_modules/.bin/tsc --noEmit --project web/tsconfig.json` -- expected: 0 errors
- `python3 scripts/check_p0_invariants.py` -- expected: 41/41 PASS
