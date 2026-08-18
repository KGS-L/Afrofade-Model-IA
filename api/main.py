from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from routers.quality_check import router as quality_router
from services.reconstructor import ReconstructionPipelineService

app = FastAPI(
    title="Afrofade 3D AI Engine",
    description="Microservice de reconstruction 3D tête-au-cou et fitting de coiffures afro",
    version="1.0.0"
)

# Enable CORS for Next.js web application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    
    result = ReconstructionPipelineService.process_3d_head_reconstruction(
        photos_urls=request.photos_urls,
        client_name=request.client_name or "Client Afrofade",
        preserve_skin_texture=request.preserve_skin_texture if request.preserve_skin_texture is not None else True
    )
    
    return result
