---
stepsCompleted:
  - "correct-course-post-p0"
  - "prd-refresh-2026-08-19"
  - "architecture-refresh-2026-08-19"
inputDocuments:
  - "_bmad-output/planning-artifacts/change-proposal-2026-08-19-p0-to-p1.md"
  - "_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-19/prd.md"
  - "_bmad-output/architecture/architecture-Afrofade-2026-08-19/ARCHITECTURE-SPINE.md"
---

# Afrofade — Epic & Story Breakdown Post-P0

## Historical continuity

Les Epics 1 à 5 de la phase initiale restent **historiquement terminés** dans `sprint-status.yaml`. Le Correct Course ne réutilise pas leurs numéros. Les nouvelles stories commencent à **Epic 6** afin de préserver la traçabilité BMAD et les anciens artifacts/specs.

Les implémentations P0.1/P0.2/P0.3 sont considérées comme un hardening transversal de la baseline historique et sont documentées dans la PR sécurité + le Correct Course.

---

# Epic 6 — Identity, Commerce & Tenant Hardening Completion

**Goal:** clôturer les derniers éléments post-P0 qui doivent rester server-authoritative et préparer les nouvelles tables P1 avec les mêmes garanties de sécurité.

## Story 6.1 — Ownership/RLS propagation to post-P0 tables

**AC:**
- `ai_jobs`, `head_assets`, `hair_asset_versions`, `try_on_exports` ont policies/ownership explicites ;
- customer ne lit que ses propres assets/jobs ;
- salon ne lit que ses clients/jobs ;
- admin operations sont vérifiées server-side ;
- service role reste server-only.

## Story 6.2 — Credit consumption service

As a customer,
I want billable actions to reserve/commit/refund credits atomically,
So that technical failures or retries cannot double-charge me.

**AC:**
- `CREATE_HEAD` et `RECONSTRUCT_NEW_PHOTOS` coûtent 2 crédits ;
- `DOWNLOAD_HD` coûte 1 ;
- free actions coûtent 0 ;
- reserve/commit/refund ou mécanisme atomique équivalent ;
- idempotency key obligatoire ;
- failure before successful action releases/refunds reservation.

## Story 6.3 — Provider rollout completion

**AC:**
- Money Fusion live/sandbox URL réelle configurée hors Git ;
- GeniusPay reste feature-gated tant que l'endpoint HTTPS marchand n'est pas validé ;
- provider list n'affiche que les providers activés ;
- payment E2E sandbox documented/tested when credentials are available.

---

# Epic 7 — Durable 3D Head Pipeline

**Goal:** remplacer les jobs synchrones/in-memory et les outputs `/tmp` par un pipeline persistant, restart-safe et observable produisant `CanonicalHead`.

## Story 7.1 — Canonical 3D data contracts

As a 3D developer,
I want explicit canonical contracts,
So that FLAME/Hunyuan/hair fitting can evolve independently.

**AC:**
- define `CanonicalHead`, `CanonicalHairAsset`, `TryOnAsset` schemas in TypeScript and Python ;
- coordinate system = `Y_UP_RIGHT_HANDED` ;
- unit = `meter` ;
- scalp anchor contract is versioned ;
- provider output validation exists ;
- schema round-trip/sample validation tested.

**Priority:** P1-1.

## Story 7.2 — Persistent `ai_jobs` schema & JobQueue

**AC:**
- migration creates `ai_jobs` with type/status/attempts/lease/timestamps/input/output/errors ;
- states = queued/running/completed/failed/cancelled ;
- transactional claim with `FOR UPDATE SKIP LOCKED` or equivalent ;
- idempotency key supported ;
- RLS/ownership from Story 6.1 applied.

**Priority:** P1-2.

## Story 7.3 — Restart-safe Python worker

**AC:**
- FastAPI submit returns durable job ID before heavy processing ;
- worker claims jobs safely ;
- heartbeat/lease recovers crashed worker ;
- retry bounded ;
- structured failure persisted ;
- restart does not erase state.

**Priority:** P1-3.

## Story 7.4 — AssetStorage abstraction

**AC:**
- interface supports put/delete/signed upload/signed read/exists/metadata ;
- Supabase Storage adapter first ;
- prefixes separate temporary photos, canonical heads, raw/canonical hair, exports ;
- no production URL points to `/tmp` or developer filesystem.

**Priority:** P1-4.

## Story 7.5 — `HeadGenerationManager` -> real FLAME pipeline

**AC:**
- fix current provider import/class mismatch ;
- FLAME provider invokes current `ReconstructionPipelineService` path ;
- output normalized and uploaded through `AssetStorage` ;
- `head_assets` metadata persisted ;
- job output references canonical asset ;
- fake success impossible.

**Priority:** P1-5.

## Story 7.6 — Head job integration tests

**AC:**
- queued -> running -> completed tested ;
- failure/retry tested ;
- lease/recovery tested ;
- unauthorized access rejected ;
- durable asset metadata asserted ;
- CI runs lifecycle tests without paid 3D providers.

**Priority:** P1-6.

---

# Epic 8 — Hair Asset Factory

**Goal:** transformer `HairAssetGenerator` en fabrique réelle de catalogue : génération une fois, normalisation, versioning et réutilisation multiple.

## Story 8.1 — Hair asset versioning schema

**AC:**
- `hair_asset_versions` stores style/version/provider/raw/canonical/anchors/polycount/cost/status ;
- one published version can be resolved ;
- retired versions remain auditable.

## Story 8.2 — Fix provider scaffolding defects

**AC:**
- `ManualHairProvider.get_result` does not reference undefined `input_data` ;
- provider jobs/results are per-request, not constant fake IDs ;
- scaffold mode is explicit and cannot masquerade as provider success.

## Story 8.3 — HairAssetNormalizer real pipeline

**AC:**
- normalize orientation/unit/scale ;
- generate/version scalp anchors ;
- enforce polygon budget and LOD policy ;
- persist canonical mesh/preview/metadata ;
- produce validation report.

## Story 8.4 — TRELLIS.2 + Afrofade LoRA provider

**AC:**
- credentials server-only ;
- async provider job maps to internal `ai_job` ;
- provider cost/duration recorded ;
- raw output stored then normalized ;
- failure/retry explicit.

## Story 8.5 — Hunyuan3D Multi-View provider

**AC:**
- validated multi-view input ;
- provider job/result maps to internal job ;
- same normalizer used ;
- provenance/version preserved.

---

# Epic 9 — Real-Time Hair Fitting & Studio

**Goal:** rendre l'essayage rapide, mesurable et indépendant des APIs de génération du catalogue.

## Story 9.1 — HairFitter contract

**AC:**
- input = `CanonicalHead` + `CanonicalHairAsset` ;
- output = transform/anchors + optional fitted mesh ;
- deterministic cache key ;
- catalog asset is immutable during fitting.

## Story 9.2 — Catalog swap performance

**AC:**
- cached/preloaded style switch does not call a generation provider ;
- target <500 ms measured p50/p95 ;
- viewer handles repeated swaps without memory leak/crash ;
- clear loading/degraded state.

## Story 9.3 — Line-Up & durable export

**AC:**
- line-up remains interactive ;
- export references exact head/hair versions ;
- B2C HD export integrates credit consumption ;
- salon export integrates plan permission.

---

# Epic 10 — Consumer Credits Journey

**Goal:** rendre l'espace `customer` opérationnel de bout en bout.

## Story 10.1 — Customer dashboard & wallet

**AC:**
- verified balance/purchases/head assets/recent looks ;
- recharge opens unified checkout ;
- no salon-only controls.

## Story 10.2 — Customer head creation

**AC:**
- reserve 2 credits before accepted job ;
- commit after successful generation ;
- release/refund on technical failure ;
- duplicate submit cannot double-charge.

## Story 10.3 — Free hairstyle exploration

**AC:**
- published catalog styles can be tried on owned head for 0 credits ;
- ownership verified ;
- no hair generation provider called during normal try-on.

## Story 10.4 — HD download & share

**AC:**
- HD export costs 1 credit per idempotent billable export ;
- share remains free ;
- asset ownership enforced.

---

# Epic 11 — Salon/Admin Operations & Production Readiness

**Goal:** rendre les espaces salon/admin et l'exploitation production complets sur les flux critiques.

## Story 11.1 — Salon dashboard server truth

**AC:**
- active plan/quota/client count from DB ;
- profile completion persisted server-side ;
- client head lifecycle visible ;
- payment/job state visible ;
- no localStorage commercial authority.

## Story 11.2 — Salon quota engine

**AC:**
- plan limits = 20/60/120 new heads/month ;
- try-ons on existing heads do not consume new-head quota ;
- concurrency-safe increment/reset ;
- billing-cycle semantics tested.

## Story 11.3 — Admin KPI & job dashboard

**AC:**
- users/salons ;
- active subscriptions/MRR ;
- provider payment success/fail ;
- credit revenue/liability ;
- 3D job success/p95/errors.

## Story 11.4 — Admin hair catalog workflow

**AC:**
- create generation job ;
- review raw/normalized previews ;
- publish/retire version ;
- inspect cost/provenance.

## Story 11.5 — Privacy/retention/observability

**AC:**
- biometric consent record where required by product policy ;
- purge storage + DB references safely ;
- structured job/payment IDs and errors ;
- no secrets logged ;
- backup/recovery/rollback documented.

## Story 11.6 — CI E2E expansion

**AC:**
- auth ownership negative tests ;
- job lifecycle tests ;
- credit reserve/commit/refund tests ;
- payment idempotence tests ;
- production Compose smoke tests remain green.

---

# Recommended Next Sprint

**Sprint:** P1 Durable 3D Infrastructure  
**Epic:** 7  
**Goal:** rendre la reconstruction de tête réellement asynchrone, persistante et servie depuis object storage.

Ordre strict :

1. 7.1 Canonical 3D data contracts ;
2. 7.2 Persistent `ai_jobs` schema & JobQueue ;
3. 7.3 Restart-safe Python worker ;
4. 7.4 AssetStorage abstraction ;
5. 7.5 HeadGenerationManager -> FLAME real pipeline ;
6. 7.6 Head job integration tests.

**Gate:** ne pas commencer TRELLIS/Hunyuan réels avant que 7.1–7.6 soient PASS.
