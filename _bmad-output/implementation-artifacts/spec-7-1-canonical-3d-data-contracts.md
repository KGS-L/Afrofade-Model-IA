# Story 7.1 — Canonical 3D Data Contracts

Status: done
Epic: 7 — Durable 3D Head Pipeline
Date: 2026-08-19

## User Story

As a 3D developer,
I want explicit canonical contracts,
So that FLAME, future head providers, HairAssetGenerator and HairFitter can evolve independently without leaking provider-specific formats across the application.

## Acceptance Criteria

### AC-7.1.1 — Shared domain vocabulary

The repository defines canonical schemas for:

- `CanonicalHead`;
- `CanonicalHairAsset`;
- `TryOnAsset`.

Equivalent field names and semantics exist in TypeScript and Python.

### AC-7.1.2 — Coordinate contract

All canonical assets declare:

- coordinate system: `Y_UP_RIGHT_HANDED`;
- unit: `meter`.

No provider may publish a canonical asset without satisfying these invariants.

### AC-7.1.3 — Scalp anchors versioning

Head and hair assets expose a non-empty `scalpAnchorVersion`. Hair assets expose an `anchorMapUrl`; heads may expose a `scalpAnchorsUrl` when a durable anchor map is produced.

### AC-7.1.4 — Provenance and durability

Canonical assets expose provider/source job/version metadata and durable HTTP(S) asset URLs. Canonical publication rejects local filesystem paths such as `/tmp/...` or `/home/...`.

### AC-7.1.5 — Runtime validation

Python Pydantic models reject invalid coordinate systems/units/local asset paths. TypeScript exports runtime validation helpers/type guards for untrusted JSON returned by APIs.

### AC-7.1.6 — Validation checks

CI executes a provider-independent Python contract validation script that:

- validates representative head/hair/try-on samples;
- round-trips serialized data;
- confirms invalid coordinate system/unit/local mesh path is rejected;
- confirms empty optional job identifiers are rejected consistently across runtimes.

## File Plan

- `api/models/canonical_assets.py`
- `api/models/__init__.py`
- `api/scripts/validate_canonical_contracts.py`
- `web/src/lib/three-d-contracts.ts`
- `.github/workflows/ci-cd.yml` (contract validation step)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Out of Scope

- DB migrations for `ai_jobs`/asset tables (Story 7.2);
- object storage adapter (Story 7.4);
- FLAME wiring (Story 7.5);
- real TRELLIS/Hunyuan providers (Epic 8).

## Definition of Done

- all ACs satisfied;
- Next TypeScript validation remains green;
- Python compile remains green;
- canonical contract validation script passes in CI;
- P0 invariants remain green;
- BMAD code review has no open Critical/High/Medium finding;
- production Docker build/start/smoke gate is green.

## Review

See `_bmad-output/implementation-artifacts/review-7-1-canonical-3d-data-contracts.md`.

## Completion Evidence

Run #107 passed frontend install/audit/typecheck/build, Python compile, canonical-contract validation, JobQueue validation, P0 invariants, production Docker Compose build, production stack startup and runtime smoke tests.
