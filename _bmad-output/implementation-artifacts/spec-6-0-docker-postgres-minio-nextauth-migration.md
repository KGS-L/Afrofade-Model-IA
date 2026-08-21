---
title: 'Story 6.0 — Self-Hosted Docker Infrastructure (PostgreSQL 16 + MinIO S3 + NextAuth.js)'
type: 'refactor'
created: '2026-08-21'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'e1c2b7f0464d85fa9c2c3b8b5ae227965e626f54'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La dépendance à Supabase Cloud et sa console web impose des manipulations manuelles externes non versionnées, empêchant un déploiement 100% automatisé, déclaratif et conteneurisé.

**Approach:** Remplacer la dépendance Supabase SaaS par un conteneur PostgreSQL 16 local, un serveur MinIO (compatible S3) pour le stockage d'objets, l'authentification native NextAuth.js / Auth.js côté Next.js, et la vérification des tokens JWT côté FastAPI.

## Boundaries & Constraints

**Always:** Utiliser Docker Compose pour orchestrer PostgreSQL 16 et MinIO S3; conserver l'intégralité du schéma de base de données et des migrations SQL dans `web/supabase/migrations/`; abstraire le stockage MinIO via l'interface `AssetStorage` de FastAPI avec le protocole S3 standard.

**Ask First:** Ajouter de nouveaux conteneurs ou dépendances système lourdes hors de Docker Compose.

**Never:** Conserver de dépendances à la console cloud Supabase ou à leurs URLs SaaS distantes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Démarrage de l'infrastructure | `docker compose up -d` | Conteneurs PostgreSQL et MinIO démarrés et prêts | Healthcheck retry |
| Ingestion & lecture S3 MinIO | Upload d'asset 3D via FastAPI | Fichier stocké dans MinIO bucket `raw`/`canonical`/`tryons` | `S3StorageError` |
| Authentification utilisateur | Login Google / Email via NextAuth | Session stockée dans Postgres Docker + JWT émis | Authentication failure |
| Vérification JWT dans FastAPI | Requête avec header `Authorization: Bearer <JWT>` | Token décodé & utilisateur identifié | `401 Unauthorized` |

</frozen-after-approval>

## Code Map

- `docker-compose.yml` — Orchestration conteneurisée de PostgreSQL 16, MinIO, Next.js et FastAPI.
- `api/services/storage/s3_storage.py` — Adaptateur `AssetStorage` compatible S3 / MinIO.
- `web/src/lib/auth/auth-config.ts` — Configuration NextAuth.js / Auth.js avec adaptateur Postgres.
- `api/services/auth/jwt_verifier.py` — Décodeur et validateur de token JWT NextAuth pour FastAPI.
- `api/scripts/validate_docker_infra.py` — Harness de validation offline de la stack conteneurisée.

## Tasks & Acceptance

**Execution:**
- [ ] `docker-compose.yml` -- Ajouter les services PostgreSQL 16 (`postgres:16-alpine`) et MinIO (`minio/minio`).
- [ ] `api/services/storage/s3_storage.py` -- Implémenter l'adaptateur `S3AssetStorage` compatible MinIO/S3 pour l'interface `AssetStorage`.
- [ ] `web/src/lib/auth/auth-config.ts` -- Configurer NextAuth.js pour la gestion des comptes, sessions et jetons dans PostgreSQL.
- [ ] `api/services/auth/jwt_verifier.py` -- Implémenter le middleware/dépendance de vérification des tokens JWT dans FastAPI.
- [ ] `api/scripts/validate_docker_infra.py` -- Créer le script de validation de la connexion Postgres Docker, du stockage MinIO et du découplage Supabase.

**Acceptance Criteria:**
- Given la stack Docker lancée (`docker compose up`), when PostgreSQL et MinIO sont démarrés, then la base de données s'initialise avec les tables et MinIO accepte les écritures S3.
- Given un utilisateur connecté via NextAuth.js, when un jeton JWT est transmis à FastAPI, then l'identité est validée et autorisée sans appel à Supabase Cloud.

## Verification

**Commands:**
- `python3 api/scripts/validate_docker_infra.py` -- Harness de validation de la stack Docker autonome.

## Suggested Review Order

**Docker Compose Infrastructure**
- Integration of PostgreSQL 16 & MinIO S3 containers
  [`docker-compose.yml:1`](docker-compose.yml#L1)

**S3 Asset Storage Adapter**
- MinIO S3 compatible storage implementation
  [`s3_storage.py:1`](../../api/services/storage/s3_storage.py#L1)

**FastAPI JWT Verification**
- NextAuth.js JWT token verifier for FastAPI endpoints
  [`jwt_verifier.py:1`](../../api/services/auth/jwt_verifier.py#L1)

**NextAuth.js Configuration**
- Self-hosted NextAuth config for Next.js
  [`auth-config.ts:1`](../../web/src/lib/auth/auth-config.ts#L1)

**Offline Validation Harness**
- Verification script for Docker infrastructure & S3/JWT decoupling
  [`validate_docker_infra.py:1`](../../api/scripts/validate_docker_infra.py#L1)

