#!/usr/bin/env python3
"""Dataset Batch Generator — Afro3D Engine (STORY-1).

Generates synthetic 3D hair datasets for 6 Afrofade taxonomies.
Exports binary GLB assets into data/synthetic_afro_dataset/ with metadata catalog.
"""

import os
import sys
import json
from pathlib import Path

# Ensure api directory is in python path
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from scripts.dataset_generator.blender_procedural_hairstyles import create_synthetic_afro_hair_mesh

TAXONOMIES = [
    "knotless-braids",
    "low-taper-fade",
    "short-locks",
    "cornrows",
    "afro-twists",
    "beard-sculpted",
]

def generate_dataset(output_dir: str = None, samples_per_taxonomy: int = 5) -> dict:
    output_path = Path(output_dir or ROOT / "data" / "synthetic_afro_dataset")
    output_path.mkdir(parents=True, exist_ok=True)

    catalog = []
    total_generated = 0

    print(f"==> Initiating Afro3D Synthetic Dataset Generation: {samples_per_taxonomy} samples per taxonomy...")

    for taxonomy in TAXONOMIES:
        tax_dir = output_path / taxonomy
        tax_dir.mkdir(parents=True, exist_ok=True)

        for i in range(1, samples_per_taxonomy + 1):
            filename = f"{taxonomy}_sample_{i:03d}.glb"
            file_path = tax_dir / filename

            meta = create_synthetic_afro_hair_mesh(taxonomy, str(file_path))
            meta["file_name"] = filename
            meta["file_path"] = str(file_path.relative_to(ROOT))
            meta["sample_index"] = i
            meta["size_bytes"] = file_path.stat().st_size

            catalog.append(meta)
            total_generated += 1

    catalog_path = output_path / "dataset_catalog.json"
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump({
            "version": "1.0.0",
            "total_samples": total_generated,
            "taxonomies": TAXONOMIES,
            "samples": catalog,
        }, f, indent=2)

    print(f"[PASS] Synthetic Afro 3D Dataset generated successfully: {total_generated} samples in {output_path}")
    return {"total": total_generated, "catalog_path": str(catalog_path)}

if __name__ == "__main__":
    generate_dataset()
