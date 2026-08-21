---
title: 'Story 8.5 — Hunyuan3D Multi-View provider'
type: 'feature'
created: '2026-08-21'
status: 'done'
review_loop_iteration: 1
baseline_commit: 'e63b7f34a5c80926a35819ae41cef576c92120b7'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hunyuan3D multi-view est sous forme de scaffold fail-closed. Afrofade a besoin de numériser des coiffures réelles à partir de vues multiples (face, profil, dos) en produisant des assets 3D canoniques durables sans perturber le pipeline existant.

**Approach:** Implémenter l'adaptateur Hunyuan3D multi-view (`api/services/hair/hunyuan_provider.py`) sous le contrat provider existant (`HairProvider`), valider l'ensemble d'images multi-vues, persister les checkpoints du job sous lease worker, stocker le GLB brut puis appeler le `HairAssetNormalizer` livré en Story 8.3.

## Boundaries & Constraints

**Always:** Garder les clés API serveur uniquement; désactiver le provider par défaut (`HAIR_PROVIDER_HUNYUAN_MULTIVIEW_ENABLED=false`); valider la présence et la conformité HTTPS des images multi-vues; persister l'état du job avec retries bornés; stocker le GLB brut de façon durable; passer par `HairAssetNormalizer`; conserver le brut si la normalisation échoue.

**Ask First:** Changer de contrat `CanonicalHairAsset` ou modifier la signature de `HairAssetNormalizer`.

**Never:** Exposer les clés API au frontend; exécuter le traitement pendant un essayage temps réel; produire un faux succès en scaffold.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Génération multi-vue | Dictionnaire HTTPS (front/side/back), style/version | Traitement provider → GLB brut durable → draft → asset validé | Erreurs structurées |
| Entrées multi-vues incomplètes | Moins de 2 vues ou URLs non-HTTPS | Rejet immédiat | `PermanentJobError` |
| Erreur réseau temporaire provider | Timeout / HTTP 5xx | Reprise/retry sous lease | `TransientJobError` |
| Échec de normalisation | GLB non valide ou polycount > budget | Brut conservé pour audit, job échoué | `PermanentJobError` |

</frozen-after-approval>

## Code Map

- `api/services/hair/hunyuan_provider.py` — Implémentation de l'adaptateur Hunyuan3D multi-view (`HunyuanMultiViewHairProvider`).
- `api/services/hair/providers.py` — Remplacement du scaffold par l'adaptateur réel activable via feature flag.
- `api/services/jobs/handlers.py` — Orchestration du job de génération pour provider `"hunyuan_multiview"`.
- `api/scripts/validate_hunyuan_provider.py` — Harness de validation offline.

## Tasks & Acceptance

**Execution:**
- [x] `api/services/hair/hunyuan_provider.py` — Implémenter `HunyuanMultiViewHairProvider` injectable et fail-closed.
- [x] `api/services/hair/providers.py` — Raccorder l'adaptateur dans le registre des providers.
- [x] `api/services/jobs/handlers.py` — Orchestrer le traitement `hunyuan_multiview` → stockage brut → draft → normaliseur.
- [x] `api/scripts/validate_hunyuan_provider.py` — Écrire et exécuter le test d'intégration offline.

**Acceptance Criteria:**
- Given un payload multi-vue valide et le provider activé, when le worker exécute le job, then le GLB brut est stocké durablement et le normaliseur produit l'asset canonique.
- Given des entrées invalides ou non-HTTPS, when le job est soumis, then il est rejeté précoce sans appel provider inutile.
- Given la CI sans credentials, when les validations s'exécutent, then tous les tests utilisent des transports injectés et restent verts.

## Verification

**Commands:**
- `python3 api/scripts/validate_hunyuan_provider.py` — Validation offline complète du provider Hunyuan3D.
