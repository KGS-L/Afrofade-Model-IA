---
title: 'Story 2.1: Ingestion des Photos via Supabase Presigned URLs'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_commit: 18db5d5
review_loop_iteration: 0
context:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md
  - {project-root}/_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le transfert des photos clients haute résolution depuis la tablette du salon vers le backend Next.js surcharge les API routes. Un mécanisme d'upload direct vers le cloud storage est nécessaire.

**Approach:** Créer la route API Next.js `/api/upload/presigned-url/route.ts` pour générer des presigned URLs sécurisées pour Supabase Storage (bucket `client-photos`), et mettre à jour le composant `web/src/components/PhotoUploader.tsx` pour effectuer le chargement directement vers la cible cloud storage.

## Boundaries & Constraints

**Always:** 
- Restreindre l'upload aux types d'images autorisés (`image/jpeg`, `image/png`, `image/webp`).
- Limiter la taille maximale par image à 10 Mo.
- Assurer un nommage unique des fichiers (`salons/{salon_id}/{timestamp}_{angle}.jpg`).

**Ask First:** 
- Augmentation de la taille maximale des photos au-delà de 10 Mo.

**Never:** 
- Stocker les images sur le disque local du serveur Next.js.
- Exposer les clés privées du bucket Supabase Storage dans les réponses client.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Demande Presigned URL | Fichier JPEG valide (3 Mo) | URL présignée unique et valide 15 minutes générée | Status 200 avec `{ uploadUrl, publicUrl }` |
| Format non autorisé | Fichier `.exe` ou `.pdf` | Refus de génération d'URL | Status 400 "Format d'image non supporté" |
| Fichier trop lourd | Image > 10 Mo | Refus de génération | Status 400 "Fichier trop volumineux (max 10 Mo)" |

</frozen-after-approval>

## Code Map

- `web/src/app/api/upload/presigned-url/route.ts` -- Route API Next.js générant l'URL d'upload Supabase Storage.
- `web/src/components/PhotoUploader.tsx` -- Composant React gérant la prise/sélection de photos et l'upload vers l'URL présignée.
- `web/src/lib/storage.ts` -- Helper client d'upload direct vers Supabase Storage.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/app/api/upload/presigned-url/route.ts` -- Créer l'API Route Handler avec validation MIME & taille -- Garantit la sécurité et l'isolation des uploads.
- [x] `web/src/lib/storage.ts` -- Créer les fonctions helper `getPresignedUrl` et `uploadFileToStorage` -- Simplifie l'upload direct.
- [x] `web/src/components/PhotoUploader.tsx` -- Relier l'UI d'upload au flux presigned URL avec barre de progression -- Expérience utilisateur réactive.

**Acceptance Criteria:**
- Given a valid client photo in `PhotoUploader`, when upload is triggered, then a presigned URL is requested from `/api/upload/presigned-url`.
- Given a presigned URL returned, when uploading, then the photo file is transferred directly to Supabase Storage.
- Given public URLs obtained, when completed, then an array of 3 photo URLs is passed to the parent component for 3D reconstruction.

## Design Notes

- Bucket Supabase : `client-photos` (accès public en lecture, écriture via service role / presigned URL).
- Les presigned URLs ont une durée de validité limitée à 900 secondes (15 minutes).

## Verification

**Commands:**
- `npm run build` (dans `web/`) -- expected: Build Next.js réussi.

## Suggested Review Order

**API Presigned URL & Validation**

- Handler d'API pour la génération d'URL d'upload Supabase Storage
  [`route.ts:1`](../../web/src/app/api/upload/presigned-url/route.ts#L1)

**Helper d'Upload Direct**

- Client Storage helper d'envoi vers le cloud
  [`storage.ts:1`](../../web/src/lib/storage.ts#L1)

**UI Photo Uploader**

- Composant PhotoUploader avec support des vrais fichiers et démo
  [`PhotoUploader.tsx:1`](../../web/src/components/PhotoUploader.tsx#L1)
