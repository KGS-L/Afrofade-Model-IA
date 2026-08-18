---
title: 'Story 3.3: Glissière Line-Up Art, Dock Jeu Vidéo & Suggestion Upsell'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_commit: 42c2e1c
review_loop_iteration: 0
context:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md
  - {project-root}/_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le coiffeur doit ajuster au millimètre la hauteur des contours (line-up art) pour correspondre exactement à la ligne naturelle du client, sélectionner rapidement des coiffures via une ergonomie fluide type "dressing d'avatar 3D jeu vidéo", et proposer des suggestions de prestations complémentaires (upsell barbe/soin).

**Approach:** 
1. Intégrer dans `Studio3DCanvas.tsx` le carrousel/dock défilant de coiffures style jeu vidéo avec badges de plan et glow lumineux.
2. Relier la glissière tactile `lineUpCutoff` (0% à 100%) au décalage verticaux des vertices de contours dans `HeadModel3D.tsx`.
3. Ajouter le composant d'upsell réactif `UpsellBanner.tsx` proposant les compléments VIP avec calcul d'augmentation du panier moyen.

## Boundaries & Constraints

**Always:** 
- Déplacer la ligne de contour de manière continue et fluide sans a-coups lors du déplacement de la glissière.
- Mettre en valeur visuelle le style sélectionné dans le dock 3D (bordure terracotta brillante, coche active).
- Proposer des suggestions d'upsell non intrusives mais attrayantes.

**Ask First:** 
- Augmenter les tarifs des prestations suggérées dans l'upsell.

**Never:** 
- Bloquer la navigation si le client choisit de refuser l'upsell.
- Réinitialiser la glissière de contours lors de la rotation de la caméra 3D.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Déplacement du slider Line-up (ex: 75%) | Modification du range HTML | Ajustement réactif de la ligne sur la tête 3D (< 16 ms / 60 FPS) | Maintien de la valeur entre 0% et 100% |
| Clic sur une vignette dans le dock jeu vidéo | Toucher sur une carte du carrousel bas | Bascule immédiate de la coiffure sur l'avatar 3D | Application instantanée sans scintillement |
| Sélection d'un style VIP | Clic sur "Barbe Sculptée VIP" | Affichage du toast d'upsell suggérant l'option premium | Masquage fluide sur clic de fermeture |

</frozen-after-approval>

## Code Map

- `web/src/components/Studio3DCanvas.tsx` -- Canvas 3D avec Dock Carrousel d'avatar style jeu vidéo & Glissière Line-Up.
- `web/src/components/HeadModel3D.tsx` -- Calcul et application du décalage verticaux de la ligne de contour.
- `web/src/components/UpsellBanner.tsx` -- Composant de suggestion d'upsell premium.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/components/Studio3DCanvas.tsx` -- Implémenter le dock carrousel style jeu vidéo sous le canvas 3D -- Offre l'ergonomie dressing vidéo-ludique.
- [x] `web/src/components/HeadModel3D.tsx` -- Lier la valeur `lineUpCutoff` aux contours 3D -- Garantit la précision au millimètre.
- [x] `web/src/components/UpsellBanner.tsx` -- Créer la bannière d'upsell réactive pour les options VIP -- Stimule le panier moyen du salon.

**Acceptance Criteria:**
- Given `lineUpCutoff` slider adjusted from 0 to 100%, when dragged, then 3D hairline shifts smoothly in real time.
- Given hairstyle thumbnail clicked in the video-game dock, when tapped, then the 3D avatar head changes instantly with active glow feedback.
- Given a premium style selected, when tapped, then upsell banner triggers with service detail.

## Design Notes

- Dock Jeu Vidéo : carrousel défilant avec `overflow-x-auto`, cartes `aspect-[4/3]`, `rounded-card`, bordure active `border-terracotta ring-2 ring-terracotta/40`.
- Glissière : composant `range` stylisé accent terracotta.

## Verification

**Commands:**
- `npm run build` (dans `web/`) -- expected: Build Next.js réussi.

## Suggested Review Order

**Dressing 3D & Carrousel Style Jeu Vidéo**

- Dock de sélection sous la scène 3D & glissière line-up
  [`Studio3DCanvas.tsx:145`](../../web/src/components/Studio3DCanvas.tsx#L145)

**Composant Banner Upsell VIP**

- Toast d'upsell réactif
  [`UpsellBanner.tsx:1`](../../web/src/components/UpsellBanner.tsx#L1)
