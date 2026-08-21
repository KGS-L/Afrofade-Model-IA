---
title: "Story 12.3 — ProfessionalProfile Domain + Onboarding"
status: in-dev
epic: 12
priority: M1-3
---

# Story 12.3 — ProfessionalProfile Domain + Onboarding

## Goal
Allow any authenticated Afrofade user to explicitly create and edit one professional identity without changing or destroying their personal consumer context.

## Security contract
- owner identity always comes from the verified Supabase session;
- client cannot choose `user_id`, verification state or listing state;
- no global `professional` role is introduced;
- profile remains `draft` in this story;
- public listing/bookability waits for entitlement + listing rules in Stories 12.5/13.5;
- no salon membership is required;
- no duplicate auth account is created.

## UX
Entry route: `/pro/onboarding` after an explicit action such as “Devenir professionnel”.
Foundation flow collects professional identity, operating mode, service area and career availability, then shows a preview. Services, portfolio and detailed availability are progressively enriched by later stories that own those tables.

## Acceptance evidence
- authenticated GET returns only own profile;
- authenticated PUT upserts only own profile;
- second profile for same user cannot be created;
- invalid enum/slug input fails closed;
- no route mutates `user_profiles.role`;
- consumer context remains intact.
