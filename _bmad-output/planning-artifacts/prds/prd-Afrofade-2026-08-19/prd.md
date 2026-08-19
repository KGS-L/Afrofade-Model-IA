---
title: "PRD — Afrofade post-P0"
status: draft
created: 2026-08-19
updated: 2026-08-19
supersedes: "_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md"
change_source: "BMAD Correct Course post-P0"
---

# PRD: Afrofade — Plateforme B2B/B2C d'Essayage de Coiffures 3D

## 0. Document Purpose

Ce PRD devient le contrat produit canonique post-P0 d'Afrofade. Il conserve le concept du **Rituel du Miroir**, mais formalise désormais deux produits commerciaux distincts sur une même plateforme :

1. **Afrofade Salon (B2B)** — abonnement mensuel/engagé pour barbiers, salons et franchises ;
2. **Afrofade Consumer (B2C)** — expérience individuelle financée par crédits rechargeables, sans abonnement mensuel obligatoire.

Le produit repose sur un principe économique et technique central : les coiffures 3D du catalogue sont des **assets canoniques réutilisables**. Elles sont générées/numérisées une fois, normalisées, stockées et réappliquées à de nombreuses têtes ; les APIs lourdes de génération 3D ne doivent pas être rappelées à chaque essayage.

---

## 1. Vision

Afrofade permet à une personne de visualiser une coiffure sur sa propre morphologie 3D avant la coupe, puis de conserver, télécharger ou montrer le rendu au coiffeur. Pour les salons, Afrofade transforme cette capacité en outil de consultation premium, de fidélisation et d'upsell.

### 1.1 Valeur B2B Salon

- réduire l'incertitude avant coupe ;
- accélérer la consultation visuelle ;
- augmenter le panier moyen via les prestations complémentaires ;
- conserver un carnet client 3D ;
- différencier le salon par une expérience premium ;
- offrir des essayages illimités sur les têtes déjà générées selon le plan.

### 1.2 Valeur B2C Consumer

- créer sa propre tête 3D ;
- tester gratuitement les coiffures déjà disponibles sur cette tête ;
- comparer plusieurs looks avant de se rendre au salon ;
- télécharger un rendu HD et le montrer au coiffeur ;
- recharger des crédits uniquement lorsque nécessaire.

---

## 2. Target Users & Roles

### 2.1 `customer`

Particulier utilisant Afrofade pour lui-même.

JTBD : « Avant de me faire coiffer, je veux voir plusieurs styles sur ma propre tête et pouvoir montrer au coiffeur exactement ce que je veux. »

### 2.2 `salon`

Gérant, barbier ou coiffeur lié à un salon Afrofade.

JTBD : « Pendant la consultation, je veux générer une tête client, essayer rapidement plusieurs coiffures et transformer la décision en prestation. »

### 2.3 `admin`

Opérateur Afrofade responsable du catalogue, des paiements, du monitoring et des KPIs.

JTBD : « Je veux administrer la plateforme, les salons, le catalogue 3D et la santé commerciale sans pouvoir être usurpé par un rôle créé côté client. »

---

## 3. Business Model

### 3.1 B2B — Abonnements salons

Source de vérité applicative : `web/src/lib/plans.ts`.

- **PRO — 2 200 FCFA/mois** : 20 nouveaux clients 3D/mois ; essayages illimités sur les têtes créées ; catalogue de base ; carnet client basique.
- **VIP — 4 900 FCFA/mois** : 60 nouveaux clients 3D/mois ; catalogue complet ; 1 Go cloud ; HD ; cartes partageables ; support prioritaire.
- **EXTRA — 7 500 FCFA/mois** : 120 nouveaux clients 3D/mois ; multi-postes ; carnet étendu ; branding salon ; accès anticipé aux nouveaux assets.

Durées/remises :

- mensuel : 0 % ;
- 3 mois : -10 % ;
- 6 mois : -25 % ;
- annuel : -40 %.

Les montants sont toujours recalculés côté serveur. Le client ne peut jamais soumettre un prix faisant foi.

### 3.2 B2C — Crédits rechargeables

Source de vérité applicative : `web/src/lib/credits.ts`.

- **Pack Essai** : 500 FCFA → 5 crédits ;
- **Pack Style** : 1 000 FCFA → 12 crédits ;
- **Pack Passion** : 2 000 FCFA → 30 crédits.

Règles actuelles :

- création/reconstruction tête : 2 crédits ;
- essayage d'une coiffure : 0 crédit ;
- changement de coiffure/couleur : 0 crédit ;
- téléchargement HD : 1 crédit ;
- partage : 0 crédit ;
- nouvelle reconstruction avec nouvelles photos : 2 crédits.

Les crédits sont gérés par ledger serveur atomique et idempotent. Le solde affiché n'est jamais une valeur localStorage faisant foi.

---

## 4. User Journeys

### UJ-1 — Salon : essai freemium vers abonnement

1. Un prospect ouvre `/rituel`.
2. Il réalise un scan/photo guidé.
3. La tête est générée mais le rendu premium reste gated.
4. Il s'authentifie via Google ou e-mail OTP Supabase.
5. Il complète son profil salon.
6. Le serveur calcule le prix et crée une transaction de paiement `pending`.
7. Un provider de paiement redirige le client.
8. Le retour navigateur reste `pending` tant que le serveur n'a pas vérifié le paiement.
9. Après confirmation provider + finalisation DB, l'abonnement serveur devient actif et le rendu est déverrouillé.

### UJ-2 — Salon : consultation client

1. Le salon authentifié crée une nouvelle tête client dans la limite de son quota.
2. Les photos sont uploadées dans un espace appartenant au salon vérifié.
3. Un job 3D persistant est créé.
4. Un worker produit un `CanonicalHead` et le stocke dans l'object storage.
5. Le salon choisit des `CanonicalHairAsset` du catalogue.
6. Le moteur de fitting produit/affiche le try-on en moins de 500 ms pour le changement d'asset déjà disponible.
7. Le salon ajuste la Line-Up Art, propose un upsell et peut sauvegarder le résultat.

### UJ-3 — Consumer : crédits et essayage personnel

1. Le particulier s'authentifie comme `customer`.
2. Il achète ou possède des crédits.
3. Il dépense 2 crédits pour créer une tête 3D.
4. Une fois la tête créée, il teste gratuitement plusieurs coiffures du catalogue.
5. Il dépense 1 crédit s'il veut télécharger un rendu HD.
6. Il peut partager le rendu ou le montrer à son coiffeur.

### UJ-4 — Admin : gestion du catalogue 3D

1. L'admin choisit une source d'asset : TRELLIS.2 + LoRA Afrofade, Hunyuan3D Multi-View ou import manuel.
2. `HairAssetGenerator` crée/importe un asset brut.
3. `HairAssetNormalizer` le convertit en `CanonicalHairAsset` avec métadonnées, ancrages scalp et budget polygonal.
4. L'asset est stocké dans l'object storage et publié dans le catalogue.
5. Tous les clients/salons peuvent ensuite réutiliser cet asset sans rappeler le provider de génération.

---

## 5. Functional Requirements

### Identity, Auth & Tenant Security

**FR-1 — Authentication**  
Google OAuth et e-mail OTP Supabase sont les méthodes supportées. Aucune authentification démo ne doit exister en production.

**FR-2 — Server Session Verification**  
Toutes les routes protégées valident réellement le token Supabase côté serveur. Un cookie présent sans token valide ne suffit pas.

**FR-3 — RBAC**  
Les rôles `customer`, `salon`, `admin` proviennent de `user_profiles`. Le rôle admin ne peut pas être dérivé du domaine e-mail ni créé côté navigateur.

**FR-4 — Ownership**  
Uploads, têtes, transactions, wallets et données salon sont rattachés à l'identité vérifiée côté serveur et protégés par RLS/policies appropriées.

### Commerce

**FR-5 — Provider-neutral Checkout**  
Le checkout serveur accepte un provider et un identifiant produit, jamais un prix autoritaire fourni par le client.

**FR-6 — Payment Verification**  
Money Fusion doit être vérifié côté serveur via son token/endpoint de statut. GeniusPay doit vérifier la signature HMAC puis relire la transaction. Aucun redirect navigateur ni event webhook seul ne prouve le paiement.

**FR-7 — Idempotent Finalization**  
Une transaction payée ne peut créditer un wallet ni créer l'effet commercial deux fois, même si le provider envoie plusieurs notifications.

**FR-8 — Subscription State**  
L'état actif d'un abonnement est hydraté depuis la DB serveur, pas depuis localStorage.

**FR-9 — Credit Wallet**  
Les achats et dépenses de crédits produisent des entrées de ledger atomiques, auditables et idempotentes.

### Head Pipeline

**FR-10 — HeadGenerationManager**  
La génération de tête est accessible via une façade provider-neutral produisant un contrat `CanonicalHead`.

**FR-11 — FLAME/PyTorch Provider**  
FLAME/PyTorch reste le provider principal de reconstruction tête actuellement adopté. D'autres providers pourront être ajoutés sans modifier les consommateurs du contrat canonique.

**FR-12 — Persistent Jobs**  
Toute reconstruction lourde utilise un job persistant avec états `queued`, `running`, `completed`, `failed`. Les jobs ne sont pas uniquement stockés dans la mémoire du process FastAPI.

**FR-13 — Durable Asset Storage**  
Les GLB et outputs 3D sont stockés dans Supabase Storage ou un object storage S3-compatible. Aucun URL public ne doit pointer vers un fichier `/tmp` inaccessible au frontend.

**FR-14 — Head Performance Contract**  
Le pipeline doit exposer temps de traitement, taille d'asset, état et métriques de fitting. L'objectif produit reste un ressenti interactif rapide, mais les budgets réels doivent être mesurés avant de conserver une promesse stricte de 2 secondes sur tous les providers.

### Hair Asset Factory

**FR-15 — HairAssetGenerator**  
Une façade unique orchestre les providers de génération/numérisation des coiffures.

**FR-16 — Provider Sources**  
Les sources cibles sont : TRELLIS.2 + Afrofade LoRA, Hunyuan3D Multi-View et import manuel.

**FR-17 — HairAssetNormalizer**  
Chaque asset brut est normalisé vers `CanonicalHairAsset` avec orientation, scale, scalp anchors, polycount cible, preview et métadonnées de provenance/coût.

**FR-18 — Generate Once, Reuse Many**  
Un provider de génération de coiffure n'est pas appelé pendant chaque try-on. L'asset canonique du catalogue est réutilisé.

### Try-On / Studio

**FR-19 — Hair Fitting**  
Le système combine `CanonicalHead` et `CanonicalHairAsset` via un composant de fitting distinct de la génération d'asset.

**FR-20 — Real-time Catalog Swap**  
Changer entre des coiffures déjà chargées/cachées doit viser < 500 ms et conserver une expérience fluide sur tablette.

**FR-21 — R3F Viewer**  
Le viewer utilise React Three Fiber/Three.js, supporte rotation/zoom tactiles et vise ≥45 FPS sur les appareils cibles validés.

**FR-22 — Line-Up & Upsell**  
Le salon peut ajuster les contours et déclencher les suggestions de prestations complémentaires.

### Admin & Operations

**FR-23 — Admin Dashboard**  
L'admin peut consulter salons, abonnements actifs, paiements, MRR, conversion, wallets/crédits et santé des jobs 3D.

**FR-24 — Catalog Administration**  
L'admin peut créer, valider, publier/dépublier et versionner les assets coiffure.

**FR-25 — Biometric Purge**  
Les données temporaires non conservées explicitement sont purgées selon la politique de rétention. Le cron est protégé par secret obligatoire sans fallback public.

---

## 6. Non-Functional Requirements

**NFR-1 — Security**  
Secrets provider/service role uniquement côté serveur. Les endpoints internes FastAPI requièrent une authentification inter-service. CORS explicite.

**NFR-2 — Reproducibility**  
Frontend installé via lockfile (`npm ci`). Les dépendances ML restent contraintes aux familles compatibles validées en CI.

**NFR-3 — CI Gate**  
La CI doit inclure audit npm high-severity, typecheck, build Next, compilation Python, invariants P0, build Docker production, démarrage des conteneurs et smoke tests sécurité.

**NFR-4 — Reliability**  
Les jobs et outputs lourds survivent au redémarrage des process. Les événements provider sont idempotents.

**NFR-5 — Observability**  
Les jobs 3D et paiements doivent exposer des identifiants traçables, timestamps, erreurs structurées et métriques minimales.

**NFR-6 — Privacy**  
Consentement explicite pour les données faciales ; rétention limitée ; suppression des photos/assets temporaires selon politique ; aucune prétention de conformité juridique absolue sans validation dédiée.

**NFR-7 — Web Runtime**  
Stack cible validée : Next.js 16.3.1, React 19.2, R3F 9.7, Drei 10.7, Node 22 en CI.

---

## 7. MVP / Release Scope post-P0

### Must Have avant lancement commercial fiable

- auth/RBAC/RLS server-side ;
- provisioning correct des espaces customer/salon/admin ;
- checkout et finalisation paiement vérifiés ;
- wallet B2C server-side ;
- jobs 3D persistants ;
- object storage des GLB ;
- pipeline tête réellement branché ;
- catalogue d'assets coiffure canoniques ;
- fitting tête/coiffure ;
- dashboards client/salon/admin opérationnels sur leurs flux critiques ;
- purge biométrique et monitoring minimal.

### Can Follow

- GeniusPay live si HTTPS/credentials provider confirmés ;
- TRELLIS.2/LoRA à grande échelle ;
- automatisation avancée de normalisation mesh ;
- analytics avancés ;
- offline/PWA sophistiqué.

---

## 8. Success Metrics

### Product

- conversion essai salon → payant ;
- taux de recharge B2C après le premier pack ;
- nombre moyen de styles essayés par tête ;
- taux de téléchargement/partage des looks ;
- adoption de l'upsell salon.

### Technical

- taux de succès des jobs tête ;
- p50/p95 du temps de reconstruction ;
- taux de jobs repris après incident ;
- taille moyenne des `CanonicalHead`/`CanonicalHairAsset` ;
- temps p95 de changement de coiffure ;
- taux de webhook dupliqué sans double effet commercial ;
- erreurs de sécurité/ownership détectées par CI.

### Unit Economics

- coût API moyen par nouvel asset coiffure ;
- nombre d'essayages réutilisant un asset canonique ;
- coût IA moyen par tête B2C ;
- marge par pack de crédits ;
- marge par plan salon.

---

## 9. Open Questions

1. Quel backend de job persistant adopter en premier : table Postgres + worker, Redis/RQ, ARQ, Dramatiq ou Celery ?
2. Supabase Storage suffit-il pour tous les assets 3D initiaux ou faut-il préparer une interface S3-compatible abstraite dès P1 ?
3. Quel contrat géométrique exact devient obligatoire pour `CanonicalHead` et `CanonicalHairAsset` (axes, unités, anchors, LOD, UV) ?
4. Quels providers 3D seront utilisés en sandbox/production et quel budget maximum FCFA par asset/tête ?
5. Quand activer GeniusPay publiquement, après confirmation de l'endpoint HTTPS marchand ?

---

## 10. Explicit Decisions Locked by Correct Course

- B2B abonnements + B2C crédits coexistent.
- Le prix est server-authoritative.
- La DB vérifiée est source de vérité commerciale.
- `HairAssetGenerator` est l'architecture officielle de fabrique/catalogue des coiffures.
- Les coiffures sont générées une fois puis réutilisées.
- Les jobs 3D deviennent persistants.
- Les GLB ne sont pas servis depuis `/tmp`.
- FLAME/PyTorch est le provider tête principal actuel, pas une dépendance directe imposée à tous les consommateurs.
- Les trois espaces `customer`, `salon`, `admin` sont des parcours produit distincts à rendre opérationnels de bout en bout.
