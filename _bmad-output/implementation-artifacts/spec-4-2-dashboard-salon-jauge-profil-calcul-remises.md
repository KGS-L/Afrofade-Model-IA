---
title: 'Story 4.2: Dashboard Salon, Jauge de Profil 100%, Calcul des Remises & Quotas d'Essais'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_commit: 26f0408
review_loop_iteration: 0
context:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md
  - {project-root}/_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le propriétaire de salon a besoin d'une visibilité claire sur ses quotas mensuels de reconstructions 3D, l'avancement de son profil (qui lui permet de débloquer jusqu'à 15% de réduction sur son abonnement mensuel) et les derniers rituels 3D réalisés pour ses clients.

**Approach:** Implémenter l'interface du dashboard dans `web/src/app/dashboard/page.tsx` comprenant :
1. La jauge de complétude de profil salon (0% à 100%) avec calcul réactif de la remise en FCFA.
2. Le compteur de quota d'essais 3D (ex: 12 / 30 consommés ce mois-ci).
3. Le tableau des récents rituels 3D avec statut de sauvegarde biométrique.

## Boundaries & Constraints

**Always:** 
- Appliquer automatiquement la réduction de tarif (ex: 15% sur 19 000 FCFA -> 16 150 FCFA) dès que le profil salon atteint 100%.
- Bloquer poliment les nouvelles reconstructions 3D si le quota mensuel du salon est dépassé (avec incitation à passer au plan VIP/EXTRA).
- Formater tous les montants financiers en FCFA avec séparateurs d'espaces (ex: `19 000 FCFA`).

**Ask First:** 
- Modification du nombre de points attribués par champ du profil salon.

**Never:** 
- Réinitialiser le quota mensuel sans mise à jour du cycle de facturation Mobile Money.
- Masquer la jauge de profil si le profil n'est pas encore complet.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Profil complété à 100% | Tous les champs renseignés | Jauge verte à 100% + remise 15% affichée | Message de félicitations pour la réduction |
| Quota mensuel atteint (30/30) | `quotaUsed >= quotaLimit` | Alerte quota + bouton "Augmenter mon quota" | Désactivation douce du bouton de nouveau rituel |
| Mise à jour du profil | Modification du numéro WhatsApp | Recalcul dynamique du pourcentage de complétude | Mise à jour instantanée de l'UI |

</frozen-after-approval>

## Code Map

- `web/src/app/dashboard/page.tsx` -- Page du tableau de bord salon avec jauges et remises.
- `web/src/lib/plans.ts` -- Helper `calculateProfileDiscount()` et logique des offres SaaS.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/app/dashboard/page.tsx` -- Finaliser le dashboard salon avec jauge de profil et suivi des quotas -- Donne le contrôle financier et opérationnel au coiffeur.
- [x] `web/src/lib/plans.ts` -- Intégrer la règle de calcul de la remise 100% profil -- Valorise l'engagement des salons.

**Acceptance Criteria:**
- Given salon profile 100% complete, when calculated, then discount is applied to subscription price in FCFA.
- Given 30/30 3D trial quota used, when reached, then dashboard displays quota alert and upgrade CTA.
- Given recent client rituals list, when viewed, then 3D avatars are listed with date and saved state.

## Design Notes

- Jauge de profil : composant barre de progression avec gradient `from-terracotta to-terracotta-dark`.
- Cartes KPI : bordures `border-ink/10`, ombres `shadow-soft`, typographie `font-display`.

## Verification

**Commands:**
- `npm run build` (dans `web/`) -- expected: Build Next.js réussi.

## Suggested Review Order

**Dashboard Salon Jauge 100% & Quotas 3D**

- Page Dashboard Salon avec jauges et remises
  [`page.tsx:120`](../../web/src/app/dashboard/page.tsx#L120)
