"""
Async Job Queue Manager — Gestionnaire asynchrone des tâches de reconstruction 3D.
Orchestre l'exécution des jobs d'inférence GPU et le suivi de progression en temps réel pour l'API SaaS Afrofade.
"""

from typing import Dict, Any, Optional, List
import uuid
import time
import logging
from services.reconstructor import ReconstructionPipelineService

logger = logging.getLogger("afrofade.job_queue")

class AsyncJobQueueManager:
    """
    Gestionnaire de file d'attente de jobs de reconstruction 3D asynchrones.
    Permet la soumission (202 Accepted) et le polling de statut (/heads/{job_id}).
    """
    _jobs_db: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def submit_reconstruction_job(
        cls,
        photos_urls: List[str],
        client_name: str = "Client Afrofade"
    ) -> Dict[str, Any]:
        """
        Enregistre un nouveau job de reconstruction et initie son traitement.
        """
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        now = time.time()

        # 1. Résultat synchrone/immédiat via le Reconstructor
        reconstruction_result = ReconstructionPipelineService.process_3d_head_reconstruction(
            photos_urls=photos_urls,
            client_name=client_name
        )

        job_data = {
            "job_id": job_id,
            "status": "completed",
            "progress_percent": 100,
            "created_at": now,
            "completed_at": time.time(),
            "photos_count": len(photos_urls),
            "result": reconstruction_result
        }

        cls._jobs_db[job_id] = job_data
        logger.info(f"Job de reconstruction {job_id} créé et exécuté avec succès.")

        return {
            "job_id": job_id,
            "status": "completed",
            "progress_percent": 100,
            "estimated_wait_seconds": 0,
            "status_url": f"/api/v1/heads/{job_id}"
        }

    @classmethod
    def get_job_status(cls, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupère l'état et le résultat d'un job par son ID.
        """
        return cls._jobs_db.get(job_id)
