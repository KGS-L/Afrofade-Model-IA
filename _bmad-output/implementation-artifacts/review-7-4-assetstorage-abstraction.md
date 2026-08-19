# BMAD Code Review — Story 7.4 AssetStorage Abstraction

Date: 2026-08-19
Story: 7.4
Review result: PASS — FINAL CI GATES GREEN

## Scope reviewed

- `api/services/storage/asset_storage.py`
- `api/services/storage/supabase_storage.py`
- `api/services/storage/paths.py`
- `api/services/storage/__init__.py`
- `api/scripts/validate_asset_storage.py`
- `api/scripts/validate_asset_storage_layout.py`
- `web/src/lib/storage-types.ts`
- `web/src/lib/storage.ts`
- `web/src/app/api/upload/presigned-url/route.ts`
- `web/src/app/api/storage/signed-read/route.ts`
- `web/supabase/migrations/07_private_asset_buckets.sql`
- Python dependency and CI integration

## Findings fixed during review

### Fixed — web upload contract expected a nonexistent public URL

The secure upload route already returned signed upload data only, but `web/src/lib/storage.ts` still expected `publicUrl`. A successful upload could therefore return an undefined durable reference.

Resolution:

- durable identity is now `StoredAssetRef { bucket, path }`;
- browser upload uses `uploadToSignedUrl` with the returned token;
- no public URL is treated as object identity;
- no `/uploads/demo/...` fallback remains.

Status: RESOLVED.

### Fixed — signed-upload `upsert` option type did not exactly match the official SDK contract

The initial Python adapter sent `"true"/"false"` for `create_signed_upload_url` options. The official `storage-py` contract expects a boolean for signed-upload `upsert` while regular upload file options serialize upsert differently.

Resolution: signed-upload options now send `{"upsert": <bool>}` and the provider-independent fake-SDK validator asserts the boolean mapping.

Status: RESOLVED.

### Fixed — ambiguous double-slash object paths could be normalized silently

`PurePosixPath` normalizes repeated separators. Validating only normalized parts could therefore accept `users/u1//canonical/head.glb` and silently change its identity.

Resolution: raw path segments are validated before `PurePosixPath`; empty, `.`, `..`, absolute, backslash, URL-like and NUL-containing paths are rejected.

Status: RESOLVED.

### Fixed — storage layout existed as convention but not reproducible infrastructure

The repository previously assumed Supabase Storage buckets existed. A fresh environment could therefore pass application builds but fail at runtime.

Resolution: migration `07_private_asset_buckets.sql` provisions `client-photos`, `heads`, `hair-assets` and `tryons` as private buckets. Client-photo size/MIME policy is aligned with the upload route.

Status: RESOLVED.

### Fixed — bucket ownership prefixes were too generic for the new logical layout

The first signed-read implementation checked generic `users/<id>/` / `salons/<id>/` prefixes for multiple buckets.

Resolution:

- client photos: `temporary/{users|salons}/...`;
- canonical heads: `canonical/{users|salons}/...`;
- try-on exports: `exports/{users|salons}/...`;
- generic hair-asset signed-read remains admin-only until Epic 8 defines published-catalogue delivery.

Status: RESOLVED.

### Fixed — post-merge migration numbering and CI validator drift

After `main` gained `04_role_dashboards.sql`, the P1 migrations were renumbered to preserve deterministic ordering:

- `05_persistent_ai_jobs.sql`;
- `06_ai_job_worker_lifecycle.sql`;
- `07_private_asset_buckets.sql`.

The JobQueue, worker lifecycle and AssetStorage layout validators were updated to reference these canonical filenames.

Status: RESOLVED.

## Acceptance criteria review

- provider-neutral `StoredAssetRef`: PASS.
- Python `AssetStorage` interface: PASS.
- official Supabase Python adapter: PASS.
- private logical bucket/prefix layout: PASS.
- secure signed-upload web contract: PASS.
- owned signed-read route: PASS.
- fail-closed server credentials/HTTPS: PASS.
- reproducible private bucket provisioning: PASS.
- provider-independent adapter/path/web validators: PASS.
- `P1 AssetStorage Contract` workflow: PASS.
- `P1 AssetStorage Layout` workflow: PASS.
- main Next.js/FastAPI/Docker/security-smoke pipeline: PASS.

## Explicitly deferred to Story 7.5 / Epic 8

- moving current FLAME GLB/preview/anchor outputs from filesystem into `AssetStorage`;
- `head_assets` persistence;
- replacing transitional worker output with `CanonicalHead` metadata;
- published catalogue hair-asset read policy/CDN strategy;
- removal of the legacy synchronous reconstruction user path and client demo fallback.

## Review conclusion

No open Critical/High/Medium code-review finding remains in Story 7.4 scope. Final-head CI passed all required gates on 2026-08-19:

1. `P1 AssetStorage Contract` — PASS;
2. `P1 AssetStorage Layout` — PASS;
3. production CI/Docker build/start/P0 security smoke gate — PASS.

Story 7.4 is DONE. Next BMAD build story: **7.5 — HeadGenerationManager real FLAME pipeline**.
