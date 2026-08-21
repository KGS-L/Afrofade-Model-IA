---
title: 'Story 9.2 — Catalog swap performance'
type: 'feature'
created: '2026-08-21'
status: 'done'
review_loop_iteration: 1
baseline_commit: 'e63b7f34a5c80926a35819ae41cef576c92120b7'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le changement de coiffure 3D dans le studio interactif peut souffrir de latences s'il n'est pas préchargé ou s'il tente d'appeler les providers de génération, et des changements répétés risquent de créer des fuites de mémoire Three.js.

**Approach:** Implémenter le service de cache et de préchargement de coiffure (`web/src/lib/fitting/catalog-swap-cache.ts` et `api/services/fitting/catalog_swap.py`), garantissant un temps de changement sub-500ms sans appel aux providers génératifs, avec gestion explicite du garbage collection 3D (dispose des géométries/textures) et feedback visuel avec shimmer/skeleton.

## Boundaries & Constraints

**Always:** Réutiliser les assets canoniques pré-générés stockés dans le catalogue; nettoyer les ressources WebGL lors du remplacement d'un mesh (`geometry.dispose()`, `material.dispose()`); mesurer la latence du swap (< 500 ms p50/p95); afficher des skeleton/shimmers pendant le chargement au lieu d'un écran blanc.

**Ask First:** Augmenter la taille maximale du cache préchargé en mémoire client (ex: > 5 assets simultanés).

**Never:** Invoquer un provider de génération 3D (FAL/TRELLIS/Hunyuan) pendant l'essayage interactif du catalogue.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Swap style préchargé | Sélection d'une coiffure en cache client | Affichage instantané (< 50 ms) | CacheHit |
| Swap style publié non-cache | Sélection d'une coiffure canonique | Téléchargement GLB + fitting sub-500ms + shimmer | Skeleton feedback |
| Changement rapide successif (50+ swaps) | Utilisateur défile rapidement le catalogue | Libération propre WebGL, mémoire stable (< 150 MB) | Anti-leak cleanup |
| Erreur réseau lors du GLB fetch | Perte de connexion pendant le swap | Fallback coiffure précédente avec notification toast | NetworkError retry |

</frozen-after-approval>

## Code Map

- `web/src/lib/fitting/catalog-swap-cache.ts` — Cache de préchargement d'assets GLB frontend avec gestion de mémoire WebGL.
- `api/services/fitting/catalog_swap.py` — Valideur et métriques de latence de swap backend.
- `api/scripts/validate_catalog_swap_performance.py` — Test de performance et de non-fuite mémoire.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/lib/fitting/catalog-swap-cache.ts` — Créer le gestionnaire de cache LRU et de disposal Three.js.
- [x] `api/services/fitting/catalog_swap.py` — Implémenter les métriques de swap et la vérification de zéro-génération.
- [x] `api/scripts/validate_catalog_swap_performance.py` — Valider l'absence d'appel provider et les temps de swap sub-500ms.

**Acceptance Criteria:**
- Given une coiffure publiée dans le catalogue, when le client bascule dessus, then aucun provider génératif n'est appelé et le swap prend < 500 ms.
- Given 100 swaps successifs, when le cache est purgé, then les ressources WebGL sont libérées sans fuite.

## Verification

**Commands:**
- `python3 api/scripts/validate_catalog_swap_performance.py` — Verification harness pour la performance du swap catalogue.
