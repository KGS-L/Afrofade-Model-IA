---
title: 'Phase 3: Pipeline de Textures PBR Intrinsèques (UV Fusion & De-lighting)'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/ARCHITECTURE-AFROFADE-3D.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La projection UV simple réinjecte directement les ombres, reflets de flash et incohérences d'exposition des photos sur la peau 3D du client, produisant des coutures (seams) visibles.

**Approach:** Implémenter le module `api/services/texture/uv_fusion.py` et `api/services/texture/delighting_pbr.py` pour effectuer le blending multi-vues avec normalisation d'exposition, suppression des ombres (de-lighting) et génération des cartes PBR (`baseColor`, `normal`, `roughness`).

## Boundaries & Constraints

**Always:** Générer des cartes de texture PBR valides (`baseColor`, `normal`, `roughness`). Garantir l'homogénéité de la carnation de peau.

**Ask First:** Modifications des formats de sortie de texture.

**Never:** Utiliser une texture plate unie ou sans relief.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Photos avec flash / ombres | Photos HD sous éclairages différents | Carte `baseColor` uniforme sans reflets durs | Compensation automatique de la courbe gamma |
| Rendu PBR Client | Three.js `MeshPhysicalMaterial` | Diffraction sous la peau (Subsurface Scattering) | Fallback sur `MeshStandardMaterial` |

</frozen-after-approval>

## Code Map

- `api/services/texture/uv_fusion.py` -- Fusion UV multi-vues et raccordement de coutures (Seam Blending)
- `api/services/texture/delighting_pbr.py` -- Normalisation de peau & génération des cartes Normal et Roughness
- `api/services/reconstructor.py` -- Intégration des maps PBR dans la réponse de reconstruction

## Tasks & Acceptance

**Execution:**
- [x] `api/services/texture/uv_fusion.py` -- Créer la classe `MultiViewUVFusion` pour fusionner les cartes UV des différentes vues sans coutures.
- [x] `api/services/texture/delighting_pbr.py` -- Implémenter `PBRTextureGenerator` pour générer `baseColor`, `normal_map`, `roughness_map`.
- [x] `api/services/reconstructor.py` -- Mettre à jour `ReconstructionPipelineService` pour inclure les textures PBR complètes.

**Acceptance Criteria:**
- Given $N$ photos client, when la reconstruction s'exécute, then une carte PBR complète (`baseColor`, `normal`, `roughness`) est produite et intégrée au modèle.

## Verification

**Commands:**
- `python3 scripts/test_e2e_integration.py` -- expected: HTTP 200 OK avec maps PBR présentes
