---
title: 'Phase 6A: Real FLAME Minimal Reconstruction & PyTorch Autograd Fitting'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/ARCHITECTURE-AFROFADE-3D.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le pipeline 3D actuel utilise un fichier GLTF minimal fictif et des paramètres beta hardcodés sans effectuer de vraie détection MediaPipe ni de vraie optimisation PyTorch.

**Approach:** Implémenter le vrai modèle PyTorch FLAME 2023 Open (shape-only 100D), l'extraction réelle MediaPipe 478 landmarks, la caméra weak-perspective, la boucle d'optimisation PyTorch Autograd avec Adam, l'export des preuves (`flame_fitted.obj`, `head.glb`, `fit_report.json`), et l'affichage du vrai GLB dans le frontend avec un mode Clay.

## Boundaries & Constraints

**Always:** Exécuter une vraie détection MediaPipe 478 points et une vraie optimisation PyTorch Autograd. Générer un vrai fichier GLB à 5 023 vertices.

**Ask First:** Modifications des formats de sortie.

**Never:** Retourner un statut `completed` ou un succès si un fallback ou placeholder a été utilisé.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Inférence Photo Client | Photo HD face/profil | Mesh FLAME 3D réels avec $\beta$ unique optimisé | Erreur explicite si aucun visage n'est détecté |
| Inspection Géométrique | Option Clay Mode dans le Web | Rendu mat gris sans texture pour vérifier la morphologie | Bascule instantanée en UI |

</frozen-after-approval>

## Code Map

- `api/services/fitting/flame_model.py` -- Modèle PyTorch FLAME 2023 Open (Shape 100D, 5023 vertices, 9976 faces)
- `api/services/observation/head_segmentation.py` -- Extraction réelle des 478 landmarks MediaPipe FaceMesh
- `api/services/fitting/shared_identity_fitter.py` -- Optimiseur PyTorch Autograd avec perte de reprojection & régularisation
- `api/services/reconstructor.py` -- Façade d'orchestration et générateur d'exports GLB/OBJ réels
- `web/src/components/HeadModel3D.tsx` -- Rendu Three.js du vrai GLB généré + option Clay Mode

## Tasks & Acceptance

**Execution:**
- [x] `api/services/fitting/flame_model.py` -- Implémenter la couche PyTorch `FLAME2023PyTorchModel` (5 023 vertices, 100D shape, 9 976 faces).
- [x] `api/services/observation/head_segmentation.py` -- Intégrer l'extraction réelle MediaPipe 478 landmarks et enregistrer `landmarks_input.png`.
- [x] `api/services/fitting/shared_identity_fitter.py` -- Implémenter la boucle PyTorch `Adam` optimisant $\beta \in \mathbb{R}^{100}$ et la caméra weak-perspective.
- [x] `api/services/reconstructor.py` -- Exporter `flame_fitted.obj`, `head.glb` (5 023 vertices) et `fit_report.json`.
- [x] `web/src/components/HeadModel3D.tsx` -- Charger le vrai GLB généré et ajouter la bascule `Clay Mode`.

**Acceptance Criteria:**
- Given 2 clients avec des visages différents (Client A vs Client B), when l'optimisation s'exécute, then $\beta_A \neq \beta_B$, le landmark loss diminue réellement et deux meshes GLB physiquement distincts sont affichés dans Three.js en Clay Mode.

## Verification

**Commands:**
- `python3 scripts/test_e2e_integration.py` -- expected: Inférence réelle et génération de `head.glb` valide
- `python3 scripts/test_phase6a_validation.py` -- expected: Distinctivité morphologique validée entre Client A et Client B
