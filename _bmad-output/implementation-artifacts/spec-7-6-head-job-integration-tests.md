# BMAD Story 7.6 — Head Job Integration Tests

Date: 2026-08-19
Status: in-progress

## Goal

Prove the durable head-reconstruction lifecycle across the real Afrofade orchestration boundaries before enabling paid hair-generation providers.

## Scope

The integration suite must exercise:

`JobQueue -> DurableJobWorker -> head handler -> HeadGenerationManager -> AssetStorage -> head_assets metadata`

External infrastructure is replaced only at system boundaries. The suite must not require Supabase network access, FLAME model downloads, GPU hardware, TRELLIS, Hunyuan, Meshy, or any paid provider credential.

## Acceptance criteria

1. A head job follows `queued -> running -> completed` and the terminal job output references the durable canonical head asset.
2. Successful generation persists the expected durable metadata: owner, provider, canonical storage reference, coordinate system, unit, scalp-anchor version, vertex count and polygon count.
3. Idempotent enqueue reuses the original durable job rather than creating a duplicate.
4. A transient/unhandled provider failure requeues the job while attempts remain, produces no fake durable asset, and a later attempt can complete exactly once.
5. An expired worker lease is recovered; the stale worker cannot complete/fail the reclaimed job; a new worker can claim it.
6. `ai_jobs` and `head_assets` ownership/RLS contracts reject anonymous/foreign reads and authenticated client mutations, while the FastAPI internal boundary continues to reject missing/invalid internal credentials.
7. The test suite is deterministic and runs in CI without a paid 3D provider.
8. Existing Story 7.2–7.5 gates remain green.

## Non-goals

- No Meshy integration in Story 7.6.
- No TRELLIS.2/LoRA or Hunyuan activation in Story 7.6.
- No change to CanonicalHead, AssetStorage or JobQueue public contracts unless a failing integration test proves a defect.
- No migration away from Supabase in this story.

## Architecture decision carried forward

After Story 7.6, Epic 8 keeps the provider-neutral `HairAssetGenerator` direction:

- `TrellisLoRAProvider` — primary hair-generation provider.
- `HunyuanProvider` — fallback/secondary provider.
- `MeshyProvider` — experimental/benchmark provider, not the primary architecture.

All providers must converge into `CanonicalHairAsset` before `HairFitter`.