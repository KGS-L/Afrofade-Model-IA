---
title: 'Intégration API FLAME/DECA 3D Preview dans le Modal d’Inspection'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le modal d'inspection 3D affichait des images statiques au lieu d'appeler l'API de reconstruction 3D FLAME/DECA du backend FastAPI pour obtenir le modèle 3D paramétrique réel.

**Approach:** Connecter `Hairstyle3DPreviewModal.tsx` à l'endpoint API `/v1/reconstruct` (ou `/api/v1/reconstruct`), déclencher l'appel lors de l'ouverture du modal d'inspection, et afficher les métriques FLAME/DECA retournées (temps de reconstruction, vertices, carnation/UV baking, paramètres).

## Boundaries & Constraints

**Always:** Toujours s'assurer que l'appel API gère le fallback si l'API FastAPI backend est hors-ligne ou renvoie un délai d'attente.

**Ask First:** Modifications des schemas d'API `/v1/reconstruct`.

**Never:** Ne pas supprimer le mode dégradé avec visuels locaux si le réseau réseau est coupé.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Clic icône Œil sur une coupe | Appel POST /v1/reconstruct -> statut "success" + données FLAME/DECA affichées dans la modale | Bascule automatique sur les données calculées locales en cas d'erreur |
| OFFLINE_API | API backend indisponible | Modale affiche les informations 3D avec indicateur "Mode Démo Locale" | Message informatif discret sans bloquer l'expérience |

</frozen-after-approval>

## Code Map

- `web/src/components/Hairstyle3DPreviewModal.tsx` -- Composant React du modal d'inspection 3D avec appel API FLAME/DECA.
- `api/services/reconstructor.py` -- Engine backend FLAME/DECA 3D pour la reconstruction du visage et du cuir chevelu.
- `api/main.py` -- Microservice FastAPI déclenchant l'endpoint `/v1/reconstruct`.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/components/Hairstyle3DPreviewModal.tsx` -- Intégrer `fetch('/api/v1/reconstruct')` et l'affichage dynamique des métriques FLAME/DECA -- Connecter le modal au backend.
- [x] `api/services/reconstructor.py` -- Enrichir le service avec la structure FLAME/DECA -- Garantir une réponse complète et typée.

**Acceptance Criteria:**
- Given la modale d'inspection 3D ouverte, when le composant est monté, then un appel API FLAME/DECA est exécuté et les métriques (Vertices, UV Baking, Temps de calcul) s'affichent dynamiquement.

## Verification

**Commands:**
- `npm run build` dans `web/` -- expected: Compilation Next.js réussie sans aucune erreur de type.

## Suggested Review Order

**Modal Inspection 3D & Multi-Modèles**

- Intégration de la sélection de modèles clients réels et envoi des photos multi-vues à l'API `/api/v1/reconstruct`
  [`Hairstyle3DPreviewModal.tsx:1`](../../web/src/components/Hairstyle3DPreviewModal.tsx#L1)

**Catalogue Hairstyle & Vues HD**

- Organisation des dossiers multi-vues par modèles et coupes dans `public/models/hairstyles/`
  [`HairstyleCatalog.tsx:1`](../../web/src/components/HairstyleCatalog.tsx#L1)

**Engine 3D FLAME/DECA Backend**

- Service paramétrique FLAME/DECA pour le fitting 3D, l'alignement et le baking UV 2048x2048
  [`reconstructor.py:1`](../../api/services/reconstructor.py#L1)

