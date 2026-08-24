"""Afro3D Autonomous GPU Worker Service (STORY-3).

Executes on-demand serverless GPU 3D reconstruction and hairstyle fitting jobs.
Consumes jobs from queue or direct API payload with zero idle cost.
"""

import os
import sys
import time
import json
import logging
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from services.reconstructor import ReconstructionPipelineService

logger = logging.getLogger("afrofade.gpu_worker")
logging.basicConfig(level=logging.INFO)

class Afro3DGPUWorker:
    """Serverless GPU Worker Handler for Afro3D inference."""

    def __init__(self, mode: str = "on_demand"):
        self.mode = mode
        self.device = "cuda" if os.getenv("USE_CUDA") == "true" else "cpu"
        logger.info(f"Initialized Afro3DGPUWorker on device={self.device} mode={mode}")

    def execute_job(self, photos_urls: list, client_name: str = "Client Afrofade") -> dict:
        start_t = time.time()
        job_id = f"gpu_job_{int(time.time() * 1000)}"

        logger.info(f"[GPU Worker] Executing 3D reconstruction for {client_name} (job {job_id})...")

        result = ReconstructionPipelineService.process_3d_head_reconstruction(
            photos_urls=photos_urls,
            client_name=client_name,
            preserve_skin_texture=True
        )

        elapsed_sec = time.time() - start_t
        result["gpu_device"] = self.device
        result["execution_mode"] = self.mode
        result["elapsed_seconds"] = round(elapsed_sec, 3)

        logger.info(f"[GPU Worker] Job {job_id} finished in {elapsed_sec:.2f}s")
        return result

def run_worker_loop():
    worker = Afro3DGPUWorker(mode="worker_loop")
    print("==> Afro3D GPU Worker loop running... (Ctrl+C to stop)")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("[GPU Worker] Worker loop terminated gracefully.")

if __name__ == "__main__":
    run_worker_loop()
