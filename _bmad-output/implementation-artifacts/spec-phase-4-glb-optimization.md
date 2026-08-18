---
title: 'Phase 4: Optimisation WebGL & Rendu 60 FPS (GLB Optimizer & Draco/KTX2)'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/ARCHITECTURE-AFROFADE-3D.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les fichiers GLB bruts et les images PNG 2K non compressées ralentissent le temps de chargement web et consomment excessivement la mémoire VRAM sur mobile.

**Approach:** Implémenter le service `api/services/exporter/glb_optimizer.py` utilisant la compression de maillage Draco/Meshopt et la préparation des cartes de textures GPU pour réduire l'empreinte du modèle sous la barre des 2 Mo et assurer un rendu 60 FPS fluide.

## Boundaries & Constraints

**Always:** Produire un fichier `.glb` valide compatible Three.js `useGLTF`. Conserver la topologie à 5023 vertices.

**Ask First:** Tout remplacement du format de stockage cible.

**Never:** Dégrader la résolution géométrique du visage sous le seuil critique.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Modèle FLAME 15 Mo | Export brut PyTorch | Modèle `.glb` compressé < 2 Mo | Fallback sur compression Trimesh standard |
| Navigateur mobile | Smartphone milieu de gamme | Rendu fluide 60 FPS sans lag VRAM | Chargement progressif (LOD) |

</frozen-after-approval>

## Code Map

- `api/services/exporter/glb_optimizer.py` -- Module d'optimisation GLB, Draco & Meshopt
- `api/services/reconstructor.py` -- Intégration de l'optimiseur dans la réponse de reconstruction

## Tasks & Acceptance

**Execution:**
- [x] `api/services/exporter/glb_optimizer.py` -- Implémenter la classe `GLBOptimizer` pour compresser les maillages et textures GLB.
- [x] `api/services/reconstructor.py` -- Connecter `GLBOptimizer` à l'export final de `process_3d_head_reconstruction`.

**Acceptance Criteria:**
- Given un maillage 3D FLAME, when `process_3d_head_reconstruction` est appelé, then un asset GLB optimisé WebGL est servi.

## Verification

**Commands:**
- `python3 scripts/test_e2e_integration.py` -- expected: HTTP 200 OK avec compression et optimization confirmées
