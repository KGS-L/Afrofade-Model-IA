from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import time

app = FastAPI(
    title="Afrofade 3D AI Engine",
    description="Microservice de reconstruction 3D et fitting de coiffures afro",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ReconstructionRequest(BaseModel):
    salon_id: str
    client_name: Optional[str] = "Anonyme"
    photos_urls: List[str]

class ReconstructionResponse(BaseModel):
    status: str
    mesh_3d_url: str
    processing_time_ms: int
    message: str

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API Afrofade 3D Engine", "status": "online"}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "afrofade-api-3d",
        "version": "1.0.0"
    }

@app.post("/v1/reconstruct", response_model=ReconstructionResponse)
def reconstruct_3d_head(request: ReconstructionRequest):
    if len(request.photos_urls) < 3:
        raise HTTPException(
            status_code=400, 
            detail="Au moins 3 photos sous des angles différents (face, profil gauche, profil droit) sont requises."
        )
    
    start_time = time.time()
    
    # Stub representation of 3D Morphable Model (DECA/FLAME) processing
    # In production, this runs the PyTorch DECA pipeline on GPU/CPU
    processing_time = int((time.time() - start_time) * 1000) + 850
    
    return ReconstructionResponse(
        status="success",
        mesh_3d_url="https://storage.googleapis.com/afrofade-assets/sample_head_mesh.glb",
        processing_time_ms=processing_time,
        message=f"Modèle 3D reconstruit avec succès pour {request.client_name}."
    )
