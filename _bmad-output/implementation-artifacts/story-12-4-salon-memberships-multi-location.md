---
title: "Story 12.4 — Salon Entity, Memberships & Multi-location"
status: in-dev
epic: 12
priority: M1-4
migration: web/supabase/migrations/22_marketplace_salon_membership_ops.sql
---

# Story 12.4

## Goal
Create salons as business/location contexts owned through `salon_memberships`, support multiple salons per person, and provide explicit invitation acceptance without converting the user's global account role.

## Invariants
- salon + owner membership are created in one DB transaction/RPC;
- creator keeps personal consumer context;
- no mutation relies only on browser role strings;
- owner/manager authorization is checked server-side and in DB helper logic;
- manager cannot grant owner;
- professional membership grants no billing/ownership permission;
- invitation recipient must authenticate with the invited email before activation;
- one user may own/manage/work at several salons;
- each mutation resolves a concrete `salonId`;
- context-switch UI is Story 12.7.
