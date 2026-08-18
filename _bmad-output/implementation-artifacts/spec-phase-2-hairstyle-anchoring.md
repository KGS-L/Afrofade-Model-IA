---
title: 'Phase 2: Système d'Ancrage Canonique & Fitting Automatique des Coiffures Afro 3D'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/ARCHITECTURE-AFROFADE-3D.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les coiffures Afro (Fade, Locks, Tresses) ne s'ajustent pas automatiquement à la morphologie du crâne du client, risquant des collisions visuelles (mesh qui traverse la peau) ou un décalage du contour frontal.

**Approach:** Définir le module d'ancrage canonique `web/src/lib/anchors/flame_anchors.ts` et le composant React Three Fiber `HeadModel3D.tsx` qui calcule la matrice de transformation (position, rotation, échelle non-uniforme) d'une coiffure Afro 3D en fonction des points d'ancrage du crâne FLAME (`SCALP_CENTER`, `HAIRLINE_CENTER`, `TEMPLE_L/R`, `CROWN`).

## Boundaries & Constraints

**Always:** Séparer strictement le mesh de la tête (`head.glb`) et le mesh de la coiffure (`afro_001.glb`). Utiliser les indices de vertices FLAME stables pour calculer le morphing de la coiffure.

**Ask First:** Tout changement dans les propriétés des modèles de coiffures dans la base de données ou l'UI.

**Never:** Baker les cheveux directement dans la géométrie de la tête.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tête large / front haut | Paramètres FLAME avec jaw_width = +0.4 | La coiffure Afro s'étire proportionnellement sur X et Z | Redimensionnement automatique sans distorsion excessive |
| Changement de coiffure | Sélection 'fade-mid' -> 'dreadlocks' | Réalignement immédiat des ancres `SCALP_CENTER` et `HAIRLINE` | Fallback sur échelle par défaut |

</frozen-after-approval>

## Code Map

- `web/src/lib/anchors/flame_anchors.ts` -- Calculateur matriciel d'ancrage & de déformation de coiffures
- `web/src/components/HeadModel3D.tsx` -- Composant R3F avec injection dynamique des ancres canoniques FLAME
- `web/src/components/Hairstyle3DPreviewModal.tsx` -- Modal d'essayage avec sélection interactive et ajustement

## Tasks & Acceptance

**Execution:**
- [x] `web/src/lib/anchors/flame_anchors.ts` -- Créer la classe `FlameHairstyleAnchorSystem` pour déduire la matrice Trs (Translation, Rotation, Scale) de la coiffure -- Ajuste la coupe Afro aux mesures exactes du crâne.
- [x] `web/src/components/HeadModel3D.tsx` -- Intégrer la logique d'ancrage dans le rendu Three.js -- Permet le positionnement automatique et sans collision.
- [x] `web/src/components/Hairstyle3DPreviewModal.tsx` -- Permettre l'ajustement dynamique de la ligne de contour (Line-Up) via le slider en temps réel -- Offre au barbier le contrôle fin de la coupe.

**Acceptance Criteria:**
- Given un modèle 3D de tête FLAME, when une coiffure Afro est sélectionnée, then elle s'aligne automatiquement sur la ligne de contour (`HAIRLINE_CENTER`) et la tempe (`TEMPLE_L/R`) à 60 FPS.

## Design Notes

La matrice de transformation de la coiffure est déduite par :
$$\mathbf{T}_{\text{hairstyle}} = \text{Translation}(\text{SCALP\_CENTER}) \cdot \text{Scale}\left(\frac{\text{dist}(\text{TEMPLE}_L, \text{TEMPLE}_R)}{\text{width}_{\text{canonical}}}, \frac{\text{dist}(\text{HAIRLINE}, \text{CROWN})}{\text{depth}_{\text{canonical}}}, \dots \right)$$

## Verification

**Commands:**
- `npm --prefix web run build` -- expected: Compilation TypeScript & Next.js sans aucune erreur
