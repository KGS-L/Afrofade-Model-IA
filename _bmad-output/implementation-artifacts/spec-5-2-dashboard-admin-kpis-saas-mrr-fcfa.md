---
title: 'Story 5.2: Dashboard Administrateur & KPIs SaaS (MRR FCFA, Salons Actifs, Quotas & Rituels)'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_commit: 531948c
review_loop_iteration: 0
context:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md
  - {project-root}/_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Fournir une console de pilotage administrateur (`/admin`) permettant de visualiser les revenus récurrents mensuels (MRR) en FCFA, le volume de salons partenaires actifs et le nombre total de rituels 3D exécutés.

**Approach:** 
Implémenter la console de pilotage dans `web/src/app/admin/page.tsx` avec :
1. KPIs principaux : MRR Total (ex: 285 000 FCFA/mois), Nombre de Salons Actifs, Nombre d'Essais 3D ce mois-ci, Taux de conversion Freemium -> Payant.
2. Tableau interactif des Salons Partenaires (Nom du salon, Pays, Plan actif, Date d'abonnement, Statut).
3. Contrôles d'administration : activation/désactivation manuelle de plans et export de rapport.

## Boundaries & Constraints

**Always:** 
- Restreindre l'accès à la console `/admin` aux utilisateurs disposant du rôle `admin`.
- Afficher les revenus SaaS en FCFA avec formatage clair (ex: `285 000 FCFA/mois`).
- Rediriger automatiquement les utilisateurs non-administrateurs vers `/connexion`.

**Ask First:** 
- Modification de la structure des rôles d'accès dans Supabase.

**Never:** 
- Exposer des données financières confidentielles sur des routes publiques sans middleware d'authentification.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Visite par un administrateur connecté | Rôle `admin` | Chargement complet du Dashboard Admin & KPIs MRR | Affichage instantané des indicateurs |
| Tentative d'accès par un salon | Rôle `salon` | Refus d'accès | Redirection automatique vers `/dashboard` |
| Calcul du MRR | Cumul des abonnements payants | Somme dynamique des revenus FCFA mensuels | Formatage propre `XX XXX FCFA` |

</frozen-after-approval>

## Code Map

- `web/src/app/admin/page.tsx` -- Console de pilotage Administrateur & KPIs MRR.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/app/admin/page.tsx` -- Finaliser la console administrateur avec jauges MRR, salons actifs et rituels 3D -- Assure le pilotage business du SaaS.

**Acceptance Criteria:**
- Given an admin user, when accessing `/admin`, then MRR in FCFA, active salons, and total 3D rituals are rendered.
- Given a non-admin user, when accessing `/admin`, then user is redirected to `/dashboard` or `/connexion`.

## Design Notes

- Gradient d'en-tête admin : `bg-ink text-cream` avec accents terracotta.
- Badges de plan : PRO (`bg-terracotta/20 text-terracotta`), VIP (`bg-amber-500/20 text-amber-600`), EXTRA (`bg-emerald-500/20 text-emerald-600`).

## Verification

**Commands:**
- `npm run build` (dans `web/`) -- expected: Build Next.js réussi.

## Suggested Review Order

**Console Administrateur & MRR FCFA**

- Page Admin Dashboard avec KPIs MRR
  [`page.tsx:95`](../../web/src/app/admin/page.tsx#L95)
