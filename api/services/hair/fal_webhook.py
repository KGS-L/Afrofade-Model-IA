"""FAL webhook authentication using the raw body and cached official JWKS."""
from __future__ import annotations
import base64, hashlib, json, threading, time
from typing import Any, Mapping
import requests
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

JWKS_URL = "https://rest.fal.ai/.well-known/jwks.json"
_cache: tuple[float, dict[str, Any]] | None = None
_cache_lock = threading.RLock()
MAX_JWKS_BYTES = 256_000
MAX_JWKS_KEYS = 32

class FalWebhookError(ValueError): pass

def _b64(value: str) -> bytes: return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))

def _load_jwks(current: int, transport: Any, *, force: bool = False) -> dict[str, Any]:
    global _cache
    with _cache_lock:
        if not force and _cache is not None and 0 <= current-_cache[0] <= 86400: return _cache[1]
        previous=_cache
        try:
            response=transport.get(JWKS_URL,timeout=10); response.raise_for_status()
            raw=getattr(response,"content",None)
            if isinstance(raw,(bytes,bytearray)) and len(raw)>MAX_JWKS_BYTES: raise FalWebhookError("fal_jwks_too_large")
            payload=response.json()
            keys=payload.get("keys") if isinstance(payload,dict) else None
            if not isinstance(keys,list) or not 1 <= len(keys) <= MAX_JWKS_KEYS: raise FalWebhookError("fal_jwks_invalid")
            if any(not isinstance(key,dict) or not isinstance(key.get("x"),str) for key in keys): raise FalWebhookError("fal_jwks_invalid")
            _cache=(current,payload); return payload
        except FalWebhookError:
            if previous is not None and 0 <= current-previous[0] <= 86400: return previous[1]
            raise
        except Exception as exc:
            if previous is not None and 0 <= current-previous[0] <= 86400: return previous[1]
            raise FalWebhookError("fal_jwks_unavailable") from exc

def verify_fal_webhook(raw_body: bytes, headers: Mapping[str, str], *, now: int | None = None,
                       transport: Any | None = None) -> dict[str, Any]:
    request_id = headers.get("X-Fal-Webhook-Request-Id", "").strip()
    user_id = headers.get("X-Fal-Webhook-User-Id", "").strip()
    timestamp = headers.get("X-Fal-Webhook-Timestamp", "").strip()
    signature = headers.get("X-Fal-Webhook-Signature", "").strip()
    if not all((request_id,user_id,timestamp,signature)): raise FalWebhookError("fal_webhook_headers_missing")
    try: ts = int(timestamp)
    except ValueError as exc: raise FalWebhookError("fal_webhook_timestamp_invalid") from exc
    current = int(time.time()) if now is None else now
    if abs(current-ts) > 300: raise FalWebhookError("fal_webhook_stale")
    source=transport or requests
    keys = _load_jwks(current,source).get("keys", [])
    body_hash = hashlib.sha256(raw_body).hexdigest()
    message = "\n".join((request_id, user_id, timestamp, body_hash)).encode("utf-8")
    try: signature_bytes = bytes.fromhex(signature)
    except ValueError as exc: raise FalWebhookError("fal_webhook_signature_invalid") from exc
    def matches(candidate_keys: list[Any]) -> bool:
        for key in candidate_keys:
            try: Ed25519PublicKey.from_public_bytes(_b64(key["x"])).verify(signature_bytes,message); return True
            except Exception: continue
        return False
    valid=matches(keys)
    if not valid:
        refreshed=_load_jwks(current,source,force=True).get("keys",[])
        valid=matches(refreshed)
    if not valid: raise FalWebhookError("fal_webhook_signature_invalid")
    try: payload=json.loads(raw_body)
    except Exception as exc: raise FalWebhookError("fal_webhook_json_invalid") from exc
    if not isinstance(payload,dict) or str(payload.get("request_id",request_id)) != request_id: raise FalWebhookError("fal_webhook_identity_invalid")
    payload["request_id"] = request_id
    return payload
