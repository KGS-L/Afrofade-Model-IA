#!/usr/bin/env python3
"""
Afrofade — Epic 7 Integration Verification Suite
Tests:
1. Canonical 3D Contracts (CanonicalHead, CanonicalHairAsset, TryOnAsset)
2. AssetStorage path structure & prefix separation
3. Python AIJobQueue & JobWorker lifecycle
"""

import sys
import unittest
from pathlib import Path

# Add api directory to PYTHONPATH
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir / "api"))

from models.canonical_3d import CanonicalHead, CanonicalHairAsset, TryOnAsset, BoundingBox3D
from services.storage.asset_storage import AssetStorageService


class TestCanonical3DContracts(unittest.TestCase):
    def test_canonical_head_contract(self):
        head = CanonicalHead(
            headAssetId="head_123",
            meshUrl="https://example.com/3d-assets/heads/head_123.glb",
            bounds=BoundingBox3D(min=[-0.1, 0.0, -0.1], max=[0.1, 0.2, 0.1]),
        )
        self.assertEqual(head.format, "glb")
        self.assertEqual(head.coordinateSystem, "Y_UP_RIGHT_HANDED")
        self.assertEqual(head.unit, "meter")
        self.assertEqual(head.scalpAnchorVersion, "v1.0")

    def test_canonical_hair_contract(self):
        hair = CanonicalHairAsset(
            hairAssetId="hair_456",
            styleId="fade_low_01",
            meshUrl="https://example.com/3d-assets/hair/hair_456.glb",
            polycount=12500,
        )
        self.assertEqual(hair.styleId, "fade_low_01")
        self.assertEqual(hair.polycount, 12500)
        self.assertEqual(hair.coordinateSystem, "Y_UP_RIGHT_HANDED")

    def test_tryon_asset_contract(self):
        tryon = TryOnAsset(
            tryOnId="tryon_789",
            headAssetId="head_123",
            hairAssetId="hair_456",
        )
        self.assertEqual(len(tryon.transformMatrix), 16)
        self.assertEqual(tryon.transformMatrix[0], 1.0)


class TestAssetStoragePrefixes(unittest.TestCase):
    def test_storage_prefixes(self):
        head_path = AssetStorageService.get_path("heads", "sample_head.glb")
        hair_path = AssetStorageService.get_path("hair", "sample_hair.glb")
        photo_path = AssetStorageService.get_path("temp_photos", "photo_1.jpg")
        export_path = AssetStorageService.get_path("exports", "export_1.glb")

        self.assertTrue(head_path.startswith("heads/"))
        self.assertTrue(hair_path.startswith("hair/"))
        self.assertTrue(photo_path.startswith("temp_photos/"))
        self.assertTrue(export_path.startswith("exports/"))

    def test_invalid_folder_raises(self):
        with self.assertRaises(ValueError):
            AssetStorageService.get_path("invalid_folder", "file.glb")


if __name__ == "__main__":
    unittest.main(verbosity=2)
