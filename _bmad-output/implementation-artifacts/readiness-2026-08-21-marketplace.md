---
title: "Afrofade Marketplace — Implementation Readiness Review"
status: PASS_WITH_NON_BLOCKING_FOLLOWUPS
created: 2026-08-21
---

# Implementation Readiness — Marketplace / Booking / Careers

## Overall result

**PASS WITH NON-BLOCKING FOLLOW-UPS**

The marketplace track is sufficiently defined to start Story 12.1 after merge. No unresolved product ambiguity blocks identity, salon, professional, taxonomy, discovery or pay-at-provider booking implementation.

## 1. Product readiness — PASS

Resolved:

- hair/beard scope;
- consumer / professional / salon actors;
- independent professional support;
- multi-salon ownership;
- professional access under salon entitlement;
- independent professional paid entitlement;
- booking provider-context model;
- first-available vs specific professional;
- non-custodial money boundary;
- verified booking-backed reviews;
- location/privacy principles;
- deterministic style-aware ranking;
- careers lifecycle;
- no social-feed scope creep;
- phased rollout.

## 2. Architecture readiness — PASS

Defined:

- Supabase/Postgres marketplace domain;
- PostGIS approach;
- additive legacy migration;
- membership/capability model;
- service/skill taxonomy;
- availability model;
- concurrency-safe booking requirement;
- booking events;
- outbox notifications;
- reviews/moderation;
- careers entities;
- RLS/security invariants;
- migration order 12–18;
- relationship to existing 3D architecture.

## 3. Data migration readiness — PASS WITH IMPLEMENTATION VALIDATION

Story 12.2 must inspect the exact production-compatible legacy salon tables/columns before writing final backfill SQL.

This is not a product blocker; it is an implementation-time repository/schema inspection requirement.

The agent must not guess existing column names from planning artifacts.

## 4. Commercial readiness — PASS FOR ARCHITECTURE, PRICING FOLLOW-UP

Stable commercial channels and entitlements are decided.

Final launch price for `PROFESSIONAL_PRO` and exact multi-location pricing are **not blocking** because price/limits are deliberately configuration-driven.

Existing salon plan values remain unchanged until explicit commercial decision.

## 5. Geospatial readiness — PASS WITH ENV PREREQUISITE

PostGIS is the approved approach.

Environment must have PostGIS enabled before geospatial migration. Story 13.4 must include detection/documentation of this prerequisite.

Map UI/provider is not required for MVP; list-based nearby results are enough for release gate M1.

## 6. Notification readiness — PASS

In-app outbox/projection is required.

Email/SMS/WhatsApp providers are adapters and can remain disabled in development/CI. Lack of credentials is not a blocker.

## 7. Payment readiness — PASS FOR MVP

Booking MVP is pay-at-provider and does not require marketplace payout infrastructure.

Future deposits/split payments remain feature-gated Story 17.4 and require provider/legal validation before activation.

## 8. 3D dependency readiness — PASS

Marketplace foundation and booking can be implemented while Hair Asset provider/Fitter work continues.

`try_on_asset_id` remains optional. No marketplace Story may fake 3D completion or call paid hair-generation providers in CI.

## 9. Competitive readiness — PASS

Research confirms active regional booking/salon tools exist; Afrofade positioning is therefore intentionally differentiated around visual intent + style taxonomy + local skill matching + visual-brief booking + verified reputation + careers.

Historical GlamAfric is treated as a caution against broad feature accumulation.

## 10. Security readiness — PASS

Critical invariants are explicit:

- membership not role string;
- entitlement not client state;
- RLS negative tests;
- private coordinates protected;
- booking transaction conflict safety;
- review targets derived from booking;
- applicant data tenant-protected;
- no service-role client exposure;
- no third-party fiat wallet.

## 11. Implementation risks to monitor

### R1 — Legacy role/backfill complexity

Mitigation: additive migration, exact schema inspection, count validation, no destructive cleanup in Story 12.2.

### R2 — Booking concurrency bugs

Mitigation: DB transaction/lock/exclusion strategy + race test before release.

### R3 — Marketplace cold start

Mitigation: marketplace can work without 3D; onboard salons/professionals manually, focus one city/zone, instrument liquidity metrics.

### R4 — Overbuilding

Mitigation: explicit MVP exclusions; complete M1/M2 before social/payment/growth extras.

### R5 — Inconsistent hairstyle naming

Mitigation: canonical taxonomy and mappings before style-aware discovery.

### R6 — Home-location privacy leak

Mitigation: separate public service area/point from any private address and test public projections.

## 12. Go decision

**GO — Start Story 12.1 after the planning branch is merged.**

Stories 17.4 and 17.5 remain intentionally feature-gated/backlog until explicit activation decisions.
