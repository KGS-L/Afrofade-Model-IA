# BMAD Code Review — Story 7.1 Canonical 3D Data Contracts

Date: 2026-08-19
Story: 7.1
Review result: PASS WITH FIX APPLIED

## Scope reviewed

- `api/models/canonical_assets.py`
- `api/models/__init__.py`
- `api/scripts/validate_canonical_contracts.py`
- `web/src/lib/three-d-contracts.ts`
- CI canonical-contract validation step
- Story 7.1 acceptance criteria

## Findings

### Fixed during review — optional job identifiers had inconsistent runtime semantics

TypeScript runtime guards rejected empty strings for optional `sourceJobId` and `fitJobId`, while the initial Pydantic models accepted `""`.

Resolution:

- Python now declares `Field(default=None, min_length=1)` for both optional identifiers.
- Contract validation includes negative tests for empty optional source/fit job IDs.

Status: RESOLVED.

## Acceptance criteria review

- Shared `CanonicalHead`, `CanonicalHairAsset`, `TryOnAsset` vocabulary: PASS.
- Coordinate system `Y_UP_RIGHT_HANDED`: PASS.
- Unit `meter`: PASS.
- Scalp anchor version contract: PASS.
- Durable HTTP(S) URLs / local path rejection: PASS.
- Python Pydantic runtime validation: PASS.
- TypeScript runtime guards: PASS.
- Provider-independent round-trip and invalid-input validator: PASS.
- CI step wired before P0 invariants: PASS.

## Validation evidence

Latest CI run for the review fix confirms:

- frontend install/audit/typecheck/build: PASS;
- backend dependency install/compile: PASS;
- canonical 3D contract validation: PASS;
- P0 security invariants: PASS;
- AI model downloader/gatekeeper validation: PASS.

The production Docker gate is tracked at the PR level and must remain green before merge.

## Review conclusion

No open Critical/High/Medium issue remains in Story 7.1 scope. Story can move to `review`; it moves to `done` once the PR-level production Docker gate is green for the current head.
