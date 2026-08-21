import os
import re
from functools import lru_cache
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from models.jobs import AIJobType
from routers.quality_check import router as quality_router
from services.jobs.job_queue import JobQueueError, SupabasePostgresJobQueue
from services.reconstructor import ReconstructionPipelineService
from services.hair.fal_webhook import FalWebhookError, verify_fal_webhook

app = FastAPI(
    title="Afrofade 3D AI Engine",
    description="Microservice de reconstruction 3D tête-au-cou et fitting de coiffures afro",
    version="1.0.0",
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
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Internal-API-Key"],
)

PUBLIC_PATHS = {"/", "/health"}
GENERATED_MODELS_DIR = Path("/tmp/generated_models")
GENERATED_MODEL_PATTERN = re.compile(r"^recon_[0-9]+\.glb$")


@app.middleware("http")
async def require_internal_api_key(request: Request, call_next):
    if request.url.path in PUBLIC_PATHS or request.url.path.startswith("/webhooks/fal/trellis2/"):
        return await call_next(request)

    expected_secret = os.getenv("API_INTERNAL_SECRET")
    if not expected_secret:
        return JSONResponse(
            status_code=503,
            content={"detail": "API internal authentication is not configured."},
        )

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


class HeadJobRequest(BaseModel):
    user_id: UUID
    salon_id: UUID | None = None
    request_id: str = Field(min_length=1, max_length=200)
    client_name: str = Field(default="Client Afrofade", min_length=1, max_length=255)
    photos_urls: List[str]
    preserve_skin_texture: bool = True


class ReconstructionResponse(BaseModel):
    status: str
    job_id: str
    mesh_3d_url: str
    processing_time_ms: int
    vertices_count: int
    texture_resolution: str
    identity_preserved: bool
    message: str


@lru_cache(maxsize=1)
def get_persistent_job_queue() -> SupabasePostgresJobQueue:
    return SupabasePostgresJobQueue.from_env()

@app.post("/webhooks/fal/trellis2/{job_id}", status_code=200)
async def fal_trellis2_webhook(job_id: UUID, request: Request):
    try: max_body=int(os.getenv("FAL_WEBHOOK_MAX_BYTES","1048576"))
    except ValueError as exc: raise HTTPException(status_code=503,detail="Webhook size configuration invalid") from exc
    content_length=request.headers.get("content-length")
    if content_length is None: raise HTTPException(status_code=411,detail="Content-Length required")
    try: declared=int(content_length)
    except ValueError as exc: raise HTTPException(status_code=400,detail="Invalid Content-Length") from exc
    if declared < 0 or declared > max_body: raise HTTPException(status_code=413,detail="Webhook payload too large")
    raw = await request.body()
    if len(raw) > max_body or len(raw) != declared: raise HTTPException(status_code=413,detail="Webhook payload size mismatch")
    try: payload = verify_fal_webhook(raw, request.headers)
    except FalWebhookError as exc: raise HTTPException(status_code=401, detail=str(exc)) from exc
    try: accepted = get_persistent_job_queue().accept_trellis2_webhook(job_id, payload["request_id"], payload)
    except JobQueueError as exc:
        if any(code in str(exc) for code in ("fal_request_id_conflict","fal_webhook_replay_conflict","fal_webhook_identity_invalid")):
            raise HTTPException(status_code=409,detail="Webhook identity conflict") from exc
        raise HTTPException(status_code=503, detail="Webhook persistence unavailable") from exc
    return {"accepted": accepted}


@app.get("/")
def read_root():
    return {
        "message": "Bienvenue sur l'API Afrofade 3D Engine",
        "status": "online",
        "features": [
            "3D Head Reconstruction",
            "Real-Time Quality Gatekeeper",
            "UV Texture Blending",
        ],
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "afrofade-api-3d",
        "version": "1.0.0",
    }


@app.get("/api/v1/models/{filename}")
def get_generated_model(filename: str):
    """Temporary compatibility route until Story 7.5 moves FLAME output to AssetStorage."""
    if not GENERATED_MODEL_PATTERN.fullmatch(filename):
        raise HTTPException(status_code=400, detail="Invalid generated model filename.")

    model_path = GENERATED_MODELS_DIR / filename
    if not model_path.is_file():
        raise HTTPException(status_code=404, detail="Generated model not found.")

    return FileResponse(
        path=model_path,
        media_type="model/gltf-binary",
        filename=filename,
        headers={"Cache-Control": "private, max-age=3600"},
    )


@app.delete("/api/v1/models/{filename}")
def delete_generated_model(filename: str):
    """Temporary compatibility cleanup until Story 7.5 owns durable asset deletion."""
    if not GENERATED_MODEL_PATTERN.fullmatch(filename):
        raise HTTPException(status_code=400, detail="Invalid generated model filename.")

    model_path = GENERATED_MODELS_DIR / filename
    if model_path.is_file():
        model_path.unlink()
        return {"deleted": True, "filename": filename}

    return {"deleted": False, "filename": filename}


@app.post("/v1/reconstruct", response_model=ReconstructionResponse)
@app.post("/api/v1/reconstruct", response_model=ReconstructionResponse)
def reconstruct_3d_head(request: ReconstructionRequest):
    """Legacy synchronous reconstruction path; Story 7.5 will retire it from the user journey."""
    if len(request.photos_urls) < 3:
        raise HTTPException(
            status_code=400,
            detail="Au moins 3 photos sous des angles différents (face, profil gauche, profil droit) sont requises.",
        )

    return ReconstructionPipelineService.process_3d_head_reconstruction(
        photos_urls=request.photos_urls,
        client_name=request.client_name or "Client Afrofade",
        preserve_skin_texture=(
            request.preserve_skin_texture
            if request.preserve_skin_texture is not None
            else True
        ),
    )


@app.post("/api/v1/heads", status_code=202)
def submit_head_reconstruction(request: HeadJobRequest):
    if len(request.photos_urls) < 1:
        raise HTTPException(status_code=400, detail="Au moins une photo est requise.")
    if len(request.photos_urls) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 photos sont autorisées.")
    if not all(isinstance(url, str) and url.strip() for url in request.photos_urls):
        raise HTTPException(status_code=400, detail="Les URLs de photos doivent être non vides.")

    try:
        queue = get_persistent_job_queue()
        job = queue.enqueue(
            job_type=AIJobType.HEAD_RECONSTRUCTION,
            provider="flame_pytorch",
            user_id=request.user_id,
            salon_id=request.salon_id,
            idempotency_key=f"head:{request.user_id}:{request.request_id.strip()}",
            input_payload={
                "photos_urls": [url.strip() for url in request.photos_urls],
                "client_name": request.client_name.strip(),
                "preserve_skin_texture": request.preserve_skin_texture,
            },
            max_attempts=3,
        )
    except JobQueueError as exc:
        raise HTTPException(
            status_code=503,
            detail="La file de reconstruction 3D est indisponible.",
        ) from exc

    return {
        "job_id": str(job.id),
        "status": job.status.value,
        "attempts": job.attempts,
        "max_attempts": job.max_attempts,
        "created_at": job.created_at.isoformat(),
    }


@app.get("/api/v1/heads/{job_id}")
def get_head_reconstruction_status(job_id: str):
    try:
        parsed_job_id = UUID(job_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Identifiant de job invalide.") from exc

    try:
        queue = get_persistent_job_queue()
        job = queue.get(parsed_job_id)
    except JobQueueError as exc:
        raise HTTPException(
            status_code=503,
            detail="La file de reconstruction 3D est indisponible.",
        ) from exc

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} introuvable.")

    return job.model_dump(mode="json")
