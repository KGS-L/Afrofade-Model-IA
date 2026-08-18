---
title: 'Phase 5: Infrastructure Asynchrone SaaS (API Job Gateway & Task Queue)'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/ARCHITECTURE-AFROFADE-3D.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les calculs d'inférence 3D lourds bloquent la requête HTTP synchrone, ce qui cause des timeouts serveur sous forte charge et nuit à l'expérience utilisateur.

**Approach:** Implémenter le gestionnaire de file d'attente asynchrone `api/services/jobs/queue_manager.py` et exposer les endpoints d'API Gateway `POST /api/v1/heads` (HTTP 202 Accepted) et `GET /api/v1/heads/{job_id}` pour permettre le polling d'avancement du job par le client.

## Boundaries & Constraints

**Always:** Retourner un statut HTTP 202 Accepted pour les demandes d'inférence asynchrones. Supporter le polling par `job_id`.

**Ask First:** Modifications des schémas de statut de job.

**Never:** Faire planter le serveur lors de requêtes simultanées.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Soumission de Job | `POST /api/v1/heads` avec photos | `{"job_id": "...", "status": "processing"}` (202) | Validation des URLs d'images |
| Polling d'Avancement | `GET /api/v1/heads/{job_id}` | `{"status": "completed", "progress": 100, ...}` | Statut HTTP 404 si `job_id` inconnu |

</frozen-after-approval>

## Code Map

- `api/services/jobs/queue_manager.py` -- Orchestrateur de tâches asynchrones et gestionnaire de jobs en mémoire/Redis
- `api/main.py` -- Intégration des endpoints `POST /api/v1/heads` et `GET /api/v1/heads/{job_id}`

## Tasks & Acceptance

**Execution:**
- [x] `api/services/jobs/queue_manager.py` -- Implémenter la classe `AsyncJobQueueManager` pour gérer la file d'attente de jobs de reconstruction.
- [x] `api/main.py` -- Déclarer les routes `/api/v1/heads` et `/api/v1/heads/{job_id}`.

**Acceptance Criteria:**
- Given des photos client, when `POST /api/v1/heads` est appelé, then un `job_id` est retourné avec HTTP 202, et `GET /api/v1/heads/{job_id}` renvoie le modèle 3D terminé.

## Verification

**Commands:**
- `python3 scripts/test_e2e_integration.py` -- expected: HTTP 200/202 OK sur la file de jobs asynchrones
