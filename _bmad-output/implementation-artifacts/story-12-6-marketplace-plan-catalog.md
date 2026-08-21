---
title: "Story 12.6 — Marketplace Plan Catalog Compatibility"
status: in-dev
epic: 12
priority: M1-6
migration: web/supabase/migrations/24_marketplace_plan_finalization.sql
---

# Story 12.6

## Goal
Introduce stable marketplace product IDs while preserving legacy salon plan names and the existing verified/idempotent payment finalization path.

## Product identifiers
- `PROFESSIONAL_PRO`
- `SALON_PRO` -> legacy `PRO`
- `SALON_VIP` -> legacy `VIP`
- `SALON_EXTRA` -> legacy `EXTRA`
- `BUSINESS_MULTI_LOCATION`

Consumer credits remain their own catalog.

## Pricing rule
No professional/business price was approved in BMAD. Those products are server-catalog entries but disabled until positive FCFA prices are configured through server environment. Existing salon prices remain unchanged.

## Compatibility
- old `planName: PRO|VIP|EXTRA` checkout remains accepted during migration;
- stable salon product IDs map to the same legacy salon plan columns;
- `PROFESSIONAL_PRO` finalizes into `professional_subscriptions`;
- consumer credit finalization is unchanged;
- amount always comes from server catalog, never browser input.
