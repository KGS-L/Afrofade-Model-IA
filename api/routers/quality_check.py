from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.gatekeeper import QualityGatekeeperService

router = APIRouter(prefix="/v1", tags=["quality-check"])

class QualityCheckResponse(BaseModel):
    is_valid: bool
    detected_yaw: float
    target: str
    blur_score: float
    lighting_score: float
    obstruction_detected: bool
    message: str
    next_instruction: str

@router.post("/quality-check", response_model=QualityCheckResponse)
async def check_frame_quality(
    target: str = Form("face"),
    file: UploadFile = File(...)
):
    """
    Endpoint d'évaluation en temps réel de la qualité d'une image/frame vidéo.
    Utilisé par le Mode Scan Vidéo Guidé Temps Réel (FaceID-style scanner).
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Fichier image vide.")
            
        evaluation = QualityGatekeeperService.evaluate_image_quality(
            image_bytes=content,
            expected_target=target
        )
        return evaluation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse de qualité : {str(e)}")
