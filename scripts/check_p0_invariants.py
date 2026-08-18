#!/usr/bin/env python3
"""Static P0 security/commercial integrity checks that require no external services."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def require(name: str, condition: bool, detail: str) -> bool:
    print(f"[{'PASS' if condition else 'FAIL'}] {name}: {detail}")
    return condition


def main() -> int:
    auth = read("web/src/lib/auth.tsx")
    middleware = read("web/src/middleware.ts")
    checkout = read("web/src/app/api/v1/payments/money-fusion/checkout/route.ts")
    webhook = read("web/src/app/api/webhooks/payment/route.ts")
    upload = read("web/src/app/api/upload/presigned-url/route.ts")
    cron = read("web/src/app/api/cron/purge-biometric/route.ts")
    reconstruct = read("web/src/app/api/v1/reconstruct/route.ts")
    money_fusion = read("web/src/lib/money-fusion.ts")
    api_main = read("api/main.py")
    migration = read("web/supabase/migrations/02_p0_security_commerce.sql")

    checks = [
        require("No demo OTP bypass", "token === '123456'" not in auth and 'token === "123456"' not in auth, "hard-coded OTP bypass absent"),
        require("No client demo admin login", "loginAsAdmin" not in auth, "admin cannot be minted in client AuthProvider"),
        require("Middleware verifies session", "verifyAccessToken" in middleware, "protected routes do not trust cookie presence alone"),
        require("Checkout requires verified user", "getVerifiedPrincipal" in checkout, "checkout is authenticated server-side"),
        require("Checkout does not trust client amount", "body?.amountFcfa" not in checkout and "body.amountFcfa" not in checkout, "price comes from server catalog"),
        require("Payment is persisted pending", "payment_transactions" in checkout and "status: 'pending'" in checkout, "provider session is linked to a pending DB transaction"),
        require("Webhook fails closed", "PAYMENT_WEBHOOK_SECRET" in webhook and "finalize_afrofade_payment" in webhook, "unsigned callbacks cannot finalize commerce"),
        require("Payment finalization is idempotent", "IF payment.status = 'paid'" in migration and "idempotency_key TEXT UNIQUE" in migration, "repeated webhook cannot credit twice"),
        require("Commerce writes stay server-side", "GRANT EXECUTE ON FUNCTION finalize_afrofade_payment" in migration and "service_role" in migration, "clients have read-only RLS policies"),
        require("Upload ownership is server-derived", "getVerifiedPrincipal" in upload and "body?.salonId" not in upload and "body.salonId" not in upload, "caller cannot select another salon storage path"),
        require("CRON has no public fallback", "CRON_SECRET ||" not in cron and "searchParams.get('secret')" not in cron, "secret is required via header"),
        require("Money Fusion has no demo success", "mf_demo_token" not in money_fusion and "mode démo" not in money_fusion.lower(), "provider failures fail closed"),
        require("Reconstruction requires user auth", "getVerifiedPrincipal" in reconstruct, "Next proxy authenticates caller"),
        require("Reconstruction has no fake success", "fallback.gltf" not in reconstruct and "identity_preserved: true" not in reconstruct, "engine failure is surfaced"),
        require("Internal API secret is forwarded", "x-afrofade-internal-secret" in reconstruct.lower(), "Next-to-FastAPI calls are authenticated"),
        require("FastAPI is not wildcard CORS", 'allow_origins=["*"]' not in api_main and "API_ALLOWED_ORIGINS" in api_main, "origins come from explicit configuration"),
        require("FastAPI business routes are protected", "API_INTERNAL_SECRET" in api_main and "verify_internal_request" in api_main, "inference endpoints require internal credential"),
    ]

    passed = sum(checks)
    print(f"\nP0 invariants: {passed}/{len(checks)} passed")
    return 0 if passed == len(checks) else 1


if __name__ == "__main__":
    sys.exit(main())
