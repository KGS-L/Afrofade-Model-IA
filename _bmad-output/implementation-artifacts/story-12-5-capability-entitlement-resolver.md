---
title: "Story 12.5 — Capability / Entitlement Resolver"
status: in-dev
epic: 12
priority: M1-5
migration: web/supabase/migrations/23_marketplace_capability_resolver.sql
---

# Story 12.5

## Goal
Centralize server-side authorization around stable capabilities and explicit context instead of `user_profiles.role` shortcuts.

## Initial capabilities
- `professional.profile.manage` — identity ownership, no paid entitlement required;
- `professional.independent.list` / `professional.independent.book` — owned professional profile + active personal Pro entitlement;
- `salon.profile.manage` / `salon.team.manage` — active owner/manager membership;
- `salon.booking.work` — active salon membership + active salon subscription; professional members inherit salon entitlement;
- `salon.marketplace.list` — active salon membership + active salon subscription;
- `salon.location.create` — owner + qualifying active salon plan; first salon creation remains possible before this gate;
- `admin.marketplace.manage` — explicit legacy admin marker.

Consumer credits remain independent from commercial entitlements.

## Security
Resolver inputs are server-issued actor/context IDs. Browser-supplied role, plan, price or entitlement flags are never authoritative.
