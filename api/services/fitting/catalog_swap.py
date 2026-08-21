"""Backend catalog swap zero-generation validator & latency metrics (BMAD Story 9.2)."""
from __future__ import annotations

from dataclasses import dataclass, field
import time
from typing import Any, Mapping


class CatalogSwapError(RuntimeError):
    """Base error for catalog swap performance validation."""


class GenerativeProviderCallForbiddenError(CatalogSwapError):
    """Raised if any generative 3D provider is invoked during interactive catalog try-on."""


@dataclass(frozen=True)
class CatalogSwapRecord:
    head_id: str
    style_id: str
    version: int
    duration_ms: float
    cache_hit: bool
    generative_provider_called: bool = False

    def __post_init__(self) -> None:
        if self.generative_provider_called:
            raise GenerativeProviderCallForbiddenError(
                "generative_provider_called_during_swap: Catalog try-on must never invoke generation APIs."
            )


class CatalogSwapPerformanceMonitor:
    """Tracks catalog swap latencies and enforces zero-provider-call invariant during try-ons."""

    def __init__(self, target_max_latency_ms: float = 500.0) -> None:
        self.target_max_latency_ms = target_max_latency_ms
        self.swap_history: list[CatalogSwapRecord] = []

    def record_swap(
        self,
        *,
        head_id: str,
        style_id: str,
        version: int,
        duration_ms: float,
        cache_hit: bool,
        generative_provider_called: bool = False,
    ) -> CatalogSwapRecord:
        record = CatalogSwapRecord(
            head_id=head_id,
            style_id=style_id,
            version=version,
            duration_ms=round(duration_ms, 2),
            cache_hit=cache_hit,
            generative_provider_called=generative_provider_called,
        )
        self.swap_history.append(record)
        return record

    def get_percentile_latencies(self) -> dict[str, float]:
        if not self.swap_history:
            return {"p50": 0.0, "p95": 0.0, "max": 0.0}

        latencies = sorted(r.duration_ms for r in self.swap_history)
        n = len(latencies)
        p50_idx = int(0.50 * (n - 1))
        p95_idx = int(0.95 * (n - 1))

        return {
            "p50": latencies[p50_idx],
            "p95": latencies[p95_idx],
            "max": latencies[-1],
        }

    def assert_performance_targets(self) -> None:
        metrics = self.get_percentile_latencies()
        if metrics["p95"] > self.target_max_latency_ms:
            raise CatalogSwapError(
                f"catalog_swap_p95_exceeded: p95={metrics['p95']}ms > target={self.target_max_latency_ms}ms"
            )
