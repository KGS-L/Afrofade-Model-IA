"""
Afrofade — HeadGenerationProvider Architecture
Spécification & Scaffolding de l'abstraction des moteurs de reconstruction 3D de têtes.

Statut :
- FlamePyTorchProvider : VALIDATED (Phase 6A PyTorch Autograd fonctionnelle)
- HunyuanHeadProvider : SCAFFOLDED
- FutureProvider : SCAFFOLDED
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List
import logging

logger = logging.getLogger("afrofade.fitting.head_provider")


class BaseHeadProvider(ABC):
    """Interface d'abstraction pour tout moteur de reconstruction 3D de tête client."""

    @abstractmethod
    def reconstruct_head(self, photo_inputs: List[Any], job_id: str) -> Dict[str, Any]:
        """Exécute la reconstruction 3D et retourne le maillage 3D + rapport de fitting."""
        pass

    @abstractmethod
    def get_provider_status(self) -> str:
        """Retourne le statut de préparation du provider ('VALIDATED', 'SCAFFOLDED', etc.)."""
        pass


class FlamePyTorchProvider(BaseHeadProvider):
    """
    Provider basé sur le modèle morphométrique FLAME 2023 PyTorch Autograd.
    Utilise l'optimisation gradient-based sur 100 dimensions de shape beta avec 5 023 vertices.
    """

    def reconstruct_head(self, photo_inputs: List[Any], job_id: str) -> Dict[str, Any]:
        from api.services.reconstructor import Afrofade3DReconstructor
        reconstructor = Afrofade3DReconstructor()
        return reconstructor.reconstruct_head_3d(photo_inputs, job_id=job_id)

    def get_provider_status(self) -> str:
        return "VALIDATED"


class HunyuanHeadProvider(BaseHeadProvider):
    """
    Provider alternatif de reconstruction basée sur Hunyuan3D-1.0 Head Mesh.
    """

    def reconstruct_head(self, photo_inputs: List[Any], job_id: str) -> Dict[str, Any]:
        logger.info(f"[SCAFFOLDED] HunyuanHeadProvider.reconstruct_head pour {job_id}")
        return {
            "job_id": job_id,
            "provider": "HunyuanHeadProvider",
            "status": "SCAFFOLDED",
            "message": "Scaffolded provider. Utilisez FlamePyTorchProvider pour l'inférence réelle."
        }

    def get_provider_status(self) -> str:
        return "SCAFFOLDED"


class HeadGenerationManager:
    """
    Gestionnaire centralisé de sélection dynamique du provider de reconstruction 3D de tête.
    Evite toute dépendance dure à une API spécifique.
    """

    def __init__(self, default_provider: str = "flame_pytorch"):
        self.providers: Dict[str, BaseHeadProvider] = {
            "flame_pytorch": FlamePyTorchProvider(),
            "hunyuan": HunyuanHeadProvider(),
        }
        self.default_provider = default_provider

    def get_provider(self, provider_name: str = None) -> BaseHeadProvider:
        name = provider_name or self.default_provider
        provider = self.providers.get(name)
        if not provider:
            raise ValueError(f"Provider de tête inconnu : {name}")
        return provider
