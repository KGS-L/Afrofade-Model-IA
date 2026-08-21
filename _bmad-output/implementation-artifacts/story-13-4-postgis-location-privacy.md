---
title: "Story 13.4 — PostGIS Provider Location & Privacy"
status: in-dev
epic: 13
priority: M1-10
migration: web/supabase/migrations/27_marketplace_geospatial_privacy.sql
---

# Story 13.4

Enable PostGIS geospatial discovery while separating private professional location from published marketplace coordinates.

- salons may expose a precise public business point;
- independent professionals choose `hidden | city | neighborhood | approximate | precise` visibility;
- exact private professional location/address is stored in a separate RLS/service-only table;
- public projections never read private location rows;
- consumer GPS is a transient search input and need not be persisted;
- manual city/neighborhood discovery remains supported;
- GiST indexes support radius/distance queries.
