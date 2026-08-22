#!/usr/bin/env python3
"""Static contract for the Afrofade product-hardening gate before BMAD Story 7.6."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def require(name: str, condition: bool, detail: str) -> bool:
    print(f"[{'PASS' if condition else 'FAIL'}] {name}: {detail}")
    return condition


def main() -> int:
    migration = read("web/supabase/migrations/09_product_hardening.sql")
    middleware_path = "web/src/proxy.ts" if (ROOT / "web/src/proxy.ts").exists() else "web/src/middleware.ts"
    middleware = read(middleware_path)
    onboarding_api = read("web/src/app/api/onboarding/profile/route.ts")
    onboarding_page = read("web/src/app/onboarding/page.tsx")
    countries = read("web/src/lib/countries.ts")
    country_select = read("web/src/components/CountrySelect.tsx")
    customer_api = read("web/src/app/api/account/overview/route.ts")
    salon_api = read("web/src/app/api/salon/dashboard/route.ts")
    salon_onboard = read("web/src/app/api/salon/onboard/route.ts")
    customer_page = read("web/src/app/account/page.tsx")
    salon_page = read("web/src/app/dashboard/page.tsx")
    admin_page = read("web/src/app/admin/page.tsx")
    admin_details = read("web/src/app/admin/[section]/page.tsx")
    admin_provider_api = read("web/src/app/api/admin/payment-providers/route.ts")
    provider_config = read("web/src/lib/payment-providers.ts")
    checkout = read("web/src/app/api/v1/payments/checkout/route.ts")
    scanner = read("web/src/components/GuidedScanner.tsx")

    checks = [
        require(
            "Payment-provider settings persist server-side",
            "CREATE TABLE IF NOT EXISTS payment_provider_settings" in migration
            and "money_fusion" in migration
            and "genius_pay" in migration
            and "GRANT ALL ON payment_provider_settings TO service_role" in migration,
            "admin provider switches are stored in a service-role-only table",
        ),
        require(
            "Provider activation is fail-closed",
            "PAYMENT_ENABLED_PROVIDERS" in provider_config
            and "payment_provider_settings" in provider_config
            and "effectiveEnabled: enabled && isConfigured" in provider_config
            and "getOperationalPaymentProviders" in checkout,
            "DB toggle and server configuration must both allow checkout",
        ),
        require(
            "Admin can control providers",
            "principal.role !== 'admin'" in admin_provider_api
            and ".from('payment_provider_settings')" in admin_provider_api
            and "enabled: body.enabled" in admin_provider_api,
            "provider mutations require an authenticated admin",
        ),
        require(
            "Admin KPI cards open detail pages",
            all(path in admin_page for path in [
                "'/admin/salons'",
                "'/admin/subscriptions'",
                "'/admin/users'",
                "'/admin/revenue'",
            ])
            and "/api/admin/details/${section}" in admin_details,
            "salons, subscriptions, users and revenue have dedicated drill-down views",
        ),
        require(
            "New users choose a profile explicitly",
            "VALUES (NEW.id, 'customer')" not in migration
            and "profileType === 'customer'" in onboarding_api
            and "profileType === 'salon'" in onboarding_api
            and "Particulier" in onboarding_page
            and "Salon de coiffure" in onboarding_page,
            "new auth users are not silently assigned a customer role",
        ),
        require(
            "Middleware enforces onboarding before dashboards",
            "'/onboarding'" in middleware
            and "!principal.profileConfigured" in middleware
            and "new URL('/onboarding'" in middleware,
            "unconfigured authenticated accounts cannot enter a role dashboard",
        ),
        require(
            "Country values are controlled",
            "COUNTRIES" in countries
            and "isSupportedCountry" in countries
            and ("<select" in country_select or "CountrySelect" in country_select or "<button" in country_select)
            and "isSupportedCountry" in customer_api
            and "isSupportedCountry" in salon_api
            and "isSupportedCountry" in salon_onboard,
            "customer, salon and salon-conversion writes validate the shared country list",
        ),
        require(
            "Customer and salon profile forms use the country dropdown",
            "<CountrySelect" in customer_page and "<CountrySelect" in salon_page,
            "role dashboards no longer use free-text country fields",
        ),
        require(
            "Role dashboards use skeleton loading",
            "<DashboardSkeleton" in customer_page
            and "<DashboardSkeleton" in salon_page
            and "<DashboardSkeleton" in admin_page,
            "data-dependent dashboards show layout skeletons instead of blocking spinners",
        ),
        require(
            "Payment selection is dynamic in both role dashboards",
            "/api/v1/payments/providers" in customer_page
            and "/api/v1/payments/providers" in salon_page
            and "body: JSON.stringify({ provider" in customer_page
            and "body: JSON.stringify({ provider" in salon_page,
            "users only see/use operational providers returned by the server",
        ),
        require(
            "Payment return synchronization is preserved",
            ("payment_id" in customer_page or "searchParams" in customer_page)
            and ("setInterval" in customer_page or "useEffect" in customer_page)
            and ("payment_id" in salon_page or "searchParams" in salon_page)
            and ("setInterval" in salon_page or "useEffect" in salon_page),
            "wallet/subscription state is refreshed until the verified webhook settles",
        ),
        require(
            "Customer scanner excludes neck capture",
            "user?.role==='salon'?ALL_ANGLES:ALL_ANGLES.filter((angle)=>angle.key!=='nuque')" in scanner,
            "neck is included only for salon-assisted scans",
        ),
        require(
            "Scanner provides live quality feedback",
            all(token in scanner for token in [
                "Image noire",
                "Visage trop sombre",
                "Trop de lumière",
                "Trop de mouvement",
                "Bonne position",
                "stableMsRef",
                "brightness",
            ]),
            "camera readiness, lighting, movement and stability affect live guidance",
        ),
    ]

    passed = sum(checks)
    print(f"\nProduct hardening invariants: {passed}/{len(checks)} passed")
    return 0 if passed == len(checks) else 1


if __name__ == "__main__":
    sys.exit(main())
