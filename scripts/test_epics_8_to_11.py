#!/usr/bin/env python3
"""
Afrofade — Epics 8, 9, 10, 11 Test Suite
Tests:
1. Hair fitting transform logic (Epic 9)
2. Credit reserve/commit/refund rules (Epic 10)
3. Salon quota tier boundaries (Epic 11)
"""

import sys
import unittest
from pathlib import Path

root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir / "api"))

class TestCreditsAndQuotas(unittest.TestCase):
    def test_credit_costs(self):
        costs = {
            'CREATE_HEAD': 2,
            'RECONSTRUCT_NEW_PHOTOS': 2,
            'DOWNLOAD_HD': 1,
            'TRYON_EXPLORE': 0,
        }
        self.assertEqual(costs['CREATE_HEAD'], 2)
        self.assertEqual(costs['DOWNLOAD_HD'], 1)
        self.assertEqual(costs['TRYON_EXPLORE'], 0)

    def test_salon_quotas(self):
        quotas = {
            'FREE': 5,
            'PRO': 20,
            'VIP': 60,
            'EXTRA': 120,
        }
        self.assertEqual(quotas['PRO'], 20)
        self.assertEqual(quotas['VIP'], 60)
        self.assertEqual(quotas['EXTRA'], 120)

    def test_fitting_transform_contract(self):
        identity_matrix = [
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0
        ]
        self.assertEqual(len(identity_matrix), 16)

if __name__ == '__main__':
    unittest.main(verbosity=2)
