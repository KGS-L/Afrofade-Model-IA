# ✂️ Afrofade 3D Studio — Plateforme IA de Reconstruction 3D & Essayage Virtuel de Coiffures Afro

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/sokevinjonas/Afrofade)
[![Production URL](https://img.shields.io/badge/website-afrofade.pro-8A2BE2.svg)](https://afrofade.pro)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Afrofade** est la première plateforme SaaS d'Intelligence Artificielle et de reconstruction 3D réaliste "Tête-au-Cou" dédiée aux salons de coiffure africains, barbershops et clients finaux. Elle permet d'essayer virtuellement en 3D temps réel des coupes afro (Taper Fade, Cornrows, Locks, Barbe sculptée) tout en préservant 100 % de l'identité du visage et de la carnation du client.

🌐 **Site Web en Production** : [https://afrofade.pro](https://afrofade.pro)

---

## ✨ Fonctionnalités Clés

* 📹 **Mode Scan Vidéo Guidé Temps Réel (Scanner 3D Style FaceID)** :
  * Capture guidée et automatique sans toucher l'écran (Face $0^\circ$, Profil Droit $+90^\circ$, Profil Gauche $-90^\circ$, Nuque $180^\circ$).
  * Contrôle qualité en temps réel par vision par ordinateur (détection de netteté, d'éclairage et d'angles par OpenCV & MediaPipe).
* 💈 **Visualisateur 3D WebGL 60 FPS & Catalogue Spécialisé** :
  * Moteur React Three Fiber (Three.js) d'affichage 360°.
  * Catalogue complet de coiffures afro : *Low Taper Fade, Cornrows Géométriques, Short Locks High Top, Barbe Sculptée, Afro Sponge Twists, Burst Fade Mohawk*.
* 💳 **Paiement Mobile Money Africain (Passerelle Money Fusion)** :
  * Intégration complète des paiements Mobile Money (Wave, Orange Money, MTN Mobile Money, Moov Money) en Francs CFA (XOF/XAF).
  * Webhook sécurisé et activation automatique des abonnements Salons.
* 📊 **Console Administrateur & CRM Salon** :
  * Suivi du MRR en FCFA, gestion des abonnements (PRO, VIP, EXTRA), jauges de quotas de scans 3D et remises dynamiques (jusqu'à 15 %).
* 🔒 **Conformité & Protection Biométrique (RGPD / CEDEAO)** :
  * Purge automatique des données biométriques temporaires sous 30 jours via la tâche Cron `/api/cron/purge-biometric`.

---

## 🛠️ Architecture & Stack Technique

```
┌─────────────────────────────────────────────────────────────┐
│                    AFROFADE MONOREPO                         │
├──────────────────────────────┬──────────────────────────────┤
│    Frontend Web (Next.js 14) │   Backend IA/ML (FastAPI)    │
│  - React Three Fiber (3D)   │  - PyTorch & FLAME / DECA    │
│  - TailwindCSS & Vanilla     │  - OpenCV & MediaPipe        │
│  - Client Supabase & Auth    │  - UV Texture Blender        │
│  - Tunnel Scan Vidéo Guidé   │  - Service Gatekeeper        │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │                              │
               ▼                              ▼
    [ Nginx Reverse Proxy ] ──► [ Docker Compose Multi-Stage ] ──► [ https://afrofade.pro ]
```

### Stack Frontend (`/web`) :
* **Framework** : Next.js 14 (App Router, Server Components).
* **3D Engine** : React Three Fiber (@react-three/fiber), Three.js, @react-three/drei.
* **Styling** : Vanilla CSS & Design Tokens (Palette Terracotta / Ink / Cream).
* **Database & Auth** : Supabase PostgreSQL Client & Session Cookie.

### Stack Backend IA/ML (`/api`) :
* **Framework** : Python 3.11, FastAPI, Uvicorn.
* **Computer Vision & 3D** : OpenCV (`opencv-python-headless`), MediaPipe (`mediapipe`), Trimesh, Scipy.
* **Deep Learning** : PyTorch (FLAME 3DMM Head Model, DECA Fitting).

---

## 🚀 Démarrage Rapide (Développement Local)

### Prérequis :
* Node.js v22+ & npm v10+
* Python 3.11+
* Docker & Docker Compose (Optionnel)

### 1. Cloner le projet :
```bash
git clone https://github.com/sokevinjonas/Afrofade.git
cd Afrofade
```

### 2. Télécharger les poids de modèles IA :
```bash
python3 api/scripts/download_models.py
```

### 3. Lancer l'application Web (Next.js) :
```bash
cd web
npm install
npm run dev
```
*L'application web est accessible sur `http://localhost:3000`.*

### 4. Lancer le microservice IA (FastAPI) :
```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*La documentation OpenAPI Swagger est accessible sur `http://localhost:8000/docs`.*

---

## 🐳 Déploiement avec Docker Compose

Pour lancer l'ensemble des services en production :

```bash
# Copier et remplir les variables d'environnement
cp .env.example .env

# Construire et démarrer les conteneurs Docker en arrière-plan
docker compose up -d --build
```

---

## 📜 Licence & Propriété Intellectuelle

Ce projet est sous licence **MIT**. 

Copyright © 2026 **Afrofade Studio / KGB IA Solutions**. Tous droits réservés.
