#!/usr/bin/env python3
"""Dataset Downloader & Generator for Photorealistic African 3D Human Heads.

Fetches & synthesizes HD 3D human head GLB meshes with African facial morphology,
cranial structure, and PBR skin textures for fine-tuning Hunyuan3D 2.0 / Trellis 2 models.
"""

import os
import sys
import json
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from services.reconstructor import ReconstructionPipelineService

AFRICAN_HEAD_PRESETS = [
    {
        "id": "african_head_male_01",
        "name": "Tête Humaine Africaine Homme - Proportions HD",
        "gender": "male",
        "skin_tone": "#3c281e",
        "skin_texture_res": "2048x2048",
        "cranial_type": "dolichocephalic",
        "sample_photos": [
            "https://afrofade.pro/models/datasets/african_male_front.jpg",
            "https://afrofade.pro/models/datasets/african_male_side.jpg"
        ]
    },
    {
        "id": "african_head_female_01",
        "name": "Tête Humaine Africaine Femme - Proportions HD",
        "gender": "female",
        "skin_tone": "#4a3224",
        "skin_texture_res": "2048x2048",
        "cranial_type": "mesocephalic",
        "sample_photos": [
            "https://afrofade.pro/models/datasets/african_female_front.jpg",
            "https://afrofade.pro/models/datasets/african_female_side.jpg"
        ]
    },
    {
        "id": "african_head_male_02",
        "name": "Tête Humaine Africaine Homme - Jawline Marquée",
        "gender": "male",
        "skin_tone": "#2d1d15",
        "skin_texture_res": "2048x2048",
        "cranial_type": "dolichocephalic",
        "sample_photos": [
            "https://afrofade.pro/models/datasets/african_male2_front.jpg",
            "https://afrofade.pro/models/datasets/african_male2_side.jpg"
        ]
    }
]

def download_and_register_african_heads(output_dir: Path):
    heads_dir = output_dir / "human_heads"
    heads_dir.mkdir(parents=True, exist_ok=True)

    print("================================================================")
    print("🌍 TÉLÉCHARGEMENT & PRÉPARATION DU DATASET 3D TÊTES HUMAINES AFRICAINES")
    print("   Moteur Cible : Hunyuan3D 2.0 / Trellis 2 (PBR Photorealism)")
    print("================================================================")

    manifest_items = []

    for idx, preset in enumerate(AFRICAN_HEAD_PRESETS, 1):
        print(f"\n[{idx}/{len(AFRICAN_HEAD_PRESETS)}] Génération & Téléchargement : {preset['name']}...")

        head_payload = ReconstructionPipelineService.generate_3d_head_asset(
            photos_urls=preset["sample_photos"],
            job_id=f"job_african_head_{preset['id']}",
            client_name=preset["name"],
            preserve_skin_texture=True
        )

        glb_filename = f"{preset['id']}_photorealistic.glb"
        glb_filepath = heads_dir / glb_filename

        with open(glb_filepath, "wb") as f:
            f.write(head_payload.glb_bytes)

        item_meta = {
            "id": preset["id"],
            "name": preset["name"],
            "gender": preset["gender"],
            "file_path": str(glb_filepath.relative_to(ROOT)),
            "file_name": glb_filename,
            "provider": head_payload.provider,
            "vertices_count": head_payload.vertices_count,
            "polygon_count": head_payload.polygon_count,
            "skin_tone": preset["skin_tone"],
            "skin_texture_res": preset["skin_texture_res"],
            "cranial_type": preset["cranial_type"],
            "size_kb": round(len(head_payload.glb_bytes) / 1024, 2)
        }

        manifest_items.append(item_meta)
        print(f"   ✓ Modèle 3D sauvegardé : {glb_filename} ({item_meta['size_kb']} KB, {item_meta['vertices_count']} sommets)")

    manifest_path = heads_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({
            "dataset_name": "African Photorealistic Human 3D Heads Dataset",
            "total_heads": len(manifest_items),
            "target_engine": "Hunyuan3D-2.0 / Trellis-2",
            "items": manifest_items
        }, f, indent=2)

    print("\n================================================================")
    print(f"✅ MANIFEST D'ENTRAÎNEMENT TÊTES HUMAINES SAUVEGARDÉ : {manifest_path}")
    print(f"   Total de têtes prêtes pour le Studio 1 : {len(manifest_items)}")
    print("================================================================")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Télécharger le Dataset de Têtes Humaines Africaines 3D Photoréalistes")
    parser.add_argument("--output-dir", type=str, default="data/synthetic_afro_dataset", help="Dossier de destination")
    args = parser.parse_args()

    target_dir = ROOT / args.output_dir
    download_and_register_african_heads(target_dir)
