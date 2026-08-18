# 🧠 Spécification Technique du Pipeline IA/ML Afrofade : Reconstruction 3D Tête-au-Cou

> **Objectif Produit** : Reconstruire en **< 2 secondes** un modèle 3D géométriquement exact et ultra-réaliste (de la tête jusqu'au bas du cou, 360°) préservant **100 % de l'identité du client** (forme du visage/crâne, vraie carnation de peau, traits faciaux et barbe) via le **Mode Scan Vidéo Guidé Temps Réel (FaceID Scanner)**.

---

## 🏗️ 1. Architecture Globale du Pipeline IA/ML (FastAPI + PyTorch/ONNX)

```
[ 4 Photos Client ] ──► [ Module 1 : Quality Gatekeeper ] ──► (Valide / Rejette avec conseils)
                                    │
                                    ▼ (Si Valide)
                        [ Module 2 : Segmentation SAM-2 ] ──► (Dénudage Cuir Chevelu & Isol. Cou)
                                    │
                                    ▼
                        [ Module 3 : Fitting FLAME/DECA ] ──► (Géométrie Crâne & Visage 3D)
                                    │
                                    ▼
                        [ Module 4 : UV Texture Baking ]  ──► (Fusion Vraie Carnation & Peau)
                                    │
                                    ▼
                        [ Fichier .GLB 3D WebGL 60 FPS ]
```

---

## 🛡️ 2. Module 1 : Gatekeeper & Contrôle de Qualité Strict des Photos (Input Validation)

Afin de garantir un rendu 3D ultra-précis, l'API IA rejette instantanément les photos de mauvaise qualité avant tout traitement et retourne au client un feedback guidé.

### 📐 Règle de Cadrage & Angles requis :
1. **Photo 1 : Face** -> Angle Yaw : $0^\circ \pm 10^\circ$, Pitch : $0^\circ \pm 10^\circ$. Yeux ouverts, expression neutre.
2. **Photo 2 : Profil Droit** -> Angle Yaw : $+90^\circ \pm 15^\circ$. Oreille droite et ligne de mâchoire totalement visibles.
3. **Photo 3 : Profil Gauche** -> Angle Yaw : $-90^\circ \pm 15^\circ$. Oreille gauche et profil complet visibles.
4. **Photo 4 : Arrière / Nuque** -> Angle Yaw : $180^\circ \pm 20^\circ$. Implantation des cheveux, nuque et haut du cou découverts.

### 🔍 Filtres de Qualité Automatisés (MediaPipe / OpenCV / RetinaFace) :
* **Niveau de Flou (Laplacian Variance)** : Doit être $> 120.0$. *(Si trop flou -> "Photo trop floue, stabilisez votre appareil")*.
* **Éclairage & Contraste (Luminance Histogramme)** : $40 < \text{Mean Brightness} < 210$. Pas de contre-jour violent ni d'ombre portée cachant la moitié du visage.
* **Résolution minimale** : $1080 \times 1080$ pixels (Format 1:1 carré recommandé).
* **Détection d'Occultation (Face Obstruction Check)** :
  * Interdiction des lunettes de soleil claires ou sombres *(détecté par réseau CNN classification)*.
  * Interdiction des masques chirurgicaux, mains devant le visage ou casquettes/chapeaux masquant la boîte crânienne.

---

## ✂️ 3. Module 2 : Segmentation & Dénudage du Cuir Chevelu (SAM-2 / BiSeNet)

Pour pouvoir essayer les coupes 3D du catalogue (Fades, Tresses, Locks, Barbes) sans superposition désagréable avec les cheveux réels du client :

1. **Isolation du fond et du cou** : Masquage parfait du fond de la photo et conservation du buste/cou du client.
2. **Hair Segmentation & Scalp Neutralization** : L'IA identifie la zone occupée par la chevelure actuelle, calcule la forme osseuse sous-jacente du crâne et applique une texture de cuir chevelu lisse et neutre avec la teinte exacte de la peau du client.

---

## 🦴 4. Module 3 : Reconstruction Géométrique 3D (FLAME / DECA / EMOCA)

* **Modèle Paramétrique FLAME (3D Head Model)** :
  * Modèle de tête 3D paramétrique à 5023 sommets (vertices) couvrant le visage, les oreilles, le crâne et le cou.
  * Déformation basée sur 100 paramètres de forme ($\beta$) extraits des 4 photos.
* **Précision Crânienne & Oreilles** :
  * Utilisation des vues profil et arrière pour ajuster la rondeur exacte de la nuque et la position des oreilles, crucial pour l'application des dégradés (Taper / Mid Fade / Low Fade).

---

## 🎨 5. Module 4 : Projection de Textures Réelles & UV Texture Baking

Pour préserver **100 % de l'identité du client** (vraie peau, grain du visage, détails uniques, teint) :

1. **Dépliage UV (UV Unwrapping)** : Carte de texture $2048 \times 2048$ pixels dédiée au modèle FLAME.
2. **Multi-Band Laplacian Pyramids Blending** : Fusion progressive des textures issues des 4 photos (Face + Profils + Arrière) pour éliminer toute couture ou changement de luminosité aux jonctions des oreilles et du cou.
3. **Conservation de la Barbe d'Origine** : La barbe naturelle du client est conservée sur la carte UV si le client ne souhaite pas essayer un nouveau style de barbe 3D.

---

## ⏱️ 6. Benchmark de Performance & Latence IA (Cible < 2s)

| Étape du Pipeline IA | Technologie Employée | Temps d'Exécution Cible |
|----------------------|----------------------|--------------------------|
| 1. Quality Gatekeeper | MediaPipe FaceMesh / RetinaFace (ONNX) | ~80 ms |
| 2. Hair Segmentation | Segment Anything 2 (SAM-2 / TensorRT FP16) | ~450 ms |
| 3. Fitting Géométrique 3D | Model DECA / PyTorch ONNX Runtime | ~380 ms |
| 4. Fusion Texture UV | OpenCL / PyTorch Texture Blender | ~500 ms |
| 5. Export `.GLB` WebGL | Trimesh / PyVista Exporter | ~150 ms |
| **LATENCE TOTALE PIPELINE** | **Inférence GPU NVIDIA RTX / T4** | **~1,56 seconde** ⚡ |

---

## 🔒 7. Conformité & Destruction Biométrique (Réglementation CEDEAO / RGPD)

* Les 4 photos téléversées sont détruites du stockage temporaire dès que le fichier `.glb` 3D anonymisé est généré.
* Le modèle 3D `.glb` résultant ne contient aucun vecteur facial réutilisable pour la reconnaissance faciale ou le biovidéo.
* Purge automatique sous 30 jours via la tâche Cron `/api/cron/purge-biometric`.

---

## 📹 8. Mode Scan Vidéo Temps Réel (Guided FaceID Video Scanner)

Pour une expérience client spectaculaire et une précision inégalée, Afrofade intègre le mode **"Scan Vidéo Guidé Temps Réel"** en direct du navigateur web :

### 🔄 Déroulement Interactif du Scan (Style FaceID Apple) :
1. **Étape 1 : Face ($0^\circ$)** -> "Regardez la caméra" -> Cercle ovale vert -> Capture auto dès que la netteté et la pose sont à 100%.
2. **Étape 2 : Profil Droit ($+90^\circ$)** -> "Tournez doucement la tête vers la droite" -> Détection de l'oreille droite -> Auto-capture !
3. **Étape 3 : Profil Gauche ($-90^\circ$)** -> "Tournez la tête vers la gauche" -> Détection de l'oreille gauche -> Auto-capture !
4. **Étape 4 : Nuque ($180^\circ$)** -> "Présentez la nuque / arrière de la tête" -> Auto-capture finale -> Lancement instantané de la reconstruction 3D !

