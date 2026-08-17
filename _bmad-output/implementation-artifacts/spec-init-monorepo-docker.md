---
title: 'Initialisation de la structure Monorepo (Next.js + FastAPI) avec Docker Compose'
type: 'chore'
created: '2026-08-17'
status: 'done'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le projet Afrofade ne dispose pas encore de l'arborescence de fichiers ni de l'environnement Docker conteneurisé permettant aux deux microservices (Frontend/SaaS Next.js et Backend IA/3D FastAPI) de fonctionner et communiquer ensemble.

**Approach:** Créer la structure du projet avec deux répertoires principaux `web/` (Next.js 15) et `api/` (FastAPI Python), configurés avec leurs Dockerfiles respectifs et un fichier `docker-compose.yml` à la racine pour assurer la communication réseau inter-services.

## Boundaries & Constraints

**Always:** Utiliser Docker Compose avec un réseau partagé (`afrofade-net`) permettant au service Next.js de contacter FastAPI via `http://api:8000`.

**Ask First:** Modification de la structure racine du projet ou changement des ports par défaut (3000 pour Next.js, 8000 pour FastAPI).

**Never:** Ajouter de secrets ou clés API réelles dans les Dockerfiles ou le docker-compose (utiliser `.env.example`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Communication Inter-service | `web` envoie une requête HTTP GET vers `http://api:8000/health` | FastAPI répond `{"status": "ok", "service": "afrofade-api-3d"}` avec code 200 | Log d'erreur de connexion réseau dans le conteneur Next.js |
| Docker Compose Up | Executer `docker compose up --build` | Les deux services démarent sans conflit de port | Arrêt du conteneur en faute avec logs clairs |

</frozen-after-approval>

## Code Map

- `docker-compose.yml` -- Configuration des services Docker `web` et `api`
- `web/Dockerfile` -- Dockerfile multi-stage pour Next.js 15
- `web/package.json` -- Dépendances Next.js, React 19, Three.js, React Three Fiber
- `web/src/app/page.tsx` -- Page d'accueil initiale Afrofade
- `api/Dockerfile` -- Dockerfile Python 3.11 pour FastAPI
- `api/requirements.txt` -- Dépendances Python (FastAPI, Uvicorn, PyTorch, Pillow, Pydantic)
- `api/main.py` -- Point d'entrée FastAPI avec routes `/health` et `/v1/reconstruct` (stub)
- `.env.example` -- Variables d'environnement de référence

## Tasks & Acceptance

**Execution:**
- [x] `docker-compose.yml` -- Créer la configuration Docker Compose orchestrant les conteneurs web et api avec le réseau `afrofade-net`.
- [x] `web/Dockerfile` -- Configurer le build Docker pour l'application Next.js 15 (Node 20 Alpine).
- [x] `web/package.json` -- Initialiser la configuration et les dépendances du frontend Next.js 15.
- [x] `web/src/app/page.tsx` -- Créer la landing/dashboard minimale Afrofade avec test de connexion vers l'API.
- [x] `api/Dockerfile` -- Configurer le Dockerfile Python 3.11 pour FastAPI.
- [x] `api/requirements.txt` -- Ajouter les dépendances FastAPI, Uvicorn et basiques ML/3D.
- [x] `api/main.py` -- Implémenter le serveur FastAPI avec le point d'accès de santé (`/health`) et le stub de reconstruction (`/v1/reconstruct`).
- [x] `.env.example` -- Ajouter les modèles de variables d'environnement.

**Acceptance Criteria:**
- Given la racine du projet, when `docker compose up` est exécuté, then les services `web` (sur port 3000) et `api` (sur port 8000) démarrent avec succès.
- Given le conteneur `web`, when il effectue un appel réseau vers `http://api:8000/health`, then la réponse JSON `{"status": "ok", "service": "afrofade-api-3d"}` est reçue sans erreur CORS ni blocage réseau.

## Design Notes

- Utiliser `api:8000` comme hostname interne dans le réseau Docker `afrofade-net`.
- Exposer `NEXT_PUBLIC_API_URL=http://localhost:8000` pour les appels côté navigateur et `INTERNAL_API_URL=http://api:8000` pour les Server Actions Next.js.

## Verification

**Commands:**
- `docker compose config` -- expected: Configuration valide sans erreurs de syntaxe.
