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

## Overview

Ce découpage remplace la version pré-P0. Il reflète le produit réel B2B/B2C, les rôles `customer/salon/admin`, le commerce server-authoritative, la stack Next 16/React 19 et l'architecture `HeadGenerationManager + HairAssetGenerator + HairFitter`.

Les stories P0 déjà implémentées restent représentées pour traçabilité, mais la prochaine tranche de Build est **Epic 3 — Durable 3D Head Pipeline**.

---

# Epic 1 — Identity, RBAC & Tenant Security

**Goal:** rendre l'identité et l'isolation customer/salon/admin fiables de bout en bout.

## Story 1.1 — Session Supabase vérifiée côté serveur

As a user,
I want my protected session to be validated against Supabase,
So that a forged cookie/header cannot grant access.

**AC:**
- Given a missing/invalid access token, when a protected route is requested, then it returns 401/redirects to login.
- Given a valid token, when the session endpoint runs, then identity is resolved server-side.
- No hard-coded OTP/demo login exists in production code.

**Status:** IMPLEMENTED P0.

## Story 1.2 — RBAC customer/salon/admin

As a platform operator,
I want roles loaded from `user_profiles`,
So that admin/salon privileges cannot be minted by the browser.

**AC:**
- `user_profiles.role` supports `customer`, `salon`, `admin`.
- `/admin` requires server-verified `admin`.
- salon operations require a verified `salon_id`.
- customer without salon cannot subscribe to a salon plan.

**Status:** IMPLEMENTED P0, provisioning production à valider.

## Story 1.3 — Ownership & RLS end-to-end

As a tenant,
I want every private resource scoped to my identity,
So that one account cannot read/write another account's data.

**AC:**
- uploads derive owner path server-side ;
- heads/jobs/transactions enforce owner or salon scope ;
- authenticated clients have only explicit RLS reads/writes ;
- service-role mutations remain server-only.

**Status:** PARTIAL — P1 tables must inherit the same rules.

---

# Epic 2 — Commerce Platform B2B/B2C

**Goal:** fournir un moteur commercial unique, vérifié et idempotent pour abonnements salons et crédits particuliers.

## Story 2.1 — Checkout provider-neutral

As a buyer,
I want to choose a supported payment provider,
So that I can pay without the client deciding the price.

**AC:**
- input = provider + product IDs ;
- server recalculates price ;
- `payment_transactions` is persisted `pending` before provider call ;
- unsupported/disabled provider fails closed.

**Status:** IMPLEMENTED P0.3.

## Story 2.2 — Money Fusion authoritative verification

**AC:**
- webhook uses `tokenPay` ;
- server calls Money Fusion payment status endpoint ;
- token/amount/status are compared to the internal transaction ;
- duplicate notifications do not duplicate business effects.

**Status:** IMPLEMENTED, live connectivity deferred.

## Story 2.3 — GeniusPay HMAC verification

**AC:**
- raw payload HMAC-SHA256 verified constant-time ;
- transaction is re-fetched by reference ;
- amount/reference/status must match ;
- provider disabled until secure HTTPS merchant endpoint/credentials validated.

**Status:** IMPLEMENTED, provider activation deferred.

## Story 2.4 — B2C wallet & credit ledger

As a customer,
I want a rechargeable wallet,
So that I pay only for costly actions without monthly subscription.

**AC:**
- packs 5/12/30 credits map to server catalog ;
- purchase finalization credits wallet atomically ;
- every delta has ledger entry/idempotency key ;
- balance cannot be client-authored.

**Status:** IMPLEMENTED purchase ledger; consumption endpoints remain to complete.

## Story 2.5 — Credit consumption service

As a customer,
I want credits deducted only when a billable action is accepted,
So that failed jobs do not incorrectly consume balance.

**AC:**
- reserve/commit/refund semantics or equivalent atomic pattern ;
- `CREATE_HEAD` / `RECONSTRUCT_NEW_PHOTOS` cost 2 ;
- `DOWNLOAD_HD` costs 1 ;
- free actions never decrement balance ;
- retry/idempotency prevents double charge.

**Status:** TODO.

---

# Epic 3 — Durable 3D Head Pipeline

**Goal:** remplacer les jobs synchrones/in-memory et les outputs `/tmp` par un pipeline persistant, restart-safe et observable produisant `CanonicalHead`.

## Story 3.1 — Canonical 3D data contracts

As a 3D developer,
I want explicit canonical contracts,
So that FLAME/Hunyuan/hair fitting can evolve independently.

**AC:**
- define `CanonicalHead`, `CanonicalHairAsset`, `TryOnAsset` shared schemas ;
- lock coordinate system `Y_UP_RIGHT_HANDED` and unit `meter` ;
- version scalp anchor contract ;
- validate provider output before publication.

**Priority:** P1-1.

## Story 3.2 — Persistent `ai_jobs` schema & JobQueue

As an operator,
I want jobs persisted in Postgres,
So that work survives process restarts and can be retried safely.

**AC:**
- migration creates `ai_jobs` with job type/status/attempts/lease/timestamps/input/output/errors ;
- supported states: queued/running/completed/failed/cancelled ;
- claim uses transactional lock/`SKIP LOCKED` or equivalent ;
- idempotency key supported ;
- RLS/ownership rules applied.

**Priority:** P1-2.

## Story 3.3 — Restart-safe Python worker

As an operator,
I want a separate worker to claim queued jobs,
So that FastAPI request latency is decoupled from 3D processing.

**AC:**
- FastAPI submission returns job ID before heavy work ;
- worker claims one/more jobs safely ;
- heartbeat/lease handles crashed worker ;
- retry is bounded ;
- structured failure persisted ;
- process restart does not erase job state.

**Priority:** P1-3.

## Story 3.4 — AssetStorage abstraction

As a developer,
I want durable object storage behind an interface,
So that generated assets are not tied to container filesystem paths.

**AC:**
- interface supports put/delete/signed upload/signed read/exists/metadata ;
- Supabase Storage adapter implemented first ;
- logical prefixes separate temporary photos, canonical heads, raw/canonical hair, exports ;
- no production URL points to `/tmp` or developer path.

**Priority:** P1-4.

## Story 3.5 — `HeadGenerationManager` wired to real FLAME pipeline

As a user,
I want submitted photos to produce a real canonical head,
So that the studio uses the actual reconstruction engine.

**AC:**
- fix provider import/class mismatch ;
- FLAME provider invokes current reconstruction pipeline implementation ;
- output is normalized and uploaded via `AssetStorage` ;
- `head_assets` metadata persisted ;
- job output references canonical asset ID/URL ;
- fake success fallback impossible.

**Priority:** P1-5.

## Story 3.6 — Head job integration tests

**AC:**
- submission -> queued -> running -> completed tested ;
- failure/retry tested ;
- restart/lease recovery tested ;
- unauthorized access rejected ;
- generated asset metadata persisted ;
- CI runs lifecycle tests without requiring live paid providers.

**Priority:** P1-6.

---

# Epic 4 — Hair Asset Factory

**Goal:** transformer HairAssetGenerator en fabrique réelle de catalogue, avec génération une fois et réutilisation multiple.

## Story 4.1 — Hair asset versioning schema

**AC:**
- `hair_asset_versions` stores style/version/provider/raw/canonical/anchors/polycount/cost/status ;
- published version identifiable ;
- retired version remains auditable.

## Story 4.2 — Fix scaffolding defects

**AC:**
- `ManualHairProvider.get_result` no longer references undefined `input_data` ;
- provider interfaces return per-job result rather than constant fake IDs ;
- scaffold/demo mode is explicit and cannot masquerade as provider success.

## Story 4.3 — HairAssetNormalizer real pipeline

**AC:**
- normalize orientation/unit/scale ;
- generate/version scalp anchors ;
- enforce polygon budget/LOD policy ;
- persist canonical mesh/preview/metadata ;
- validation report produced.

## Story 4.4 — TRELLIS.2 + Afrofade LoRA provider

**AC:**
- provider credentials server-only ;
- async job mapped to internal job ;
- provider cost/duration recorded ;
- output stored raw then normalized ;
- failure/retry policy explicit.

## Story 4.5 — Hunyuan3D Multi-View provider

**AC:**
- accepts validated multi-view source set ;
- provider job/result mapped to internal job ;
- output enters same normalizer ;
- provenance/version preserved.

---

# Epic 5 — Real-Time Hair Fitting & Studio

**Goal:** rendre l'essayage rapide et indépendant des providers de génération.

## Story 5.1 — HairFitter contract

**AC:**
- input = canonical head + canonical hair ;
- output = transform/anchors and optional fitted mesh ;
- fitting errors do not mutate catalog asset ;
- deterministic cache key available.

## Story 5.2 — Catalog swap <500ms target

**AC:**
- preloaded/cached styles switch without provider API call ;
- measure p50/p95 swap time ;
- fallback/loading state clear ;
- R3F remains stable under repeated swaps.

## Story 5.3 — Line-Up & export

**AC:**
- line-up control remains interactive ;
- HD export can create billable B2C action ;
- salon export follows plan permissions ;
- resulting export references exact head/hair versions.

---

# Epic 6 — Consumer Credits Journey

**Goal:** rendre l'espace `customer` réellement opérationnel de bout en bout.

## Story 6.1 — Customer dashboard & wallet

**AC:**
- shows verified balance, purchases, head assets, recent looks ;
- recharge opens unified checkout ;
- no salon-only controls displayed.

## Story 6.2 — Customer head creation with credit reservation

**AC:**
- checks/reserves 2 credits before job submission ;
- successful job commits cost ;
- technical failure refunds/releases reservation ;
- duplicate submission cannot double charge.

## Story 6.3 — Free hairstyle exploration

**AC:**
- customer can apply catalog assets to owned head without debit ;
- ownership checked ;
- published assets only.

## Story 6.4 — HD download & share

**AC:**
- HD download costs 1 credit once per billable export request/idempotency key ;
- share action free ;
- downloadable asset belongs to user.

---

# Epic 7 — Salon Operations & Admin

**Goal:** rendre les espaces salon/admin complets sur les flux opérationnels essentiels.

## Story 7.1 — Salon dashboard server truth

**AC:**
- active plan/quota/client count sourced from DB ;
- profile completion updates persisted server-side ;
- client head lifecycle visible ;
- payment state visible ;
- no localStorage subscription authority.

## Story 7.2 — Salon quota engine

**AC:**
- quota uses current plan limits 20/60/120 new heads/month ;
- existing-head hairstyle try-ons do not consume new-head quota ;
- concurrency safe increment ;
- billing-cycle reset rule defined/tested.

## Story 7.3 — Admin KPI dashboard

**AC:**
- total users/salons ;
- active subscriptions by plan ;
- MRR FCFA ;
- conversion ;
- provider payment success/fail ;
- credit revenue/balance liabilities ;
- 3D job success/p95.

## Story 7.4 — Admin hair catalog workflow

**AC:**
- create generation job ;
- review raw/normalized preview ;
- publish/retire version ;
- inspect generation cost/provenance.

---

# Epic 8 — Production Operations, Privacy & Compliance Controls

**Goal:** maintenir sécurité, observabilité, rétention et capacité d'exploitation.

## Story 8.1 — Biometric consent & retention policy

**AC:**
- consent recorded before facial capture where required by product policy ;
- temporary photos/head assets have retention metadata ;
- purge removes storage + DB references safely ;
- permanent saves require explicit action/policy.

## Story 8.2 — Job/payment observability

**AC:**
- structured IDs/timestamps/errors ;
- dashboards/logs can correlate user -> payment/job -> output ;
- provider costs captured when available ;
- no secret values logged.

## Story 8.3 — Backup/recovery & incident readiness

**AC:**
- database backup strategy documented/tested ;
- asset recovery/retention documented ;
- rollback path for migrations/deploy ;
- production required secrets validated fail-closed.

## Story 8.4 — CI E2E expansion

**AC:**
- auth ownership negative tests ;
- job lifecycle tests ;
- credit reserve/commit/refund tests ;
- payment idempotence tests ;
- smoke tests run against production Compose.

---

# Recommended Next Sprint

**Sprint Goal:** rendre la reconstruction de tête réellement asynchrone, persistante et servie depuis object storage.

Stories candidates, ordre strict :

1. 3.1 Canonical 3D data contracts ;
2. 3.2 Persistent `ai_jobs` schema & JobQueue ;
3. 3.3 Restart-safe Python worker ;
4. 3.4 AssetStorage abstraction ;
5. 3.5 HeadGenerationManager -> FLAME real pipeline ;
6. 3.6 Head job integration tests.

Gate : ne pas commencer les providers TRELLIS/Hunyuan réels avant que 3.1–3.6 soient PASS.
