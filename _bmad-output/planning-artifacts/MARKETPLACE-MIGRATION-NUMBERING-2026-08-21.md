---
title: "Afrofade Marketplace — SQL Migration Numbering Addendum"
status: authoritative-for-marketplace-migration-filenames
created: 2026-08-21
---

# Marketplace migration numbering

During Story 12.1 implementation, the repository was found to already contain `12_trellis2_job_checkpoints.sql` from the parallel 3D track. The planning documents that proposed marketplace migrations 12–18 therefore conflict with real repository history.

To prevent Supabase migration-version collisions, **marketplace SQL migrations use the reserved 20+ range from this point forward**. BMAD story numbers do not change.

Current mapping:

| BMAD Story | Actual migration |
|---|---|
| 12.1 | `20_marketplace_identity_foundation.sql` |
| 12.2 | `21_marketplace_legacy_salon_backfill.sql` |
| 12.4 | `22_marketplace_salon_membership_ops.sql` |
| 12.5 | `23_marketplace_capability_resolver.sql` |
| 12.6 | `24_marketplace_plan_finalization.sql` |

Next marketplace migrations continue sequentially from `25_...` regardless of Epic/Story number. Existing 3D migration filenames must never be renumbered or overwritten solely to make marketplace numbering aesthetically match BMAD story numbers.

Where older planning artifacts name marketplace migrations 12–18, interpret those as conceptual sequence only; this file is authoritative for actual repository filenames.
