#!/usr/bin/env python3
"""Static guardrails for BMAD Story 12.1 marketplace identity foundation."""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "web" / "supabase" / "migrations" / "20_marketplace_identity_foundation.sql"
LEGACY_ROLE = ROOT / "web" / "supabase" / "migrations" / "02_p0_security_commerce.sql"
LEGACY_SALON = ROOT / "web" / "supabase" / "migrations" / "01_init_schema.sql"


def die(msg: str) -> None:
    print(f"[FAIL] {msg}")
    raise SystemExit(1)


def need(text: str, value: str, msg: str) -> None:
    if value.lower() not in text.lower(): die(msg)


def ban(text: str, pattern: str, msg: str) -> None:
    if re.search(pattern, text, re.I | re.S): die(msg)


def main() -> int:
    if not MIGRATION.exists(): die("20_marketplace_identity_foundation.sql missing")
    m = MIGRATION.read_text(encoding="utf-8")
    r = LEGACY_ROLE.read_text(encoding="utf-8")
    s = LEGACY_SALON.read_text(encoding="utf-8")

    need(s, "CREATE TABLE IF NOT EXISTS salons", "legacy salons contract missing")
    need(r, "role IN ('customer', 'salon', 'admin')", "legacy role compatibility changed")
    ban(m, r"DROP\s+TABLE\s+(IF\s+EXISTS\s+)?(?:public\.)?salons\b", "must not drop salons")
    ban(m, r"CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(?:public\.)?salons\b", "must extend, not recreate, salons")
    ban(m, r"geography\s*\(", "PostGIS belongs to Story 13.4")
    ban(m, r"role\s+IN\s*\([^\)]*professional", "professional must not become a legacy global role")

    for token, msg in [
        ("CREATE TABLE IF NOT EXISTS public.professional_profiles", "professional_profiles missing"),
        ("user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE", "one-profile-per-user invariant missing"),
        ("idx_professional_profiles_slug_ci", "professional slug uniqueness missing"),
        ("ALTER TABLE public.salons", "additive salon extension missing"),
        ("CREATE TABLE IF NOT EXISTS public.salon_memberships", "salon_memberships missing"),
        ("role IN ('owner', 'manager', 'professional')", "membership roles missing"),
        ("status IN ('invited', 'active', 'suspended', 'ended')", "membership states missing"),
        ("idx_salon_memberships_live_user", "live membership uniqueness missing"),
        ("enforce_membership_professional_ownership", "cross-user professional guard missing"),
        ("ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY", "profile RLS missing"),
        ("ALTER TABLE public.salon_memberships ENABLE ROW LEVEL SECURITY", "membership RLS missing"),
        ("professional_profiles_select_own", "own profile SELECT policy missing"),
        ("professional_profiles_insert_own", "own profile INSERT policy missing"),
        ("professional_profiles_update_own", "own profile UPDATE policy missing"),
        ("salon_memberships_select_own", "own membership SELECT policy missing"),
        ("REVOKE ALL ON TABLE public.professional_profiles FROM anon", "anon profile access must fail closed"),
        ("REVOKE ALL ON TABLE public.salon_memberships FROM anon", "anon membership access must fail closed"),
    ]:
        need(m, token, msg)

    ban(m, r"CREATE\s+POLICY\s+\w+\s+ON\s+public\.salon_memberships\s+FOR\s+(INSERT|UPDATE|DELETE)", "12.1 must not open membership writes")
    print("[OK] Story 12.1 marketplace identity static contract passed")
    return 0

if __name__ == "__main__":
    sys.exit(main())
