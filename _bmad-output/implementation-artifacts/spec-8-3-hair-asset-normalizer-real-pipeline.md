# BMAD Story 8.3 — HairAssetNormalizer Real Pipeline

Status: in-progress
Epic: 8 — Hair Asset Factory
Priority: P1

## Goal

Turn provider raw GLB output into a provider-independent, versioned Afrofade catalog asset that is safe to reuse across many try-ons without calling the generation provider again.

## Source acceptance criteria

- normalize orientation/unit/scale;
- generate/version scalp anchors;
- enforce polygon budget and LOD policy;
- persist canonical mesh/preview/metadata;
- produce validation report.

## Canonical policy

- Coordinate system: `Y_UP_RIGHT_HANDED`.
- Unit: `meter`.
- Canonical front axis: `+Z`; up axis: `+Y`.
- Policy version: `afrofade-hair-normalizer-v1`.
- Scalp anchor version: `afrofade-hair-anchors-v1`.
- Default polygon budget: 60,000 triangles.
- Default LOD ratios: 50% and 25% of canonical triangle count.
- Provider mesh is never silently decimated to satisfy the canonical budget. Over-budget output fails validation and remains auditable as `draft`; provider-side remesh is required.

## Scale contract

Provider adapters must supply source coordinate system, physical unit, forward axis and any provider-specific scale multiplier. When a source scalp/reference span is known, the normalizer maps it to the canonical 0.18 m reference span. If the span is unknown, metric scale is preserved after unit/source-scale conversion and the validation report records the missing reference as a warning.

## Durable lifecycle

`provider raw -> hair-assets/raw/styles/<style>/vN -> draft -> HairAssetNormalizer -> hair-assets/canonical/styles/<style>/vN -> validated`

Normalization preflight requires the exact persisted raw `StoredAssetRef`, provider and draft version. Canonical upload paths are deterministic. DB commit is performed through a service-role RPC that locks the version and re-checks provider/raw provenance before `draft -> validated`.

Failed validation writes a durable `validation_report` while keeping the version in `draft`. Canonical uploads are cleaned up on failed commits; raw provider output is never deleted by the normalizer.

## Generated artifacts

- `hair.glb` — canonical master mesh;
- `preview.webp` — CPU-generated front orthographic preview without a GPU/display dependency;
- `anchors.json` — versioned geometric scalp anchor map;
- `lod-1.glb`, `lod-2.glb` — deterministic rendering LODs;
- DB `validation_report` + merged `provider_metadata`.

## LOD note

Story 8.3 LODs use deterministic face subsampling so the canonical master remains untouched and the pipeline has no extra native mesh-decimation dependency. Provider-side remesh remains authoritative for canonical polygon quality. A later performance story may replace the LOD strategy without changing the `CanonicalHairAsset` contract.

## Provider state

- TRELLIS.2 remains scaffold-only until Story 8.4.
- Hunyuan3D Multi-View remains scaffold-only until Story 8.5.
- Meshy remains experimental scaffold-only.
- No paid provider credentials or network calls are introduced by Story 8.3.

## Validation

`python3 api/scripts/validate_hair_asset_normalizer.py`

Dedicated CI gate: `.github/workflows/p1-hair-asset-normalizer.yml`.
