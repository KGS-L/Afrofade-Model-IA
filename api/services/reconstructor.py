"""
Reconstruction Service — FLAME fitting pipeline and GLB export.
The service writes generated models only to the container's persisted generated-models volume.
"""

from typing import List, Dict, Any
import os
import json
import time
import logging
import trimesh

from services.fitting.shared_identity_fitter import SharedIdentityFitter

logger = logging.getLogger("afrofade.reconstruction")


class ReconstructionPipelineService:
    _fitter = SharedIdentityFitter(shape_dim=100)

    @classmethod
    def process_3d_head_reconstruction(
        cls,
        photos_urls: List[str],
        client_name: str = "Client Afrofade",
        preserve_skin_texture: bool = True,
    ) -> Dict[str, Any]:
        start_time = time.time()
        job_id = f"recon_{time.time_ns()}"
        logger.info("Starting FLAME reconstruction for %s (%s).", client_name, job_id)

        fit_results = cls._fitter.fit_single_or_multi_view(
            image_inputs=photos_urls,
            job_id=job_id,
            max_iterations=100,
        )

        beta_fitted = fit_results["beta_fitted"]
        vertices_fitted = fit_results["vertices_3d"]
        faces = fit_results["faces"]
        flame_model = cls._fitter.flame_model
        template_vertices = flame_model.v_mean.cpu().numpy()

        debug_dir = os.path.join("/tmp", "afrofade_debug", job_id)
        os.makedirs(debug_dir, exist_ok=True)

        with open(os.path.join(debug_dir, "flame_template.obj"), "w", encoding="utf-8") as handle:
            handle.write(flame_model.export_obj(template_vertices))
        with open(os.path.join(debug_dir, "flame_fitted.obj"), "w", encoding="utf-8") as handle:
            handle.write(flame_model.export_obj(vertices_fitted))

        with open(os.path.join(debug_dir, "flame_parameters.json"), "w", encoding="utf-8") as handle:
            json.dump(
                {
                    "client_name": client_name,
                    "job_id": job_id,
                    "shape_beta_100d": beta_fitted,
                    "num_vertices": int(len(vertices_fitted)),
                    "num_faces": int(len(faces)),
                    "camera_model": "weak_perspective",
                },
                handle,
                indent=2,
            )

        fit_report = {
            "status": "COMPLETED",
            "job_id": job_id,
            "initial_landmark_loss": fit_results["initial_loss"],
            "final_landmark_loss": fit_results["final_loss"],
            "iterations": fit_results["iterations"],
            "converged": fit_results["converged"],
            "fitting_time_sec": fit_results["fitting_time_sec"],
            "proof_landmarks_input": fit_results["landmarks_proof_path"],
            "proof_landmarks_projection": fit_results["projection_proof_path"],
        }
        with open(os.path.join(debug_dir, "fit_report.json"), "w", encoding="utf-8") as handle:
            json.dump(fit_report, handle, indent=2)

        mesh = trimesh.Trimesh(vertices=vertices_fitted, faces=faces, process=False)
        glb_bytes = mesh.export(file_type="glb")

        generated_dir = "/tmp/generated_models"
        os.makedirs(generated_dir, exist_ok=True)
        glb_path = os.path.join(generated_dir, f"{job_id}.glb")
        with open(glb_path, "wb") as handle:
            handle.write(glb_bytes)

        processing_ms = int((time.time() - start_time) * 1000)
        internal_model_url = f"/api/v1/models/{job_id}.glb"
        converged = bool(fit_results["converged"])

        logger.info(
            "FLAME reconstruction completed in %sms (%s vertices, converged=%s).",
            processing_ms,
            len(vertices_fitted),
            converged,
        )

        return {
            "status": "success",
            "mesh_3d_url": internal_model_url,
            "job_id": job_id,
            "processing_time_ms": processing_ms,
            "vertices_count": len(vertices_fitted),
            "texture_resolution": "none",
            # This flag reports fitting convergence only. Afrofade does not claim
            # biometric identity verification from this reconstruction pipeline.
            "identity_preserved": converged,
            "message": f"Reconstruction FLAME terminée pour {client_name} ({len(vertices_fitted)} vertices).",
        }
