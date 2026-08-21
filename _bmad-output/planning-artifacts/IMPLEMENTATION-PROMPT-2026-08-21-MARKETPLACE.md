# Afrofade Marketplace — Implementation Prompt

Use this prompt after the planning branch is merged to `main` when handing implementation to a development agent.

---

## Prompt

Implement the **Afrofade Marketplace / Booking / Professional Network / Careers track** using the BMAD artifacts merged on 2026-08-21.

Start by reading:

1. `_bmad-output/planning-artifacts/MARKETPLACE-BMAD-INDEX-2026-08-21.md`
2. `_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-21-marketplace/prd.md`
3. `_bmad-output/planning-artifacts/architecture/ARCHITECTURE-AFROFADE-MARKETPLACE-2026-08-21.md`
4. `_bmad-output/planning-artifacts/ux-designs/UX-AFROFADE-MARKETPLACE-2026-08-21.md`
5. `_bmad-output/planning-artifacts/epics-marketplace-2026-08-21.md`
6. `_bmad-output/planning-artifacts/EXECUTION-MARKETPLACE-2026-08-21.md`
7. `_bmad-output/implementation-artifacts/marketplace-sprint-status.yaml`

Then inspect the **actual current repo/schema** before changing anything.

Start at the first unfinished marketplace story, currently expected to be:

> **Story 12.1 — Marketplace identity schema**

Follow the exact story order/dependencies unless the repository state proves a prerequisite has already been implemented.

For each story:

- create a dedicated feature branch from latest `main`;
- create/update a BMAD implementation spec;
- implement the full acceptance criteria;
- use additive Supabase migrations and preserve current production-compatible data;
- implement/verify RLS and server-side authorization;
- add targeted tests plus negative tenant/security tests;
- run TypeScript/typecheck/Next production build when web is touched;
- preserve existing Python/3D validators and production Docker CI;
- create a BMAD review artifact showing AC evidence;
- update `marketplace-sprint-status.yaml` only after tests pass;
- open a Draft PR for review.

Do **not**:

- merge any PR automatically;
- remove legacy salon-role columns before the additive migration/backfill is proven;
- authorize from browser role/localStorage;
- expose Supabase service-role credentials client-side;
- store private professional home coordinates in public responses;
- persist consumer precise GPS merely for nearby search;
- create a salon/professional fiat wallet;
- enable live marketplace split payments without an explicitly approved provider/compliance decision;
- require paid 3D/notification APIs in CI;
- build a generic beauty marketplace, social feed or unrestricted DM system;
- regenerate hair assets during normal marketplace search/booking.

Preserve the existing 3D architecture and continue to use the canonical relationship:

`CanonicalHead + CanonicalHairAsset -> HairFitter -> TryOnAsset`.

The marketplace must remain functional without a TryOnAsset, while a saved look can optionally be attached to a booking as the exact visual service brief.

When Story 12.1 is complete, stop at the normal PR review boundary unless the current user instruction explicitly authorizes continuing to the next story.

---

This prompt is a convenience handoff. The actual source of truth remains the BMAD artifacts and current user instruction.
