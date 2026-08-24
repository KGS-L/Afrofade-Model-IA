---
slug: custom-afro-3d-model
companions:
  - dataset-and-architecture.md
sources: []
---

# SPEC: Modèle IA 3D Sur Mesure Spécialisé en Coiffure Afro (`Afro3D-Engine`)

## 1. Why

Les modèles IA 3D commerciaux génériques (Tripo3D, Meshy, Rodin) présentent trois limites majeures pour Afrofade :
1. **Facturation récurrente élevée** par requête (API payantes par génération), réduisant les marges.
2. **Qualité médiocre sur les cheveux afro/texturés** (mauvaise interprétation des tresses, locks, contours tressés et dégradés afro par les modèles entraînés sur des données occidentales).
3. **Absence de contrôle sur le maillage 3D** (têtes générées déformées ou incompatibles avec le modèle facial du client).

La création de notre propre modèle IA 3D sur mesure (**Afro3D-Engine**) résout ces problèmes en offrant un moteur 100% propriétaire, souverain, ultra-précis sur la typologie de cheveux afro et sans coût d'API tiers.

---

## 2. Capabilities

- **CAP-1 (Fine-Tuned Hair Generation)** : Générer des maillages et textures 3D haute fidélité pour les 6 taxonomies Afrofade (Fades/Tapers, Knotless Braids, Locs, Cornrows, Afro Natural, Barbe sculptée).
  - *Intent* : Obtenir un rendu 3D réaliste des coiffures afro.
  - *Success* : Les maillages générés respectent la densité et la géométrie des tresses/dégradés avec un score d'évaluation visuelle > 90%.

- **CAP-2 (FLAME Head Mesh Alignment)** : Aligner automatiquement la coiffure 3D générée sur le modèle facial 3D FLAME du client.
  - *Intent* : Garantir un essayage virtuel sur mesure (Try-On) adapté au crâne et au visage du client.
  - *Success* : Erreur de distance de surface (vertex-to-vertex offset) < 1.5mm entre la boîte crânienne et la coiffure.

- **CAP-3 (Self-Hosted Inference Pipeline)** : Offrir une API de génération 3D locale/déployée sur serveur GPU dédié (RunPod / FastAPI PyTorch).
  - *Intent* : Supprimer toute dépendance aux API payantes tierces.
  - *Success* : Temps d'inférence < 3 secondes par coiffure 3D sur GPU NVIDIA T4/A10G, sans aucun coût par requête d'API externe.

- **CAP-4 (GLB/Three.js Export)** : Exporter les modèles 3D en format binaire optimisé `.glb` pour affichage fluide sur mobile/web.
  - *Intent* : Rendre l'expérience 3D instantanée sur le scanner et la marketplace Afrofade.
  - *Success* : Poids du fichier GLB < 4.5 Mo avec 60 FPS constants sur navigateur web mobile.

---

## 3. Constraints

- **CONSTR-1 (Zéro API Payante Tiers)** : L'inférence doit tourner sur notre propre infrastructure (PyTorch / FastAPI local ou serveur GPU autonome).
- **CONSTR-2 (Compatibilité WebGL)** : Les maillages 3D ne doivent pas dépasser 80 000 polygones pour garantir la fluidité sur les smartphones en Afrique de l'Ouest.
- **CONSTR-3 (Précision Biométrique)** : Les données biométriques des visages clients doivent être traitées localement sans enregistrement permanent d'images brutes.

---

## 4. Non-goals

- Ne pas entraîner le modèle sur des objets 3D non liés à la coiffure (véhicules, vêtements, mobilier).
- Ne pas remplacer le moteur de réservation ou la marketplace : le modèle 3D est un service d'inférence dédié.

---

## 5. Success Signal

1. **Inépendance Financière & Technique** : 0 FCFA / 0$ dépensé en API payantes tierces pour la génération 3D.
2. **Rendu Visuel Supérieur** : Rendu des tresses, locks et dégradés afro supérieur aux générateurs 3D génériques du marché.
3. **Temps de Réponse Rapidissime** : Inférence 3D et assemblage GLB complétés en moins de 3 secondes.
