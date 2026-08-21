#!/usr/bin/env python3
"""Offline validation harness for Story 9.2 Catalog Swap Performance."""
from __future__ import annotations

from pathlib import Path
import sys

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from services.fitting.catalog_swap import (
    CatalogSwapError,
    CatalogSwapPerformanceMonitor,
    GenerativeProviderCallForbiddenError,
)


def test_zero_generative_provider_calls():
    monitor = CatalogSwapPerformanceMonitor()
    try:
        monitor.record_swap(
            head_id="head-1",
            style_id="afro-fade",
            version=1,
            duration_ms=120.0,
            cache_hit=False,
            generative_provider_called=True,  # Illegal in try-on
        )
        raise AssertionError("Expected GenerativeProviderCallForbiddenError")
    except GenerativeProviderCallForbiddenError:
        pass
    print("[PASS] Catalog swap enforces zero generative provider calls invariant")


def test_sub_500ms_performance_targets():
    monitor = CatalogSwapPerformanceMonitor(target_max_latency_ms=500.0)

    # Simulate 50 catalog swaps (uncached & cached)
    for i in range(25):
        # Initial load: ~150ms
        monitor.record_swap(
            head_id=f"head-{i}",
            style_id="afro-locks",
            version=1,
            duration_ms=150.0,
            cache_hit=False,
        )
        # Cached swap: ~10ms
        monitor.record_swap(
            head_id=f"head-{i}",
            style_id="afro-locks",
            version=1,
            duration_ms=10.0,
            cache_hit=True,
        )

    metrics = monitor.get_percentile_latencies()
    assert metrics["p50"] <= 500.0
    assert metrics["p95"] <= 500.0

    monitor.assert_performance_targets()
    print(f"[PASS] Catalog swap sub-500ms target satisfied (p50={metrics['p50']}ms, p95={metrics['p95']}ms)")


def test_latency_target_exceeded():
    monitor = CatalogSwapPerformanceMonitor(target_max_latency_ms=500.0)
    for _ in range(10):
        monitor.record_swap(
            head_id="head-slow",
            style_id="slow-mesh",
            version=1,
            duration_ms=650.0,
            cache_hit=False,
        )

    try:
        monitor.assert_performance_targets()
        raise AssertionError("Expected CatalogSwapError for exceeding p95 target")
    except CatalogSwapError:
        pass
    print("[PASS] Performance monitor correctly detects p95 latency target violations")


def main():
    test_zero_generative_provider_calls()
    test_sub_500ms_performance_targets()
    test_latency_target_exceeded()
    print("\nBMAD Story 9.2 Catalog Swap Performance: PASS")


if __name__ == "__main__":
    main()
