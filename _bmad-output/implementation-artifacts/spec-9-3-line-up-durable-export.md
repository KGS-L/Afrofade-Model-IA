---
title: 'Story 9.3 — Line-Up & durable export'
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

**Problem:** Les ajustements de la ligne de coupe (line-up/contouring) et la sauvegarde finale de l'essayage 3D manquent de traçabilité d'exportation durable et de liaison avec les crédits B2C / quotas B2B.

**Approach:** Implémenter le service d'exportation d'essayage 3D (`api/services/fitting/lineup_export.py` et `web/src/lib/fitting/lineup-export.ts`), permettant le contrôle interactif de la ligne de contour, le packaging d'exportation avec traçabilité exacte des versions `CanonicalHead` + `CanonicalHairAsset`, et le stockage durable dans la section `tryons` de l'object storage.

## Boundaries & Constraints

**Always:** Référencer explicitement les identifiants et versions exacts du mesh de tête et de la coiffure; stocker l'artefact d'exportation dans le bucket `tryons` via `tryon_export_ref`; appliquer l'idempotence des exports payants; enregistrer la configuration de line-up (frontline offset, taper fade intensity).

**Ask First:** Autoriser l'exportation sans validation préalable de propriété de la tête.

**Never:** Produire une exportation d'essayage référençant un fichier temporaire ou non stocké de façon durable.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Export d'essayage standard | `head_id` v1 + `style_id` v2 + paramètres line-up | Fichier d'exportation stocké dans `tryons` + référence durable | Succès |
| Ajustement line-up interactif | Offset de ligne frontale (-10mm à +10mm) | Ajustement temps réel de la transformation | Application fluide |
| Tentative d'export sans ownership | Requête d'un utilisateur tiers | Rejet RLS / API boundary | `UnauthorizedExportError` |
| Idempotence de ré-export | Soumission répétée du même export_id | Réutilisation du fichier déjà stocké sans surcoût | CacheHit / Resumed |

</frozen-after-approval>

## Code Map

- `api/services/fitting/lineup_export.py` — Engine d'exportation 3D durable & traçabilité de versioning.
- `web/src/lib/fitting/lineup-export.ts` — Types et contrôles frontend du line-up slider et de l'exportation.
- `api/scripts/validate_lineup_export.py` — Test d'intégration offline de l'exportation 3D et du line-up.

## Tasks & Acceptance

**Execution:**
- [x] `api/services/fitting/lineup_export.py` — Implémenter `LineUpExportEngine` et la génération d'exportation durable.
- [x] `web/src/lib/fitting/lineup-export.ts` — Créer l'utilitaire TypeScript pour les contrôles de line-up et la soumission.
- [x] `api/scripts/validate_lineup_export.py` — Valider la traçabilité des versions, la persistance `tryons` et l'idempotence.

**Acceptance Criteria:**
- Given des paramètres de line-up et des références d'assets valides, when l'export est généré, then un enregistrement durable lié au bucket `tryons` est créé avec les versions exactes du head et du hair.
- Given une ré-exécution avec la même clé d'idempotence, when l'export est demandé, then le fichier existant est réutilisé.

## Verification

**Commands:**
- `python3 api/scripts/validate_lineup_export.py` — Harness de validation offline de Story 9.3.
