"""Provider-neutral hair generation boundaries for Afrofade."""

from services.hair.providers import (
    BaseHairProvider,
    HairProviderDisabledError,
    HairProviderJob,
    HairProviderJobNotFoundError,
    HairProviderJobStatus,
    HairProviderMode,
    HairProviderNotReadyError,
    HairProviderResult,
    HunyuanMultiViewHairProvider,
    ManualHairProvider,
    MeshyHairProvider,
    ProviderResolution,
    Trellis2HairProvider,
    build_scaffold_registry,
    get_production_provider,
    resolve_provider_name,
)

__all__ = [
    "BaseHairProvider",
    "HairProviderDisabledError",
    "HairProviderJob",
    "HairProviderJobNotFoundError",
    "HairProviderJobStatus",
    "HairProviderMode",
    "HairProviderNotReadyError",
    "HairProviderResult",
    "HunyuanMultiViewHairProvider",
    "ManualHairProvider",
    "MeshyHairProvider",
    "ProviderResolution",
    "Trellis2HairProvider",
    "build_scaffold_registry",
    "get_production_provider",
    "resolve_provider_name",
]
