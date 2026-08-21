---
title: "Story 13.6 — Nearby Search & Deterministic Ranking V1"
status: in-dev
epic: 13
priority: M1-12
migration: web/supabase/migrations/28_marketplace_public_discovery.sql
---

# Story 13.6

Implement paginated discovery across verified/published/entitled salons and independent professionals. Ranking V1 is deterministic and uses only signals available in M1: normalized style/service match, geospatial distance when coordinates are supplied, city/neighborhood fallback and stable tie-breakers. Availability and verified-review signals are added later when their domains exist.

Consumer coordinates are transient RPC inputs; they are not persisted. Hidden/private professional coordinates are never read by public discovery.
