---
title: 'Phase 1: Reconstruction Morphologique & Shared Identity FLAME 2023 Open Fitting'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/ARCHITECTURE-AFROFADE-3D.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le pipeline 3D actuel utilise un fichier GLTF minimal fictif ou un single-image fitting qui ne reconstruit pas fidèlement la morphologie réelle du crâne, de la mâchoire et du visage sur plusieurs vues.

**Approach:** Implémenter le module PyTorch `FLAME2023Model` et `SharedIdentityFitter` pour effectuer une optimisation conjointe du vecteur d'identité partagé ($\beta \in \mathbb{R}^{100}$) sur $N$ vues (face et profils) avec exclusion sémantique de la masse capillaire.

## Boundaries & Constraints

**Always:** Utiliser la topologie FLAME 2023 Open (5 023 vertices, 9 976 faces) comme référentiel canonique. Optimiser un seul vecteur d'identité $\beta$ pour l'ensemble des vues.

**Ask First:** Toute modification de la signature des endpoints API existants `/api/v1/reconstruct`.

**Never:** Dépendre de modèles non commerciaux ou académiques fermés (DECA v1 non commercial). Utiliser des générateurs d'objets génériques (TripoSR / InstantMesh) comme géométrie de base.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Multi-view Fitting | 3 photos (face, profil droit, nuque) | Mesh FLAME 3D déformé avec $\beta$ unique | Fallback gracieux sur landmarks face seule |
| Cheveux volumineux | Photo avec gros afro / locks | Masque sémantique isole la peau du cuir chevelu | Pondération zéro sur la silhouette capillaire |

</frozen-after-approval>

## Code Map

- `api/services/fitting/flame_model.py` -- Couche PyTorch FLAME 2023 Open (Shape $\beta$, Expression $\psi$, Pose $\theta$)
- `api/services/fitting/shared_identity_fitter.py` -- Fitting multi-vues avec perte 3D landmarks + régularisation
- `api/services/observation/head_segmentation.py` -- Segmentation sémantique peau/oreilles vs cheveux
- `api/services/reconstructor.py` -- Façade d'orchestration du fitting 3D

## Tasks & Acceptance

**Execution:**
- [x] `api/services/fitting/flame_model.py` -- Implémenter la classe PyTorch `FLAME2023Model` générant la géométrie 5023 vertices -- Permet le calcul différentiable de la morphologie crânienne.
- [x] `api/services/observation/head_segmentation.py` -- Créer la segmentation sémantique du visage/oreilles vs cheveux -- Évite la déformation du crâne par le volume de la coiffure.
- [x] `api/services/fitting/shared_identity_fitter.py` -- Implémenter l'optimiseur multi-vues PyTorch ($\beta$ partagé) -- Garantit la cohérence morphologique inter-vues.
- [x] `api/services/reconstructor.py` -- Connecter le fitting multi-vues dans le service Reconstructor -- Remplace le fallback mock par la reconstruction réelle.

**Acceptance Criteria:**
- Given 3 photos du même client, when `process_3d_head_reconstruction` est exécuté, then un vecteur d'identité $\beta$ unique est optimisé et la forme du crâne reste stable.

## Design Notes

L'optimisation PyTorch minimise :
$$\mathcal{L} = \lambda_{\text{lmk}} \mathcal{L}_{\text{landmarks}} + \lambda_{\text{shape}} \|\beta\|_2^2 + \lambda_{\text{expr}} \|\psi\|_2^2$$
Où $\beta$ est partagé entre toutes les vues $v \in \{1..N\}$, tandis que la pose $\theta_v$ et l'expression $\psi_v$ sont estimées par vue.

## Verification

**Commands:**
- `python3 scripts/test_e2e_integration.py` -- expected: HTTP 200 OK avec vertices_count = 5023
