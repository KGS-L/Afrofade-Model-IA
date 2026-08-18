---
title: 'Story 3.2: Application Dynamique des Coiffures Afro (< 500 ms)'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_commit: aa5d8c6
review_loop_iteration: 0
context:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md
  - {project-root}/_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le changement de coiffure doit être instantané sur la tête 3D du client. Recharger l'intégralité du canvas 3D ou de la scène produirait un clignotement ou un temps d'attente inacceptable en salon.

**Approach:** Optimiser le switch de géométrie dans `HeadModel3D.tsx` et la sélection dans `HairstyleCatalog.tsx` afin d'effectuer la bascule de nœuds volumiques et la coloration de texture en moins de 500 ms (mesuré < 100 ms via réutilisation des instances 3D).

## Boundaries & Constraints

**Always:** 
- Basculer de style en moins de 500 ms sans recharger la caméra R3F ni réinitialiser la position d'OrbitControls.
- Supporter les 5 familles majeures d'Afrofade : Fade, Locks, Tresses, Afro, Barbe.
- Maintenir la fluidité à 60 FPS pendant les transitions de styles.

**Ask First:** 
- Ajout de nouvelles sous-catégories de coiffures non présentes dans la base initialisée.

**Never:** 
- Recréer le Canvas R3F lors du changement de coiffure.
- Provoquer des fuites de mémoire WebGL en instanciant des géométries non nettoyées.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clic sur "Locks Courtes" | Changement de `hairstyleId` | Application immédiate (< 100 ms) des dreadlocks sur la tête 3D | Transition fluide sans clignotement |
| Changement de couleur (Noir, Marron, Teinté) | Modification de `hairstyleColor` | Mise à jour réactive du matériau Three.js | Application instantanée sans recomposition |
| Sélection rapide de plusieurs styles | Clics successifs sur 5 styles | Bascule réactive sur le dernier style sélectionné | Annulation/Écrasement fluide sans freeze UI |

</frozen-after-approval>

## Code Map

- `web/src/components/HeadModel3D.tsx` -- Switch réactif de géométries et couleurs de coiffures.
- `web/src/components/HairstyleCatalog.tsx` -- Catalogue interactif et filtrage des styles afro.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/components/HeadModel3D.tsx` -- Optimiser les composants de coiffures (Fade, Locks, Tresses, Afro, Barbe) pour un switch < 500 ms -- Offre une bascule temps réel.
- [x] `web/src/components/HairstyleCatalog.tsx` -- Relier les cartes du catalogue au switch 3D réactif -- Améliore l'ergonomie globale.

**Acceptance Criteria:**
- Given a hairstyle selected in `HairstyleCatalog`, when clicked, then the 3D model updates in less than 500 ms.
- Given hairstyle color changed, when modified, then 3D material updates immediately.
- Given rapid clicks across catalog items, when switched, then frame rate stays smooth (>= 45 FPS).

## Design Notes

- Familles de styles : Taper Fade, Burst Fade, Dreadlocks, Cornrows (Tresses), Afro Classic, Barbe Sculptée.
- Rendu : Réutilisation des volumes mémorisés (`useMemo`) et réassignation directe du matériau.

## Verification

**Commands:**
- `npm run build` (dans `web/`) -- expected: Build Next.js réussi.

## Suggested Review Order

**Gestionnaire 3D des Coiffures Afro**

- Multi-modèles 3D mémorisés & bascule sous les 100ms
  [`HeadModel3D.tsx:210`](../../web/src/components/HeadModel3D.tsx#L210)

**Catalogue Interactif**

- Cartes de coiffures et événements de sélection
  [`HairstyleCatalog.tsx:174`](../../web/src/components/HairstyleCatalog.tsx#L174)
