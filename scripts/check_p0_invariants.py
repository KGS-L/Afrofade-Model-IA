#!/usr/bin/env python3
"""Static P0/P1 security and role-dashboard integrity checks requiring no external services."""

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
    checkout = read("web/src/app/api/v1/payments/checkout/route.ts")
    legacy_checkout = read("web/src/app/api/v1/payments/money-fusion/checkout/route.ts")
    legacy_webhook = read("web/src/app/api/webhooks/payment/route.ts")
    mf_webhook = read("web/src/app/api/webhooks/money-fusion/route.ts")
    genius_webhook = read("web/src/app/api/webhooks/genius-pay/route.ts")
    upload = read("web/src/app/api/upload/presigned-url/route.ts")
    cron = read("web/src/app/api/cron/purge-biometric/route.ts")
    reconstruct = read("web/src/app/api/v1/reconstruct/route.ts")
    money_fusion = read("web/src/lib/money-fusion.ts")
    genius_pay = read("web/src/lib/genius-pay.ts")
    provider_config = read("web/src/lib/payment-providers.ts")
    api_main = read("api/main.py")
    migration02 = read("web/supabase/migrations/02_p0_security_commerce.sql")
    migration03 = read("web/supabase/migrations/03_dual_payment_providers.sql")
    migration04 = read("web/supabase/migrations/04_role_dashboards.sql")
    customer_api = read("web/src/app/api/account/overview/route.ts")
    salon_api = read("web/src/app/api/salon/dashboard/route.ts")
    salon_onboard = read("web/src/app/api/salon/onboard/route.ts")
    admin_api = read("web/src/app/api/admin/overview/route.ts")
    customer_page = read("web/src/app/account/page.tsx")
    salon_page = read("web/src/app/dashboard/page.tsx")
    admin_page = read("web/src/app/admin/page.tsx")

    checks = [
        require("No demo OTP bypass", "token === '123456'" not in auth and 'token === "123456"' not in auth, "hard-coded OTP bypass absent"),
        require("No client demo admin login", "loginAsAdmin" not in auth, "admin cannot be minted in client AuthProvider"),
        require("Middleware verifies session", "getVerifiedPrincipal" in middleware and "principal.role !== 'admin'" in middleware, "protected routes validate the Supabase-backed principal and admin role"),
        require("Unified checkout requires verified user", "getVerifiedPrincipal" in checkout, "checkout is authenticated server-side"),
        require("Checkout does not trust client amount", "body?.amountFcfa" not in checkout and "body.amountFcfa" not in checkout, "price comes from server catalog"),
        require("Checkout uses server product catalogs", "PLANS.find" in checkout and "B2C_CREDIT_PACKS.find" in checkout, "subscriptions and credits are priced from trusted constants"),
        require("Payment is persisted pending", "payment_transactions" in checkout and "status: 'pending'" in checkout and "provider," in checkout, "provider session is linked to a pending DB transaction"),
        require("Payment providers are feature-gated", "PAYMENT_ENABLED_PROVIDERS" in provider_config and "isPaymentProviderEnabled" in checkout, "providers can be rolled out without exposing unconfigured credentials"),
        require("Legacy Money Fusion checkout is safe", "export { POST }" in legacy_checkout and "../../checkout/route" in legacy_checkout, "old route delegates to unified server-side checkout"),
        require("Money Fusion request matches supplied Web API", all(token in checkout + money_fusion for token in ["personal_Info", "numeroSend", "nomclient", "webhook_url"]), "required Money Fusion contract fields are present"),
        require("Money Fusion does not invent bearer auth", "Authorization" not in money_fusion and "MONEY_FUSION_API_URL" in money_fusion, "merchant dashboard API URL is used without undocumented auth headers"),
        require("Money Fusion payment is re-fetched", "getMoneyFusionPaymentStatus" in mf_webhook and "MONEY_FUSION_STATUS_URL" in money_fusion and "method: 'GET'" in money_fusion, "webhook event is not treated as proof of payment"),
        require("Money Fusion amount is verified", "verified.Montant" in mf_webhook and "payment.amount_fcfa" in mf_webhook and "finalize_afrofade_payment" in mf_webhook, "provider amount is compared before finalization"),
        require("GeniusPay uses merchant credentials", "X-API-Key" in genius_pay and "X-API-Secret" in genius_pay, "merchant API calls use both documented headers"),
        require("GeniusPay production requires HTTPS", "GENIUS_PAY_BASE_URL must use HTTPS in production" in genius_pay, "merchant secret cannot be sent over cleartext HTTP in production"),
        require("GeniusPay webhook uses HMAC", "createHmac('sha256'" in genius_pay and "timingSafeEqual" in genius_pay and "x-geniuspay-signature" in genius_webhook, "webhook signature is verified with HMAC-SHA256"),
        require("GeniusPay payment is re-fetched", "getGeniusPayPayment(reference)" in genius_webhook and "verified.amount" in genius_webhook and "payment.amount_fcfa" in genius_webhook, "signed webhook is cross-checked against merchant API"),
        require("Legacy generic webhook is retired", "status: 410" in legacy_webhook and "Legacy payment webhook retired" in legacy_webhook, "ambiguous shared-secret webhook cannot finalize payments"),
        require("Dual-provider DB constraint exists", "money_fusion', 'genius_pay" in migration03 and "payment.provider" in migration03, "transactions and subscriptions preserve the actual provider"),
        require("Payment finalization is idempotent", "IF payment.status = 'paid'" in migration03 and "idempotency_key TEXT UNIQUE" in migration02, "repeated notifications cannot credit twice"),
        require("Commerce writes stay server-side", "GRANT EXECUTE ON FUNCTION finalize_afrofade_payment" in migration03 and "service_role" in migration03, "clients have no commerce write policies"),
        require("Upload ownership is server-derived", "getVerifiedPrincipal" in upload and "body?.salonId" not in upload and "body.salonId" not in upload, "caller cannot select another salon storage path"),
        require("CRON has no public fallback", "CRON_SECRET ||" not in cron and "searchParams.get('secret')" not in cron, "secret is required via header"),
        require("Money Fusion has no demo success", "mf_demo_token" not in money_fusion and "mode démo" not in money_fusion.lower(), "provider failures fail closed"),
        require("Reconstruction requires user auth", "getVerifiedPrincipal" in reconstruct, "Next proxy authenticates caller"),
        require("Reconstruction has no fake success", "fallback.gltf" not in reconstruct and "identity_preserved: true" not in reconstruct, "engine failure is surfaced"),
        require("Internal API secret is forwarded", "x-internal-api-key" in reconstruct.lower() and "API_INTERNAL_SECRET" in reconstruct, "Next-to-FastAPI calls are authenticated"),
        require("FastAPI is not wildcard CORS", 'allow_origins=["*"]' not in api_main and "API_ALLOWED_ORIGINS" in api_main, "origins come from explicit configuration"),
        require("FastAPI business routes are protected", "API_INTERNAL_SECRET" in api_main and "require_internal_api_key" in api_main and "X-Internal-API-Key" in api_main, "inference endpoints require internal credential"),
        require("Role routes are isolated", all(token in middleware for token in ["/account", "principal.role !== 'customer'", "principal.role !== 'salon'", "principal.role !== 'admin'"]), "customer, salon and admin dashboards have server middleware boundaries"),
        require("New auth users default safely", "handle_afrofade_auth_user_created" in migration04 and "VALUES (NEW.id, 'customer')" in migration04, "new accounts cannot self-mint salon/admin roles"),
        require("Customer profile is persisted", "customer_profiles" in migration04 and "customer_profiles" in customer_api and ".upsert(" in customer_api, "customer name/phone/country live in Supabase"),
        require("Customer account is real", "credit_wallets" in customer_api and "credit_transactions" in customer_api and "payment_transactions" in customer_api and "B2C_CREDIT_PACKS" in customer_page, "customer dashboard reads wallet/ledger/payments and can buy server-priced packs"),
        require("Salon profile is persisted", ".from('salons')" in salon_api and ".update(" in salon_api and "profileCompletion" in salon_api, "salon profile edits are stored server-side"),
        require("Salon onboarding is authenticated", "getVerifiedPrincipal" in salon_onboard and "principal.role === 'admin'" in salon_onboard and "role: 'salon'" in salon_onboard, "customer can create only their own salon while admin conversion is blocked"),
        require("Salon dashboard uses real data", "clients_heads" in salon_api and "subscriptions" in salon_api and "payment_transactions" in salon_api and "Stats mock" not in salon_page, "salon KPIs and histories come from Supabase"),
        require("Admin API enforces role", "principal.role !== 'admin'" in admin_api and "getVerifiedPrincipal" in admin_api, "admin analytics cannot be read by non-admins"),
        require("Admin dashboard has no fixtures", "const KPIS" not in admin_page and "RECENT_SALONS" not in admin_page and "/api/admin/overview" in admin_page, "admin UI consumes real server analytics"),
        require("Checkout is role-aware", "purpose === 'credits' && principal.role !== 'customer'" in checkout and "principal.role !== 'salon'" in checkout, "B2C and salon purchases cannot cross role boundaries"),
        require("Checkout return paths match role", "purpose === 'credits' ? '/account' : '/dashboard'" in checkout, "payment redirects land in the correct operational dashboard"),
        require("Subscription discounts are server-verified", "discountEligible" in checkout and "previousPayment" in checkout and "salon?.country" in checkout, "client cannot unlock first-subscription discounts locally"),
    ]

    passed = sum(checks)
    print(f"\nSecurity + role-dashboard invariants: {passed}/{len(checks)} passed")
    return 0 if passed == len(checks) else 1


if __name__ == "__main__":
    sys.exit(main())
