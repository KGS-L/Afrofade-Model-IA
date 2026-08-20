# BMAD Story 8.1 — Hair Asset Versioning Schema

Status: done
Epic: 8 — Hair Asset Factory
Priority: P1

## Goal

Establish the durable catalog contract that lets Afrofade generate a hairstyle once, preserve provider provenance, normalize it, publish one immutable version, and reuse that exact version across many try-ons without calling a generation provider again.

## Acceptance criteria

- `hair_asset_versions` stores style/version/provider/raw/canonical/anchors/polycount/cost/status.
- `(style_id, version)` is unique.
- at most one `published` version exists for a style at database level.
- `resolve_published_hair_asset(style_id)` deterministically returns the live catalog version.
- publishing requires a `validated` target and atomically retires the previous published version.
- retired versions are retained and remain admin-auditable.
- published/retired asset payloads are immutable; retirement never deletes historical rows.
- raw and canonical storage references are versioned under the private `hair-assets` bucket.
- a `draft` can persist raw provider output before normalization; canonical mesh/preview/anchors/polycount become mandatory before `validated` or `published`.
- public/authenticated catalog reads expose only `published` versions; admin can audit history.
- provider provenance supports `trellis2`, `hunyuan_multiview`, `meshy`, and `manual`.
- no provider API is called or enabled by Story 8.1.

## Storage contract

Raw provider output:
`hair-assets/raw/styles/<style_id>/v<version>/...`

Canonical normalized output:
`hair-assets/canonical/styles/<style_id>/v<version>/...`

The database stores bucket/path references, never expiring provider URLs.

## Lifecycle

`draft -> validated -> published -> retired`

A version is allowed to enter `draft` as soon as its raw provider artifact is durably stored. This deliberately supports the case where provider generation succeeds but HairAssetNormalizer later fails: the raw artifact, provider provenance and cost remain auditable.

Transition to `validated` is the canonical completeness gate: canonical mesh, preview, anchor map, scalp-anchor version and polygon count must all exist. Publishing a newer validated version changes the former published row only to `retired`; it is never deleted.

Once published, provenance and geometry metadata become immutable. A retired version is fully immutable.

## Provider strategy carried forward

- `trellis2`: primary generation provider in Story 8.4.
- `hunyuan_multiview`: fallback/secondary in Story 8.5.
- `meshy`: experimental/benchmark provider, not enabled yet.
- `manual`: controlled catalog/import path.

All providers must eventually converge into the same `CanonicalHairAsset` contract before HairFitter can consume an asset.

## Non-goals

- no TRELLIS API integration;
- no LoRA training;
- no Hunyuan API integration;
- no Meshy API integration;
- no real HairAssetNormalizer implementation;
- no HairFitter changes.

## CI

`.github/workflows/p1-hair-asset-versioning.yml` runs a provider-independent schema/contract validator with no paid provider credentials.
