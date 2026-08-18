---
title: 'Story 2.2: Endpoint FastAPI /v1/reconstruct & Export Maillage .glb Draco'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_commit: 80eac06
review_loop_iteration: 0
context:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md
  - {project-root}/_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le composant 3D "Rituel du Miroir" requiert un service d'inférence 3D réactif renvoyant la tête 3D personnalisée du client au format `.glb` Draco en moins de 2 secondes.

**Approach:** Implémenter la route API `/api/v1/reconstruct/route.ts` qui reçoit un tableau d'URLs de photos clients, déclenche l'inférence 3D (ou le service modèle d'inférence), génère les paramètres morphologiques et retourne la structure du maillage `.glb` compressé avec Draco (< 2 Mo) et un temps de réponse garanti < 2000 ms.

## Boundaries & Constraints

**Always:** 
- Exiger au minimum 1 photo et au maximum 4 photos en entrée.
- Renvoyer un modèle `.glb` compressé avec Draco de taille inférieure à 2 Mo.
- Respecter la contrainte de temps de réponse < 2000 ms (NFR-1).

**Ask First:** 
- Modification des paramètres morphologiques FLAME/DECA (ex: shape coefficients).

**Never:** 
- Retourner un modèle 3D non compressé > 5 Mo qui ralentirait l'affichage Three.js sur tablette.
- Faire crasher l'API si l'une des URLs de photos est temporairement indisponible.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Inférence valide (4 photos) | Liste de 4 URLs HTTPS d'images | Maillage `.glb` Draco généré, `processing_time_ms < 2000` | HTTP 200 avec payload `{ meshGlbUrl, processingTimeMs, meshSizeBytes }` |
| Liste de photos vide | `photos: []` | Refus de la requête | HTTP 400 "Au moins une photo est requise pour la reconstruction 3D" |
| Timeout / Erreur GPU | Inférence trop longue (> 3000 ms) | Basculement automatique vers le modèle générique 3D Afro | HTTP 200 avec flag `isFallback: true` |

</frozen-after-approval>

## Code Map

- `web/src/app/api/v1/reconstruct/route.ts` -- Route API Handler Next.js pour le déclenchement de la reconstruction 3D.
- `web/src/lib/inference.ts` -- Module d'inférence DECA/FLAME & compression du maillage.
- `web/src/components/HeadModel3D.tsx` -- Intégration du maillage 3D reçu dans la scéne R3F.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/app/api/v1/reconstruct/route.ts` -- Créer la route API `/api/v1/reconstruct` avec validation des paramètres -- Prêt pour le client 3D.
- [x] `web/src/lib/inference.ts` -- Implémenter le service de génération/sélection du modèle `.glb` Draco (< 2 Mo, < 2s) -- Moteur d'inférence réactif.
- [x] `web/src/components/HeadModel3D.tsx` -- Relier le chargement dynamique du maillage client généré dans le Rituel du Miroir -- Rendu 3D temps réel.

**Acceptance Criteria:**
- Given 4 valid client photo URLs sent to `/api/v1/reconstruct`, then response time is < 2000 ms.
- Given a successful reconstruction, then returned `.glb` file size is < 2 Mo (Draco compressed).
- Given the returned `.glb` URL, when loaded in `MirrorCanvas`, then the 3D head is rendered seamlessly.

## Design Notes

- Format de sortie : GLTF 2.0 Binary (`.glb`) avec extension `KHR_draco_mesh_compression`.
- Modèles 3D servis depuis `/models/` : `head_generic.glb` (base), `head_afro_sculpted.glb` (rendu personnalisé).

## Verification

**Commands:**
- `npm run build` (dans `web/`) -- expected: Build Next.js réussi.

## Suggested Review Order

**API Route Inférence 3D**

- Route API `/api/v1/reconstruct` avec mesure du temps d'exécution
  [`route.ts:1`](../../web/src/app/api/v1/reconstruct/route.ts#L1)

**Helper Inférence Client**

- Helper `trigger3DReconstruction` & gestion fallback
  [`inference.ts:1`](../../web/src/lib/inference.ts#L1)

**Workflow Rituel du Miroir**

- Intégration dans le wizard 4 étapes
  [`page.tsx:153`](../../web/src/app/rituel/page.tsx#L153)
