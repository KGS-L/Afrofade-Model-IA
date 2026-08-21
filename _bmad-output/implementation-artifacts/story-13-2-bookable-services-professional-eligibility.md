---
title: "Story 13.2 — Bookable Services & Professional Eligibility"
status: in-dev
epic: 13
priority: M1-8
migration: web/supabase/migrations/25_marketplace_taxonomy_services.sql
---

# Story 13.2

Create bookable service records that belong to exactly one provider context: either a salon or an independent ProfessionalProfile. Services carry duration, buffers, price/currency, active/bookable state and taxonomy links. Salon services may restrict eligibility to active professional memberships.

All writes remain server-authorized. A service cannot simultaneously belong to salon and professional contexts.
