---
title: 'Story 2.3: Résilience Réseau & Purge Automatique Biométrique à 30 Jours'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_commit: c55336c
review_loop_iteration: 0
context:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md
  - {project-root}/_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les salons de coiffure en Afrique de l'Ouest connaissent des micro-coupures de connexion mobile. De plus, la législation CEDEAO exige la suppression définitive des données biométriques (photos et têtes 3D non sauvegardées) après 30 jours.

**Approach:** 
1. Implémenter la fonction `fetchWithRetry()` (`web/src/lib/resilience.ts`) avec 3 tentatives automatiques et backoff exponentiel pour sécuriser les appels réseau.
2. Créer l'API Route de purge cron `/api/cron/purge-biometric/route.ts` qui identifie et supprime de la base PostgreSQL et de Supabase Storage toutes les têtes 3D temporaires vieilles de plus de 30 jours.

## Boundaries & Constraints

**Always:** 
- Exécuter au maximum 3 tentatives de réessai avec délais exponentiels (500ms, 1000ms, 2000ms).
- Ne JAMAIS purger les têtes clients dont `is_saved_permanently = TRUE`.
- Valider le jeton secret `CRON_SECRET` pour l'exécution de la route de purge.

**Ask First:** 
- Modification de la durée de conservation légale des données biométriques (actuellement fixée à 30 jours).

**Never:** 
- Retenter indéfiniment une requête HTTP qui renvoie des erreurs 4xx (Client Error).
- Supprimer des photos sans effacer l'enregistrement correspondant en base de données.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Micro-coupure réseau (1er échec HTTP 503) | `fetchWithRetry` | Tentative 2 au bout de 500ms -> Succès | Résolution transparente sans message d'erreur |
| 3 échecs consécutifs | `fetchWithRetry` | Abandon après 3 essais | Notification d'erreur réseau propre pour l'utilisateur |
| Exécution Purge Cron | `GET /api/cron/purge-biometric` avec `Bearer CRON_SECRET` | Suppression des têtes expirées (`expires_at < NOW()`) | HTTP 200 avec `{ purgedCount, freedBytes }` |
| Exécution Cron non autorisée | `GET /api/cron/purge-biometric` sans secret | Rejet immédiat | HTTP 401 "Non autorisé" |

</frozen-after-approval>

## Code Map

- `web/src/lib/resilience.ts` -- Helper `fetchWithRetry` avec stratégie de réessai exponentielle.
- `web/src/app/api/cron/purge-biometric/route.ts` -- Route API Cron sécurisée de purge des données biométriques à 30 jours.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/lib/resilience.ts` -- Créer la fonction `fetchWithRetry` avec backoff exponentiel -- Garantit la stabilité réseau en salon.
- [x] `web/src/app/api/cron/purge-biometric/route.ts` -- Implémenter la route API de purge avec authentification `CRON_SECRET` -- Assure la conformité CEDEAO 30 jours.

**Acceptance Criteria:**
- Given a network glitch returning 503, when `fetchWithRetry` is used, then up to 3 retries are performed with exponential backoff before failing.
- Given `CRON_SECRET` passed to `/api/cron/purge-biometric`, when executed, then unsaved client heads older than 30 days are purged from DB and storage.

## Design Notes

- Secret d'authentification Cron : `process.env.CRON_SECRET`.
- Intervalle de réessai : 500ms -> 1000ms -> 2000ms.

## Verification

**Commands:**
- `npm run build` (dans `web/`) -- expected: Build Next.js réussi.

## Suggested Review Order

**Helper Résilience Réseau**

- `fetchWithRetry` et retries exponentiels
  [`resilience.ts:1`](../../web/src/lib/resilience.ts#L1)

**Cron Purge Biométrique 30 jours**

- Route API `/api/cron/purge-biometric` et conformité CEDEAO
  [`route.ts:1`](../../web/src/app/api/cron/purge-biometric/route.ts#L1)
