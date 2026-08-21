# Epic 8 Context: Hair Asset Factory

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Transformer `HairAssetGenerator` en une fabrique réelle de catalogue où chaque coiffure est générée ou importée une seule fois, normalisée dans un contrat canonique, versionnée, stockée durablement puis réutilisée pour tous les essayages. Cette séparation entre production d’assets et fitting évite les appels coûteux aux providers pendant l’expérience interactive, tout en assurant la traçabilité, l’auditabilité et la qualité géométrique des coiffures publiées.

## Stories

- Story 8.1: Hair asset versioning schema
- Story 8.2: Fix provider scaffolding defects
- Story 8.3: HairAssetNormalizer real pipeline
- Story 8.4: TRELLIS.2 + Afrofade LoRA provider
- Story 8.5: Hunyuan3D Multi-View provider

## Requirements & Constraints

- Une façade `HairAssetGenerator` unique doit orchestrer les sources de coiffure sans exposer leurs particularités aux consommateurs. Les sources prévues sont TRELLIS.2 avec LoRA Afrofade, Hunyuan3D Multi-View et l’import manuel.
- Chaque résultat brut doit passer par le même `HairAssetNormalizer` pour produire un `CanonicalHairAsset` : orientation, unités et échelle normalisées, ancres scalp, budget polygonal et politique de LOD, preview, métadonnées de provenance et coût, ainsi qu’un rapport de validation.
- Les assets et leurs versions doivent conserver le style, le provider, les références aux sorties brute et canonique, les ancres, le polycount, le coût et le statut. Une version publiée doit pouvoir être résolue sans perdre l’historique des versions retirées.
- Les sorties GLB et autres artefacts 3D doivent être stockés dans un object storage durable Supabase ou S3-compatible ; aucune URL consommée par le frontend ne peut dépendre d’un fichier temporaire local.
- La génération provider est asynchrone et doit être reliée à un job interne persistant dont les états, identifiants, timestamps, durées, coûts et erreurs structurées sont observables. Les jobs et sorties lourdes doivent survivre aux redémarrages, et les événements provider doivent être idempotents.
- Les échecs et tentatives doivent être explicites. Le mode scaffold doit être identifiable et ne doit jamais être présenté comme un succès réel du provider ; les identifiants et résultats simulés doivent rester propres à chaque requête.
- Les credentials des providers et les rôles de service restent exclusivement côté serveur. Les endpoints FastAPI internes exigent une authentification inter-service et une politique CORS explicite.
- Une coiffure canonique publiée est réutilisée par les clients et salons sans rappeler le provider de génération lors de chaque essayage. L’administration du catalogue doit pouvoir valider, publier, dépublier et versionner ces assets.

## Technical Decisions

- `CanonicalHairAsset` est la frontière stable entre la génération/numérisation et le fitting. Le chemin conceptuel est `CanonicalHead + CanonicalHairAsset -> HairFitter -> TryOnAsset`; le fitting reste distinct de la fabrique d’assets.
- Les meshes de tête et de coiffure restent strictement séparés. L’ajustement ultérieur s’appuie sur un système d’ancres canoniques du cuir chevelu couvrant notamment le sommet, la ligne frontale, les tempes, la couronne, l’occipital, les oreilles et la base du cou.
- La géométrie destinée au web doit respecter une stratégie d’optimisation GLB et de LOD ; l’architecture cible prévoit Meshopt ou Draco pour la géométrie et KTX2/Basis pour les textures.
- TRELLIS.2 avec LoRA Afrofade sert à générer des coiffures canoniques, tandis que Hunyuan3D Multi-View sert à numériser des coiffures réelles à partir d’entrées multi-vues validées. Les deux alimentent le même normalizer et préservent provenance et version.
- La distribution cible repose sur un object storage S3-compatible avec accès CDN, afin que les assets publiés soient durables et réutilisables indépendamment du processus de calcul.

## UX & Interaction Patterns

Les détails techniques de génération, de mesh et de format GLB ne doivent jamais être exposés aux clients des salons. Les coiffures publiées apparaissent comme des aperçus 3D dans le catalogue et doivent pouvoir être appliquées instantanément dans le studio ; les états de chargement utilisent un squelette avec shimmer plutôt qu’un écran blanc.

## Cross-Story Dependencies

- Le schéma de versioning de la Story 8.1 fournit la persistance et la résolution des versions utilisées par tous les providers et par la publication du catalogue.
- Les corrections de scaffold de la Story 8.2 établissent la sémantique fiable des jobs et résultats avant les intégrations réelles.
- Le normalizer de la Story 8.3 est le point de passage commun des sorties brutes produites par TRELLIS.2 dans la Story 8.4 et Hunyuan3D dans la Story 8.5.
- L’epic dépend des jobs persistants et du stockage durable livrés par l’Epic 7. Ses assets canoniques deviennent ensuite l’entrée du fitting temps réel et du studio de l’Epic 9, ainsi que du workflow d’administration du catalogue de l’Epic 11.
