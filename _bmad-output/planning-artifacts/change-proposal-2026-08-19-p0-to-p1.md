# Afrofade — BMAD Correct Course Proposal (Post-P0)

Date: 2026-08-19
Statut: PROPOSITION DE RECALAGE
Source: état réel du repo après P0.1/P0.2/P0.3, PRD BMAD, architecture BMAD et epics/stories existants.

## 1. Change signal

Le produit et l'architecture ont évolué plus vite que les artefacts BMAD existants. Le socle P0 a sécurisé l'authentification, les rôles, les paiements, les crédits, les uploads, les appels FastAPI, la CI/CD et la reproductibilité des builds. En parallèle, la stratégie produit a évolué vers un modèle dual B2B/B2C et la stratégie 3D vers une séparation nette entre génération de tête et génération/catalogage des coiffures.

Cette évolution constitue un changement significatif de périmètre et d'architecture et justifie un passage BMAD `Correct Course` avant toute nouvelle implémentation majeure.

## 2. Écarts identifiés entre le plan BMAD et le repo actuel

### 2.1 Produit / business model

Le plan actuel couvre principalement les salons et les abonnements PRO/VIP/EXTRA. Le produit doit désormais formaliser deux parcours commerciaux distincts :

- B2B salons : abonnements PRO / VIP / EXTRA ;
- B2C particuliers : portefeuille de crédits rechargeables, sans abonnement mensuel obligatoire.

Les crédits B2C doivent couvrir au minimum la création/reconstruction de tête et le téléchargement HD, tandis que l'essayage et le changement de coiffure peuvent rester gratuits selon la politique produit.

### 2.2 Paiements

L'Epic 5 historique décrit encore un webhook générique. Le repo possède désormais une architecture provider-neutral :

- checkout unifié ;
- Money Fusion avec vérification serveur de l'état par `tokenPay` ;
- GeniusPay avec HMAC-SHA256 + relecture autoritative de la transaction ;
- finalisation atomique et idempotente en base ;
- subscriptions et wallets/crédit ledger dérivés uniquement d'une transaction vérifiée.

Money Fusion peut rester le provider activé initialement. GeniusPay reste feature-gated tant qu'un endpoint HTTPS marchand n'est pas confirmé.

### 2.3 Auth / sécurité

Le plan historique doit être corrigé pour refléter :

- validation de session Supabase côté serveur ;
- rôles `customer`, `salon`, `admin` stockés dans `user_profiles` ;
- suppression des fallbacks démo ;
- cookie HttpOnly ;
- autorisation admin serveur ;
- uploads liés à l'identité vérifiée ;
- service-role strictement server-side ;
- FastAPI protégé par secret inter-service ;
- CORS explicite ;
- secrets de production fail-closed.

### 2.4 Stack web

La référence Next.js 14 est obsolète. Le repo validé P0 utilise désormais :

- Next.js 16.3.1 ;
- React 19.2 ;
- React Three Fiber 9.7 ;
- Drei 10.7 ;
- Node.js 22 en CI.

### 2.5 Architecture 3D

Le pipeline doit être recalé autour de deux domaines séparés.

#### Head generation

`HeadGenerationManager`

- FLAME/PyTorch comme provider principal actuel ;
- provider Hunyuan Head futur ;
- sortie normalisée `CanonicalHead`.

#### Hair asset generation/catalog

`HairAssetGenerator`

- TRELLIS.2 + Afrofade LoRA pour générer des coiffures canoniques ;
- Hunyuan3D Multi-View pour numériser des coiffures réelles ;
- import manuel ;
- `HairAssetNormalizer` ;
- sortie `CanonicalHairAsset` stockée dans un catalogue réutilisable.

Principe économique invariant : une coiffure est générée/normalisée une fois, puis réutilisée pour les essayages ; ne pas appeler les providers de génération 3D à chaque try-on.

#### Try-on

`CanonicalHead + CanonicalHairAsset -> HairFitter -> TryOnAsset`

Le fitting doit être un traitement distinct de la génération du catalogue.

### 2.6 Jobs et stockage

L'ancien pseudo-job in-memory/synchrone n'est pas acceptable pour la suite. La cible doit prévoir :

- jobs persistants ;
- worker(s) asynchrones ;
- état `queued/running/completed/failed` persistant ;
- reprise après redémarrage ;
- stockage des GLB dans Supabase Storage ou un object storage S3-compatible ;
- aucune dépendance à `/tmp` ou à un chemin développeur local pour servir les assets web.

## 3. Recommandation BMAD

### Décision

Ne pas poursuivre directement l'ancien Epic 5 ou les anciennes stories telles quelles.

### Séquence BMAD proposée

1. `Correct Course` — ce document.
2. `PRD` — mettre à jour les exigences produit et commerciales B2B/B2C.
3. `Architecture` — ratifier le socle P0 et la nouvelle architecture Head/Hair/Jobs/Storage.
4. `Create Epics and Stories` — remplacer/étendre les stories obsolètes et ajouter les nouveaux epics.
5. `Sprint Planning` — readiness gate PASS/CONCERNS/FAIL et création du sprint status.
6. `Build` — implémentation story par story avec tests et review.
7. `QA Automation` — E2E/API sur les parcours critiques.

## 4. Nouveau découpage de haut niveau proposé

### Epic 1 — Identity, RBAC & Tenant Security

Objectif : finaliser le modèle customer/salon/admin, RLS, provisioning salon et protection des ressources.

### Epic 2 — Commerce Platform B2B/B2C

Objectif : abonnements salons, wallets/crédits particuliers, transactions idempotentes, Money Fusion/GeniusPay, billing state serveur.

### Epic 3 — Durable 3D Head Pipeline

Objectif : `HeadGenerationManager`, FLAME production, jobs persistants, object storage, observabilité et contrats `CanonicalHead`.

### Epic 4 — Hair Asset Factory

Objectif : `HairAssetGenerator`, TRELLIS.2/LoRA, Hunyuan3D Multi-View, normalisation, catalogue et coût par asset.

### Epic 5 — Real-Time Hair Fitting & Studio

Objectif : fitting `CanonicalHairAsset` sur `CanonicalHead`, viewer R3F, performance, line-up, HD export.

### Epic 6 — Consumer Credits Journey

Objectif : parcours particulier photos -> tête -> essayage -> téléchargement/partage -> recharge crédits.

### Epic 7 — Salon Operations & Admin

Objectif : dashboard salon opérationnel, quotas, clients, catalogue, abonnements, admin SaaS/KPIs/transactions.

### Epic 8 — Production Operations & Compliance

Objectif : purge biométrique, consentement, audit trail, monitoring, backups, CI/CD, incident readiness.

## 5. Priorité d'implémentation après recalage

Après mise à jour des artefacts BMAD, la prochaine tranche d'implémentation recommandée est :

**P1 — Durable 3D Infrastructure**

Ordre :

1. contrat `CanonicalHead` / `CanonicalHairAsset` / `TryOnAsset` ;
2. job model persistant + worker ;
3. object storage pour GLB/assets ;
4. correction et branchement réel de `HeadGenerationManager` ;
5. pipeline FLAME -> storage -> metadata DB ;
6. tests d'intégration job lifecycle ;
7. ensuite seulement intégration réelle TRELLIS.2 / Hunyuan3D.

## 6. Conditions de sortie du Correct Course

Le recalage est considéré terminé lorsque :

- PRD reflète B2B + B2C crédits ;
- architecture reflète P0, Next 16/React 19, provider-neutral payments, jobs persistants et object storage ;
- HairAssetGenerator est officiellement l'architecture catalogue coiffures ;
- epics/stories couvrent les trois espaces customer/salon/admin et les pipelines 3D ;
- les anciennes références contradictoires (Next 14, webhook générique, DECA comme vérité unique, jobs in-memory comme solution cible) sont retirées ou marquées historiques ;
- Sprint Planning peut produire un statut exploitable sans CONCERNS bloquants.
