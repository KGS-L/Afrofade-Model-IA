---
title: "Story 13.1 — Canonical Hair/Beard Taxonomy Bridge"
status: in-dev
epic: 13
priority: M1-7
migration: web/supabase/migrations/25_marketplace_taxonomy_services.sql
---

# Story 13.1

Create stable normalized hair/beard taxonomy IDs shared by marketplace skills, services, portfolios, booking and careers, while preserving immutable legacy `hairstyles_catalog.id` / `hair_asset_versions.style_id` provenance through an explicit bridge table.

Initial taxonomy covers fades/barbering, braids/tresses, locks/locs, afro/twists and beard. Labels/aliases are display/search metadata, never identity keys.
