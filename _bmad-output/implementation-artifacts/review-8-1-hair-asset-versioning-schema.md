# BMAD Review — Story 8.1 Hair Asset Versioning Schema

Date: 2026-08-20
Result: PASS

## Acceptance review

- PASS — `hair_asset_versions` persists style/version/provider/raw/canonical/anchor/polycount/cost/status metadata.
- PASS — `(style_id, version)` uniqueness prevents accidental version overwrite.
- PASS — partial unique index guarantees at most one `published` row per style.
- PASS — `resolve_published_hair_asset` gives consumers a deterministic live catalog version.
- PASS — `publish_hair_asset_version` requires a validated target, serializes on the catalog style, retires the previous published version and publishes the target atomically.
- PASS — raw-only drafts preserve provider provenance when normalization later fails.
- PASS — canonical mesh/preview/anchor map/scalp-anchor version/polycount are mandatory before validated/published state.
- PASS — published payloads are immutable; retired rows are fully immutable and never deleted by the lifecycle.
- PASS — published rows are catalog-readable through RLS; admins retain history visibility.
- PASS — provider provenance includes TRELLIS.2, Hunyuan Multi-View, Meshy experimental and manual import without enabling any paid provider.

## Architecture notes

Story 8.1 deliberately separates provider output from canonical output:

`provider -> raw/styles/<style>/vN -> draft -> HairAssetNormalizer -> canonical/styles/<style>/vN -> validated -> published`

This prevents a provider success from being lost when normalization fails and ensures future HairFitter input always references an immutable, exact published version.

## Final code-head CI evidence

Validated code head before BMAD-only closure: `bd45f0b9fa6f70f965b93221e4d9850baa66099e`.

- P1 Hair Asset Versioning #4 — run `32337436172` — PASS.
- P1 Durable Head Generation #38 — run `32337436056` — PASS.
- P1 Head Job Integration #8 — run `32337435978` — PASS.
- P1 AssetStorage Contract #47 — run `32337436093` — PASS.
- P1 AssetStorage Layout #43 — run `32337436108` — PASS.
- Afrofade CI/CD Pipeline #206 — run `32337435996` — PASS.
  - Next.js audit/typecheck/build — PASS.
  - FastAPI compile/contracts/P0 hardening — PASS.
  - Docker production build — PASS.
  - production stack startup — PASS.
  - P0 security smoke tests — PASS.

## Decision

Story 8.1 is DONE. Epic 8 remains IN PROGRESS. Next story: 8.2 — Fix provider scaffolding defects.
