#!/usr/bin/env python3
"""Static contract checks for BMAD Story 12.1 marketplace identity migration.

This checker is intentionally lightweight and CI-safe. It does not replace applying
Supabase migrations in a real/test Postgres project; it prevents structural drift,
destructive legacy changes, missing RLS, and unsafe relationship shortcuts.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "web" / "supabase" / "migrations" / "12_marketplace_identity_foundation.sql"
LEGACY_ROLE = ROOT / "web" / "supabase" / "migrations" / "02_p0_security_commerce.sql"
LEGACY_SALON = ROOT / "web" / "supabase" / "migrations" / "01_init_schema.sql"


def fail(message: str) -> None:
    print(f"[FAIL] {message}")
    raise SystemExit(1)


def require(text: str, pattern: str, message: str, *, regex: bool = False) -> None:
    found = re.search(pattern, text, re.IGNORECASE | re.DOTALL) if regex else pattern.lower() in text.lower()
    if not found:
        fail(message)


def forbid(text: str, pattern: str, message: str, *, regex: bool = False) -> None:
    found = re.search(pattern, text, re.IGNORECASE | re.DOTALL) if regex else pattern.lower() in text.lower()
    if found:
        fail(message)


def main() -> int:
    if not MIGRATION.exists():
        fail(f"missing migration: {MIGRATION.relative_to(ROOT)}")

    migration = MIGRATION.read_text(encoding="utf-8")
    legacy_role = LEGACY_ROLE.read_text(encoding="utf-8")
    legacy_salon = LEGACY_SALON.read_text(encoding="utf-8")

    # Legacy compatibility must remain explicit in repository history.
    require(legacy_salon, "CREATE TABLE IF NOT EXISTS salons", "legacy salons table contract disappeared")
    require(legacy_role, "role IN ('customer', 'salon', 'admin')", "legacy role compatibility contract changed unexpectedly")

    # Additive schema: no destructive replacement of legacy identity/business data.
    forbid(migration, r"DROP\s+TABLE\s+(IF\s+EXISTS\s+)?(?:public\.)?salons\b", "migration 12 must not drop salons", regex=True)
    forbid(migration, r"CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(?:public\.)?salons\b", "migration 12 must alter, not recreate, salons", regex=True)
    forbid(migration, r"DROP\s+(COLUMN|CONSTRAINT).*user_profiles", "migration 12 must not destructively alter user_profiles", regex=True)
    forbid(migration, "geography(", "PostGIS/geography belongs to Story 13.4")
    forbid(migration, "role IN ('customer', 'salon', 'admin', 'professional')", "professional must not become a legacy global role")

    # ProfessionalProfile foundation.
    require(migration, "CREATE TABLE IF NOT EXISTS public.professional_profiles", "professional_profiles table missing")
    require(migration, "user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE", "professional profile must be one-per-user")
    require(migration, "operating_mode IN ('independent', 'mobile', 'studio', 'hybrid', 'salon_only')", "professional operating modes missing")
    require(migration, "job_seeking_status IN ('not_looking', 'open', 'actively_looking')", "job-seeking state constraint missing")
    require(migration, "verification_status IN ('unverified', 'pending', 'verified', 'rejected', 'suspended')", "verification state constraint missing")
    require(migration, "listing_status IN ('draft', 'published', 'paused', 'suspended')", "listing state constraint missing")
    require(migration, "idx_professional_profiles_slug_ci", "case-insensitive professional slug uniqueness missing")

    # Existing salons extended additively.
    require(migration, "ALTER TABLE public.salons", "salons must be extended additively")
    for column in (
        "slug TEXT",
        "headline VARCHAR(180)",
        "description TEXT",
        "logo_url TEXT",
        "verification_status VARCHAR(24)",
        "listing_status VARCHAR(24)",
        "city VARCHAR(120)",
        "neighborhood VARCHAR(160)",
        "public_phone VARCHAR(50)",
        "booking_confirmation_mode VARCHAR(24)",
    ):
        require(migration, column, f"salon marketplace column missing: {column}")

    # Membership relationship model and integrity.
    require(migration, "CREATE TABLE IF NOT EXISTS public.salon_memberships", "salon_memberships table missing")
    require(migration, "role IN ('owner', 'manager', 'professional')", "membership role constraint missing")
    require(migration, "status IN ('invited', 'active', 'suspended', 'ended')", "membership status constraint missing")
    require(migration, "jsonb_typeof(permissions) = 'object'", "permissions JSON object constraint missing")
    require(migration, "idx_salon_memberships_live_user", "duplicate-live-membership guard missing")
    require(migration, "WHERE status <> 'ended'", "ended memberships must not block future rejoin")
    require(migration, "enforce_membership_professional_ownership", "professional ownership guard missing")
    require(migration, "membership_professional_profile_owner_mismatch", "ownership mismatch must fail closed")

    # New private identity tables must use conservative RLS.
    require(migration, "ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY", "professional profile RLS missing")
    require(migration, "ALTER TABLE public.salon_memberships ENABLE ROW LEVEL SECURITY", "membership RLS missing")
    require(migration, "professional_profiles_select_own", "own professional SELECT policy missing")
    require(migration, "professional_profiles_insert_own", "own professional INSERT policy missing")
    require(migration, "professional_profiles_update_own", "own professional UPDATE policy missing")
    require(migration, "salon_memberships_select_own", "own membership SELECT policy missing")
    require(migration, "REVOKE ALL ON TABLE public.professional_profiles FROM anon", "anon professional-table access must fail closed")
    require(migration, "REVOKE ALL ON TABLE public.salon_memberships FROM anon", "anon membership-table access must fail closed")

    # Story boundaries: membership writes and public listing must not be opened here.
    forbid(migration, r"CREATE\s+POLICY\s+\w+\s+ON\s+public\.salon_memberships\s+FOR\s+(INSERT|UPDATE|DELETE)", "Story 12.1 must not open direct membership writes", regex=True)
    forbid(migration, r"TO\s+anon\b", "Story 12.1 private identity policies must not grant anon access", regex=True)

    print("[OK] Story 12.1 marketplace identity static contract passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
