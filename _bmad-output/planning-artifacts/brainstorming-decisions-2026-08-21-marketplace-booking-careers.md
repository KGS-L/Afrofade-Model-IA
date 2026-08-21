---
title: "Afrofade — BMAD Brainstorming Decisions: Marketplace, Booking & Careers"
status: active
created: 2026-08-21
branch: agent/bmad-marketplace-booking-careers-vision
source: _bmad-output/planning-artifacts/brainstorming-2026-08-21-marketplace-booking-careers.md
---

# Afrofade — Product Brainstorming Decision Log

This file records only decisions explicitly accepted during the product brainstorming session. It does not yet modify the canonical PRD, architecture or epics.

## D01 — Scope of the professional persona

**Status:** ACCEPTED

Afrofade models a **hair professional** broadly rather than a barber-only persona.

Included professional specialties may include, without being limited to:

- barbering;
- men's and women's hairdressing;
- braids / tresses;
- locks / locs;
- twists;
- afro-textured hair styling;
- hair coloring where relevant to hair services;
- beard grooming / facial hair services.

Afrofade remains intentionally focused on the **hair + beard ecosystem**. It must not become a generic beauty marketplace covering unrelated categories such as nails, general aesthetics, makeup or spa services unless a future explicit product decision changes this scope.

### Product consequence

The canonical professional identity should use a neutral model such as `ProfessionalProfile` / `HairProfessionalProfile` with specialties, rather than encoding the profession as a single immutable `barber` role.

### Architecture consequence

A professional person's account and a salon/business entity remain separate concepts. Employment/affiliation is represented through memberships/relationships rather than by turning the salon itself into the user's permanent role.
