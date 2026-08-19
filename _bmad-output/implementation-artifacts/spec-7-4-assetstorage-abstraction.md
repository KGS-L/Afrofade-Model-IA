# Story 7.4 — AssetStorage Abstraction

Status: in-progress
Epic: 7 — Durable 3D Head Pipeline
Date: 2026-08-19

## User Story

As an Afrofade developer,
I want generated and uploaded assets represented by durable storage references behind an `AssetStorage` abstraction,
So that 3D pipelines no longer depend on `/tmp`, developer filesystem paths, or falsely public client-photo URLs.

## Acceptance Criteria

### AC-7.4.1 — Canonical storage reference

The application defines a provider-neutral `StoredAssetRef` with at least `bucket` and `path`. Business records persist this durable reference; public/signed URLs are delivery mechanisms, not the identity of an object.

### AC-7.4.2 — Python AssetStorage contract

Python exposes an `AssetStorage` interface supporting:

- put/upload object;
- delete object;
- create signed read URL;
- create signed upload URL;
- exists/metadata.

The initial implementation uses the official Supabase Python SDK with server-only credentials.

### AC-7.4.3 — Private buckets / prefixes

Initial logical storage layout:

- `client-photos/temporary/...`;
- `heads/canonical/...`;
- `hair-assets/raw/...`;
- `hair-assets/canonical/...`;
- `tryons/exports/...`.

Private assets are served with time-limited signed read URLs; Afrofade does not make biometric/client-photo buckets public for convenience.

### AC-7.4.4 — Secure client-photo upload contract

The secure presigned-upload API returns an explicit storage reference (`bucket`, `path`) plus signed-upload data. `web/src/lib/storage.ts` no longer expects a nonexistent `publicUrl`, and no production error path returns a fake local `/uploads/demo/...` URL.

### AC-7.4.5 — Signed read endpoint

A server route can create a short-lived read URL for an owned storage reference after verifying the current principal and path ownership. Clients cannot request arbitrary other-tenant paths.

### AC-7.4.6 — Worker-safe server configuration

The Python adapter requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, fails closed when missing, and refuses cleartext HTTP in production. No service-role key is ever returned to the browser.

### AC-7.4.7 — Provider-independent validation

CI validates without a live Supabase project:

- path/bucket normalization rejects traversal and absolute/local filesystem paths;
- fake Supabase SDK proves upload/signed-read/signed-upload/delete/exists mappings;
- web upload contract contains `storageRef` and no demo/public URL fallback;
- P0 + Stories 7.1–7.3 validators remain green.

## File Plan

- `api/services/storage/asset_storage.py`
- `api/services/storage/supabase_storage.py`
- `api/services/storage/__init__.py`
- `api/scripts/validate_asset_storage.py`
- `api/requirements.txt`
- `web/src/lib/storage.ts`
- `web/src/lib/storage-types.ts`
- `web/src/app/api/upload/presigned-url/route.ts`
- `web/src/app/api/storage/signed-read/route.ts`
- `.github/workflows/ci-cd.yml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Out of Scope

- moving FLAME output into canonical storage (Story 7.5);
- persisting `head_assets` metadata (Story 7.5);
- large-file/resumable TUS optimization beyond the current photo-size policy;
- public CDN strategy for publishable catalogue assets.

## Definition of Done

- all ACs implemented;
- AssetStorage validator passes;
- TypeScript/build remains green;
- code review has no open Critical/High/Medium finding;
- production Docker gate remains green;
- story moves to `review`, then `done`.
