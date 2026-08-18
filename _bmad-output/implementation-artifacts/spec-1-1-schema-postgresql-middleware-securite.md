---
title: 'Story 1.1: Schéma PostgreSQL & Middleware de Sécurité Next.js'
type: 'feature'
created: '2026-08-18'
status: 'draft'
review_loop_iteration: 0
context:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md
  - {project-root}/_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le projet Afrofade ne dispose pas encore du script de migration SQL PostgreSQL initialisant les tables métier (`salons`, `subscriptions`, `clients_heads`, `hairstyles_catalog`), ni du middleware Next.js sécurisant les accès par session salon.

**Approach:** Créer le script de migration SQL de référence (`web/supabase/migrations/01_init_schema.sql`), les types TypeScript associés (`web/src/lib/types/db.ts`), le client d'accès aux données (`web/src/lib/supabase.ts`), et le middleware Next.js (`web/src/middleware.ts`) pour protéger les routes `/dashboard` et `/admin`.

## Boundaries & Constraints

**Always:** 
- Respecter le schéma PostgreSQL défini dans `ARCHITECTURE-SPINE.md` (AD-5).
- Implémenter le contrôle d'accès dans le middleware Next.js pour isoler les données par `salon_id`.
- Utiliser TypeScript strict pour tous les types de base de données.

**Ask First:** 
- Modification des champs de la table `salons` ou `subscriptions`.

**Never:** 
- Exposer les clés secrètes Supabase/Service Role côté client (Web/React).
- Bloquer l'accès aux routes publiques (`/`, `/rituel`, `/connexion`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Accès protégé anonyme | Visiteur non connecté accède à `/dashboard` | Redirection HTTP 307 vers `/connexion?next=/dashboard` | Redirection propre sans crash |
| Accès protégé salon | Salon connecté accède à `/dashboard` | Accès autorisé, `salon_id` propagé dans les headers | N/A |
| Migration SQL | Exécution de `01_init_schema.sql` | Tables et index PostgreSQL créés avec succès | Transaction idempotent (`CREATE TABLE IF NOT EXISTS`) |

</frozen-after-approval>

## Code Map

- `web/supabase/migrations/01_init_schema.sql` -- Script DDL PostgreSQL d'initialisation des tables `salons`, `subscriptions`, `clients_heads`, `hairstyles_catalog`.
- `web/src/lib/types/db.ts` -- Interfaces TypeScript strictes reflétant les tables de la base de données.
- `web/src/lib/supabase.ts` -- Helper d'initialisation du client Supabase / PostgreSQL.
- `web/src/middleware.ts` -- Middleware Next.js de protection des routes `/dashboard` et `/admin` et vérification de session.

## Tasks & Acceptance

**Execution:**
- [ ] `web/supabase/migrations/01_init_schema.sql` -- Créer la migration SQL des tables avec contraintes et index -- Assure la persistance structurée.
- [ ] `web/src/lib/types/db.ts` -- Définir les types TypeScript `Salon`, `Subscription`, `ClientHead`, `Hairstyle` -- Garantit la sécurité du typage.
- [ ] `web/src/lib/supabase.ts` -- Configurer le client Supabase avec gestion des variables d'environnement -- Connexion DB sécurisée.
- [ ] `web/src/middleware.ts` -- Implémenter la vérification de session et redirection sur les routes protégées -- Securité et isolation salons.

**Acceptance Criteria:**
- Given a PostgreSQL database, when running `01_init_schema.sql`, then all 4 core tables and indexes are created without error.
- Given an unauthenticated request to `/dashboard`, when Next.js middleware executes, then user is redirected to `/connexion`.
- Given an authenticated salon request, when accessing API routes, then session `salon_id` is validated.

## Design Notes

- Structure de la table `salons` : `id` (uuid), `name` (text), `phone` (text), `country` (text), `plan` (PRO/VIP/EXTRA), `quota_limit` (int), `quota_used` (int), `storage_used_bytes` (bigint), `created_at` (timestamptz).
- Structure de la table `subscriptions` : `id` (uuid), `salon_id` (uuid), `provider` (money_fusion/genius_pay), `amount_fcfa` (int), `status` (active/expired/pending), `expires_at` (timestamptz), `created_at` (timestamptz).
- Structure de la table `clients_heads` : `id` (uuid), `salon_id` (uuid), `client_name` (text), `photos_urls` (jsonb), `mesh_3d_url` (text), `saved_hairstyle_id` (text), `is_saved_permanently` (boolean), `created_at` (timestamptz).
- Structure de la table `hairstyles_catalog` : `id` (text), `category` (fade/locks/tresses/afro/barbe), `title` (text), `description` (text), `thumbnail_url` (text), `mesh_3d_url` (text), `is_premium_upsell` (boolean).

## Verification

**Commands:**
- `npm run build` (dans `web/`) -- expected: Build Next.js réussi sans erreur TypeScript ou de middleware.
