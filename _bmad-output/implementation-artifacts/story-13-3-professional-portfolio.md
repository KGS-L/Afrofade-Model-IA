---
title: "Story 13.3 — Professional Portfolio"
status: in-dev
epic: 13
priority: M1-9
migration: web/supabase/migrations/26_marketplace_professional_portfolio.sql
---

# Story 13.3

Create a private-owned professional portfolio domain with moderated/publication state and normalized style tags. Portfolio media is stored in a private `portfolio` bucket under an owner-derived path. Public consumers receive signed media only through approved public-profile APIs later in Story 13.5.

Upload constraints: JPEG/PNG/WEBP, max 8 MiB. Metadata writes/deletes verify ProfessionalProfile ownership server-side. No client may forge another professional's storage path.
