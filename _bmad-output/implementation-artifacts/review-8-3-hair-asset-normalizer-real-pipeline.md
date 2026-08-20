# BMAD Review — Story 8.3 HairAssetNormalizer Real Pipeline

Date: 2026-08-20
Result: PASS

## Acceptance review

- PASS — raw provider GLB is normalized into `Y_UP_RIGHT_HANDED`, meter, front `+Z`, up `+Y`.
- PASS — provider coordinate system, unit, forward axis, scale multiplier and optional reference span are explicit inputs; unsupported/ambiguous geometry metadata fails closed.
- PASS — canonical scale may use a known reference span mapped to 0.18 m; missing reference span is recorded as a validation warning rather than silently guessed.
- PASS — canonical master polygon budget defaults to 60,000 triangles and over-budget meshes fail validation instead of being silently decimated.
- PASS — deterministic rendering LODs are generated separately; the canonical master mesh is kept unchanged.
- PASS — versioned geometric scalp anchors are persisted as `anchors.json` using `afrofade-hair-anchors-v1`.
- PASS — CPU-only transparent WebP preview generation has no GPU/display dependency.
- PASS — canonical GLB, preview, anchors and LODs use deterministic `hair-assets/canonical/styles/<style>/vN/...` paths.
- PASS — Python raw/canonical path builders now match the Story 8.1 SQL contracts (`raw/styles/...`, `canonical/styles/...`).
- PASS — exact provider and raw `StoredAssetRef` provenance are re-checked before normalization.
- PASS — `persist_hair_asset_normalization` locks the draft row, validates provenance and only commits `draft -> validated` when the validation report contains `valid: true`.
- PASS — failed normalization records an auditable `valid: false` report and leaves the version in `draft`.
- PASS — canonical uploads are cleaned up on failed commit; provider raw output remains durable.
- PASS — no live TRELLIS.2, Hunyuan3D or Meshy API call or credential was introduced.

## Architecture review

The reusable catalog boundary is now:

`provider raw -> raw/styles/<style>/vN -> draft -> HairAssetNormalizer -> canonical/styles/<style>/vN -> validated`

Provider-specific generation stops at raw provenance. All downstream fitting can depend on a versioned canonical asset contract rather than on TRELLIS/Hunyuan/Meshy output conventions.

The LOD implementation intentionally uses deterministic face subsampling in Story 8.3. It is a rendering artifact policy, not the canonical quality policy. Provider-side remesh remains authoritative when a generated master exceeds the canonical polygon budget.

## Final code-head CI evidence

Validated implementation head before BMAD-only closure: `2d08a4036612573640c1b84c6a4f9fe1f9fdad88`.

- P1 Hair Asset Normalizer #2 — run `32342842945` — PASS.
- P1 Provider Scaffolding Safety #5 — run `32342842983` — PASS.
- P1 Hair Asset Versioning #11 — run `32342842925` — PASS.
- P1 AssetStorage Contract #52 — run `32342842950` — PASS.
- P1 AssetStorage Layout #48 — run `32342842966` — PASS.
- P1 Durable Head Generation #45 — run `32342842927` — PASS.
- P1 Head Job Integration #15 — run `32342842930` — PASS.
- Afrofade CI/CD Pipeline #213 — run `32342843008` — PASS.
  - Next.js audit/typecheck/build — PASS.
  - FastAPI compile/contracts/P0 — PASS.
  - production Docker build — PASS.
  - production stack startup — PASS.
  - P0 runtime smoke tests — PASS.

## Decision

Story 8.3 is DONE. Epic 8 remains IN PROGRESS.

Next story: **8.4 — TRELLIS.2 + Afrofade LoRA provider**.