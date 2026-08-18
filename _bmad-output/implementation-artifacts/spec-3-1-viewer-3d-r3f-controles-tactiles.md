---
title: 'Story 3.1: Viewer 3D React Three Fiber (R3F) & Contrôles Tactiles'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_commit: 82d083f
review_loop_iteration: 0
context:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md
  - {project-root}/_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les coiffeurs manipulent l'application sur des tablettes (iPad, Galaxy Tab). L'interaction 3D doit être ultra-fluide (>= 45-60 FPS), supporter les gestes multitouch (pincement, rotation au doigt) sans saccade et proposer des presets d'éclairage adaptés aux miroirs des salons.

**Approach:** Optimiser le viewer R3F dans `web/src/components/Studio3DCanvas.tsx` et `HeadModel3D.tsx` : activation d'OrbitControls configurés pour le tactile, éclairages studio 3 points commutables, rotation 360° fluide et ombres de contact réalistes.

## Boundaries & Constraints

**Always:** 
- Limiter les angles verticaux d'OrbitControls pour éviter d'inverser la tête 3D sous le sol.
- Conserver le dpr dynamique `dpr={[1, 2]}` pour garantir 60 FPS sur tablettes et smartphones.
- Proposer la bascule entre 3 ambiances lumineuses (Salon, Studio, Chaud).

**Ask First:** 
- Ajout de shaders post-processing lourds (ex: Bloom, SSAO) qui pourraient faire chuter les FPS sur mobile.

**Never:** 
- Autoriser la caméra 3D à passer à travers le maillage de la tête.
- Bloquer le scroll tactile principal de la page sur les zones hors canvas 3D.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Geste de rotation au doigt | Glissé horizontal/vertical sur canvas 3D | Rotation 360° fluide de la tête client | Repositionnement doux des limites angulaires |
| Bascule d'éclairage | Clic sur le bouton Soleil | Modification dynamique de l'ambiance (Salon, Studio, Chaud) | Transition sans sautillement d'image |
| Bouton Auto-Rotate | Activation du mode 360° | Rotation automatique continue y-axis | Arrêt au premier toucher de l'utilisateur |

</frozen-after-approval>

## Code Map

- `web/src/components/Studio3DCanvas.tsx` -- Canvas principal Three.js avec OrbitControls et presets d'éclairage.
- `web/src/components/HeadModel3D.tsx` -- Composant 3D de la tête et des coiffures afro avec textures PBR et ombres.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/components/Studio3DCanvas.tsx` -- Configurer OrbitControls tactiles et ambiances lumineuses studio -- Garantit 60 FPS et la réactivité mobile.
- [x] `web/src/components/HeadModel3D.tsx` -- Améliorer le rendu volumique et le tone-mapping ACESFilmic -- Donne un aspect premium et réaliste.

**Acceptance Criteria:**
- Given a touch swipe gesture on `Studio3DCanvas`, when dragged, then the 3D head rotates smoothly without page scroll lock issues.
- Given light preset toggled, when clicked, then lighting updates instantly between Salon, Studio, and Warm modes.
- Given auto-rotate enabled, when active, then head continuously turns 360° at constant frame rate.

## Design Notes

- Renderer : `@react-three/fiber` avec `@react-three/drei` OrbitControls.
- Palette éclairage : Key warm (#fff1e0), Fill terracotta soft (#F3D9C8), Rim neutral (#ffffff).

## Verification

**Commands:**
- `npm run build` (dans `web/`) -- expected: Build Next.js réussi.

## Suggested Review Order

**Studio 3D Canvas & Tactile Controls**

- Contrôles OrbitControls multitouch & ambiances lumineuses
  [`Studio3DCanvas.tsx:114`](../../web/src/components/Studio3DCanvas.tsx#L114)
