---
title: 'Story 9.1 — HairFitter contract'
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

**Problem:** Actuellement, les modèles 3D de cheveux et les modèles de tête sont rendus séparément sans contrat d'alignement formel ni ancrage anatomique sur le cuir chevelu, ce qui provoque des décalages géométriques lors de l'essayage.

**Approach:** Implémenter le service `HairFitter` (`api/services/fitting/hair_fitter.py` et `web/src/lib/fitting/hair-fitter.ts`), acceptant un `CanonicalHead` et un `CanonicalHairAsset`, calculant la matrice de transformation 3D (translation, rotation, échelle) et les décalages d'ancres scalp, tout en assurant l'immutabilité de l'asset du catalogue et la détermisation du cache.

## Boundaries & Constraints

**Always:** Utiliser des assets canoniques publiés (`CanonicalHead` et `CanonicalHairAsset`); préserver l'immutabilité des assets du catalogue; déduire le fitting à partir des ancres de cuir chevelu (`scalp_anchors`); générer des clés de cache déterministes; séparer l'alignement du processeur de génération.

**Ask First:** Modifier le schéma `CanonicalHead` ou `CanonicalHairAsset`.

**Never:** Appeler un provider de génération de cheveux (FAL/Hunyuan/TRELLIS) pendant la passe de fitting; muter les géométries source dans le catalogue.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fitting standard | `CanonicalHead` + `CanonicalHairAsset` | Matrice de transformation + ancres alignées + cache key | Succès déterministe |
| Coiffure ou tête sans ancres scalp | Asset sans carte d'ancres canonique | Alignement basé sur la boîte englobante de référence | `FallbackAlignmentNotice` |
| Asset non publié / non canonique | Draft ou version retirée | Rejet de l'essayage | `HairFitterAssetUnpublishedError` |
| Requête répétée identique | Mêmes identifiants Head & Hair | Résolution instantanée via le cache de fitting | `CacheHit` |

</frozen-after-approval>

## Code Map

- `api/services/fitting/hair_fitter.py` — Logique d'alignement et calcul des matrices de transformation backend.
- `web/src/lib/fitting/hair-fitter.ts` — Client/Viewer wrapper pour l'application fluide dans le Viewer 3D.
- `api/scripts/validate_hair_fitter.py` — Test d'intégration offline du contrat HairFitter.

## Tasks & Acceptance

**Execution:**
- [x] `api/services/fitting/hair_fitter.py` — Implémenter `HairFitter` avec calcul d'ancres scalp et matrice 3D.
- [x] `web/src/lib/fitting/hair-fitter.ts` — Créer l'utilitaire TypeScript frontend de fitting.
- [x] `api/scripts/validate_hair_fitter.py` — Valider l'alignement, le cache déterministe et l'immutabilité.

**Acceptance Criteria:**
- Given une tête canonique et une coiffure canonique publiée, when `HairFitter` est exécuté, then une transformation 3D valide (scale, offset, rotation) et une clé de cache déterministe sont retournées.
- Given deux exécutions successives sur les mêmes assets, when le cache est interrogé, then le résultat est identique sans ré-estimation.
- Given une coiffure non publiée, when le fitting est demandé, then l'exécution est rejetée fail-closed.

## Verification

**Commands:**
- `python3 api/scripts/validate_hair_fitter.py` — Harness de validation offline de HairFitter.
