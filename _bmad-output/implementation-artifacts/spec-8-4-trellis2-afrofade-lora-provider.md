---
title: 'Story 8.4 — TRELLIS.2 + Afrofade LoRA provider'
type: 'feature'
created: '2026-08-20'
status: 'done'
review_loop_iteration: 1
baseline_commit: 'e63b7f34a5c80926a35819ae41cef576c92120b7'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** TRELLIS.2 reste un scaffold et Afrofade ne peut pas produire une coiffure réelle, traçable et réutilisable avec une reprise robuste après redémarrage.

**Approach:** Intégrer la queue officielle FAL `fal-ai/trellis-2-lora` derrière le contrat provider existant, checkpoint-er chaque étape dans le job interne, corréler un webhook de récupération, stocker le GLB brut, créer sa version draft puis lancer le normalizer canonique livré en 8.3.

## Boundaries & Constraints

**Always:** Garder `FAL_KEY` et les URLs LoRA côté serveur; désactiver le provider par défaut; utiliser un `ai_job` persistant avec lease et retries bornés; reprendre depuis le dernier checkpoint sans resoumettre dans les cas ordinaires; utiliser un webhook corrélé, un délai de grâce et une réconciliation avant toute resoumission; rendre observable toute soumission potentiellement dupliquée; valider HTTPS, taille et type du GLB; persister identifiants, durée, coût FCFA estimé et version des LoRA; préserver le brut si la normalisation échoue.

**Ask First:** Changer de fournisseur ou d’endpoint FAL; exposer un endpoint public; modifier le contrat `CanonicalHairAsset`; traiter le coût estimé comme facture réelle; ajouter entraînement ou publication automatique des LoRA.

**Never:** Prétendre garantir exactement une soumission FAL entre l’acceptation distante et le premier checkpoint local; appeler FAL depuis le frontend; journaliser un secret; générer pendant un essayage; produire un faux succès; conserver une URL FAL comme asset canonique; activer Hunyuan/Meshy; supprimer le brut à la suite d’un échec aval.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Génération | image HTTPS, style/version, LoRA configurée | queue FAL → GLB brut durable → draft → asset validé | erreurs structurées et observables |
| Reprise après crash | checkpoint présent, webhook tardif ou soumission incertaine | reprendre sans resubmit; sinon attendre et réconcilier avant une éventuelle resoumission signalée | retry interne borné et alerte doublon potentiel |
| Provider temporairement indisponible | timeout, 408/429/5xx | conserver checkpoint et replanifier | `TransientJobError` |
| Requête/résultat invalide | 4xx, JSON/GLB/identité incohérent | aucun faux asset validé | `PermanentJobError` |
| Normalisation refusée | mesh > budget ou métadonnées invalides | brut et draft auditable conservés | job échoue explicitement |

</frozen-after-approval>

## Code Map

- `api/services/hair/providers.py:22` — contrats provider, aliases, feature flags et gate LIVE à conserver; remplacer seulement le scaffold TRELLIS.2.
- `api/services/jobs/handlers.py:29` — registre worker; ajouter le handler `HAIR_GENERATION` et la classification transient/permanent.
- `api/main.py` — exposer uniquement le webhook FAL signé; accusé rapide et traitement idempotent par `request_id`.
- `api/services/jobs/job_queue.py:18` — façade queue; ajouter un checkpoint protégé par lease pour `provider_request_id` et `raw_asset_ref`.
- `api/services/jobs/worker.py:97` — heartbeat/retry existants à réutiliser sans modifier leur sémantique.
- `api/services/storage/asset_storage.py:25` — étendre le contrat par une lecture bornée pour reprise depuis le brut durable.
- `api/services/storage/paths.py:54` — chemin canonique `hair-assets/raw/styles/<style>/vN/...`.
- `api/services/hair/hair_asset_repository.py:18` — ajouter la création idempotente du draft avec provenance/coût.
- `api/services/hair/normalizer.py:128` — point d’entrée canonique 8.3; fournir métadonnées de repère/unité/échelle TRELLIS.
- `web/supabase/migrations/05_persistent_ai_jobs.sql:76` — invariants d’idempotence existants.
- `web/supabase/migrations/10_hair_asset_versions.sql:4` — lifecycle/version/provenance existants.
- `api/services/assets/hair_generator.py:1` — ancien scaffold non utilisé; ne pas l’étendre.

## Tasks & Acceptance

**Execution:**
- [x] `api/services/hair/trellis2_provider.py` et `api/services/hair/providers.py` — implémenter un adaptateur FAL injectable, fail-closed, avec submit/status/result officiels et LoRA configurées.
- [x] `web/supabase/migrations/12_trellis2_job_checkpoints.sql` et `api/services/jobs/job_queue.py` — persister atomiquement intention de soumettre, request ID, brut, draft et asset validé; accepter le webhook signé et signaler toute resoumission après délai de grâce.
- [x] `api/services/hair/fal_webhook.py` et `api/main.py` — vérifier la signature Ed25519/JWKS, la fraîcheur et le corps brut du webhook FAL; corréler le job interne et absorber les livraisons répétées.
- [x] `api/services/storage/{asset_storage.py,supabase_storage.py}` — lire le brut durable avec limites explicites pour les retries après redémarrage.
- [x] `api/services/hair/hair_asset_repository.py` — créer/résoudre idempotemment le draft exact `(style, version, source_job)` avant normalisation.
- [x] `api/services/jobs/handlers.py` — orchestrer FAL → stockage brut idempotent → draft → normalizer; reprendre aussi après upload ou normalisation déjà commise; enregistrer durée, tarif par résolution, conversion FCFA et erreurs structurées.
- [x] `.env.example` — documenter uniquement les variables serveur FAL/LoRA/timeouts/tarifs, provider OFF par défaut.
- [x] `api/scripts/validate_trellis2_provider.py`, tests SQL et `.github/workflows/p1-trellis2-provider.yml` — tester contrat exact, signature/replay webhook, leases/RPC, limites mémoire, fenêtres de crash et chaque ligne de la matrice; exécuter aussi les régressions worker/head/storage/scaffold/normalizer.

**Acceptance Criteria:**
- Given un job valide et des secrets serveur, when le worker le traite, then le job FAL est relié au même `ai_job`, le GLB brut est durable, le draft contient provenance/coût/durée et le normalizer produit l’asset canonique.
- Given un crash après submit, upload ou normalisation, when le lease est repris, then checkpoint/webhook et état durable sont réconciliés avant toute action; une resoumission après grâce est bornée, marquée `duplicate_risk` et observable.
- Given une panne retryable ou une réponse permanente invalide, when le handler la classe, then le worker applique respectivement retry borné ou échec terminal avec erreur structurée.
- Given un webhook FAL, when sa signature, son timestamp ou son identité est invalide, then aucun checkpoint n'est modifié; une livraison valide répétée reste idempotente.
- Given la CI sans credentials ni réseau FAL, when les validations s’exécutent, then tous les scénarios utilisent des transports injectés et les suites de régression existantes restent vertes.

## Spec Change Log

- Boucle 1 — La revue a montré qu'une garantie exactly-once est impossible sans clé d'idempotence FAL entre acceptation distante et checkpoint local. L'intention autorise désormais un best effort renforcé: intention durable avant submit, webhook signé, délai de grâce, réconciliation et alerte `duplicate_risk`. État connu à éviter: resoumission silencieuse présentée comme impossible. KEEP: provider fail-closed, checkpoints sous lease, brut durable, normalizer 8.3, tests hors ligne et coût estimé auditable.

## Design Notes

Le coût stocké est une estimation auditable calculée depuis le tarif configuré par résolution et un taux USD→FCFA snapshoté; il ne remplace pas la facturation FAL. Le contrat officiel est `fal-ai/trellis-2-lora`: champs LoRA par étape et `model_glb` en sortie. Le webhook vérifie les quatre en-têtes FAL, une fenêtre de ±300 s et la signature Ed25519 via le JWKS officiel mis en cache au plus 24 h. Le téléchargement GLB est streamé et borné avant matérialisation.

## Verification

**Commands:**
- `python3 api/scripts/validate_trellis2_provider.py` — tous les scénarios provider/restart passent sans réseau.
- `python3 api/scripts/validate_provider_scaffolding.py` — Hunyuan, Meshy et manual restent fail-closed.
- `python3 api/scripts/validate_hair_asset_normalizer.py` — le contrat canonique 8.3 reste vert.
- `python3 -m compileall -q api` — aucune erreur Python.
