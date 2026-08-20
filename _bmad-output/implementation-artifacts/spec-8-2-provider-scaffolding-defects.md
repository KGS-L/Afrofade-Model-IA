# BMAD Story 8.2 — Fix Provider Scaffolding Defects

Status: done
Epic: 8 — Hair Asset Factory
Priority: P1

## Goal

Make all temporary hair-generation providers explicit, request-scoped and fail-closed before any real TRELLIS.2, Hunyuan3D or Meshy wiring is allowed into production.

## Source acceptance criteria

- `ManualHairProvider.get_result` does not reference undefined `input_data`.
- Provider jobs/results are per-request, not constant fake IDs.
- Scaffold mode is explicit and cannot masquerade as provider success.

## Implementation contract

- `ManualHairProvider` retrieves input data from the submitted provider job.
- Every submission gets its own provider job id and preserves the caller request id.
- Unknown job ids fail instead of resolving to a fake result.
- `HairProviderMode.SCAFFOLD` and `HairProviderJobStatus.SCAFFOLDED` are explicit states.
- A scaffold result never has a raw asset URL and its `success` property is false.
- `get_production_provider` rejects scaffold implementations even when a temporary feature flag is enabled.
- All temporary providers are disabled by default through server-side environment flags.
- Provider aliases/remaps return an observable `ProviderResolution`.
- Story 8.2 contains no real paid-provider credentials or API wiring.

## Provider state after this story

- TRELLIS.2: scaffold only, disabled by default; real implementation remains Story 8.4.
- Hunyuan3D Multi-View: scaffold only, disabled by default; real implementation remains Story 8.5.
- Meshy: experimental scaffold only, disabled by default; no production wiring in Epic 8 at this point.
- Manual import: provenance scaffold only, disabled by default.

## Validation

`python3 api/scripts/validate_provider_scaffolding.py`

CI gate: `.github/workflows/p1-provider-scaffolding.yml`

## Closure

Validated on implementation head `5957ae9e14f9507ce841a12ced0537a1880f7e93` with the dedicated Story 8.2 gate, all prior P1 gates, Next.js/FastAPI validation, production Docker build/startup and P0 runtime smoke tests passing.
