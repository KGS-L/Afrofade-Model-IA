import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from routers.quality_check import router as quality_router
from services.reconstructor import ReconstructionPipelineService
from services.jobs.queue_manager import AsyncJobQueueManager

app = FastAPI(
    title="Afrofade 3D AI Engine",
    description="Microservice de reconstruction 3D tête-au-cou et fitting de coiffures afro",
    version="1.0.0"
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("API_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization", "X-Internal-API-Key"],
)

PUBLIC_PATHS = {"/", "/health"}

@app.middleware("http")
async def require_internal_api_key(request: Request, call_next):
    if request.url.path in PUBLIC_PATHS:
        return await call_next(request)

    expected_secret = os.getenv("API_INTERNAL_SECRET")
    if not expected_secret:
        return JSONResponse(status_code=503, content={"detail": "API internal authentication is not configured."})

    supplied_secret = request.headers.get("X-Internal-API-Key")
    if supplied_secret != expected_secret:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized."})

    return await call_next(request)

app.include_router(quality_router)

class ReconstructionRequest(BaseModel):
    salon_id: str
    client_name: Optional[str] = "Client Afrofade"
    photos_urls: List[str]
    preserve_skin_texture: Optional[bool] = True

class ReconstructionResponse(BaseModel):
    status: str
    mesh_3d_url: str
    processing_time_ms: int
    vertices_count: int
    texture_resolution: str
    identity_preserved: bool
    message: str

@app.get("/")
def read_root():
    return {
        "message": "Bienvenue sur l'API Afrofade 3D Engine",
        "status": "online",
        "features": ["3D Head Reconstruction", "Real-Time Quality Gatekeeper", "UV Texture Blending"]
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "afrofade-api-3d",
        "version": "1.0.0"
    }

@app.post("/v1/reconstruct", response_model=ReconstructionResponse)
@app.post("/api/v1/reconstruct", response_model=ReconstructionResponse)
def reconstruct_3d_head(request: ReconstructionRequest):
    if len(request.photos_urls) < 3:
        raise HTTPException(
            status_code=400,
            detail="Au moins 3 photos sous des angles différents (face, profil gauche, profil droit) sont requises."
        )

    return ReconstructionPipelineService.process_3d_head_reconstruction(
        photos_urls=request.photos_urls,
        client_name=request.client_name or "Client Afrofade",
        preserve_skin_texture=request.preserve_skin_texture if request.preserve_skin_texture is not None else True
    )

@app.post("/api/v1/heads", status_code=202)
def submit_head_reconstruction(request: ReconstructionRequest):
    if len(request.photos_urls) < 1:
        raise HTTPException(status_code=400, detail="Au moins une photo est requise.")

    return AsyncJobQueueManager.submit_reconstruction_job(
        photos_urls=request.photos_urls,
        client_name=request.client_name or "Client Afrofade"
    )

@app.get("/api/v1/heads/{job_id}")
def get_head_reconstruction_status(job_id: str):
    job = AsyncJobQueueManager.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} introuvable.")
    return job
