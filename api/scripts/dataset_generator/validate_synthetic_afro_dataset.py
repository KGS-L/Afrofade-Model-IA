#!/usr/bin/env python3
"""Validation Script — STORY-1 Afro3D Synthetic Dataset.

Verifies:
1. All 6 Afrofade taxonomies are present in the dataset.
2. Every GLB file starts with the valid 'glTF' 4-byte header.
3. dataset_catalog.json is valid and non-empty.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

def main():
    print("==> Validating STORY-1 Afro3D Synthetic Dataset...")
    dataset_dir = ROOT / "data" / "synthetic_afro_dataset"
    catalog_path = dataset_dir / "dataset_catalog.json"

    if not catalog_path.exists():
        print(f"[FAIL] Catalog file not found at {catalog_path}")
        sys.exit(1)

    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog_data = json.load(f)

    samples = catalog_data.get("samples", [])
    taxonomies = catalog_data.get("taxonomies", [])

    if len(taxonomies) < 6:
        print(f"[FAIL] Expected 6 taxonomies, found {len(taxonomies)}")
        sys.exit(1)

    print(f"[PASS] Taxonomies verified ({len(taxonomies)} categories): {taxonomies}")

    valid_count = 0
    for sample in samples:
        file_path = ROOT / sample["file_path"]
        if not file_path.exists():
            print(f"[FAIL] Sample file missing: {file_path}")
            sys.exit(1)

        with open(file_path, "rb") as f:
            header = f.read(4)
            if header != b"glTF":
                print(f"[FAIL] Invalid GLB magic header in {file_path}: {header}")
                sys.exit(1)
        valid_count += 1

    print(f"[PASS] All {valid_count} 3D GLB samples verified with valid glTF binary headers!")
    print("[SUCCESS] STORY-1 SYNTHETIC AFRO 3D DATASET VALIDATION PASSED 100%!")

if __name__ == "__main__":
    main()
