#!/usr/bin/env python3
from __future__ import annotations
import re
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MIG=ROOT/'web'/'supabase'/'migrations'

def fail(msg:str): raise SystemExit(f'[FAIL] {msg}')
def must(path:str,needle:str):
 p=ROOT/path
 if not p.exists(): fail(f'missing {path}')
 text=p.read_text(encoding='utf-8')
 if needle.lower() not in text.lower(): fail(f'{path}: missing contract {needle!r}')
 return text

# Supabase applies migrations lexically; duplicate numeric versions are forbidden.
versions=defaultdict(list)
for p in MIG.glob('*.sql'):
 m=re.match(r'^(\d+)_',p.name)
 if m: versions[m.group(1)].append(p.name)
for version,names in versions.items():
 if len(names)>1: fail(f'duplicate migration prefix {version}: {names}')

required=[
 '20_marketplace_identity_foundation.sql','21_marketplace_legacy_salon_backfill.sql','22_marketplace_salon_membership_ops.sql',
 '23_marketplace_capability_resolver.sql','24_marketplace_plan_finalization.sql','25_marketplace_taxonomy_services.sql',
 '26_marketplace_professional_portfolio.sql','27_marketplace_geospatial_privacy.sql','28_marketplace_public_discovery.sql',
 '40_marketplace_booking_foundation.sql','41_booking_operations_notifications.sql','42_booking_visual_briefs.sql',
 '50_marketplace_trust_reviews.sql','51_trust_aware_marketplace_ranking.sql','52_marketplace_admin_moderation_fix.sql',
 '60_hair_careers_marketplace.sql','70_marketplace_funnel_telemetry.sql','71_marketplace_payment_readiness.sql','72_sponsored_listing_guardrails.sql'
]
for name in required:
 if not (MIG/name).exists(): fail(f'missing migration {name}')
for stale in ['12_marketplace_identity_foundation.sql','28_marketplace_booking_foundation.sql','29_booking_operations_notifications.sql','30_booking_visual_briefs.sql','31_marketplace_trust_reviews.sql']:
 if (MIG/stale).exists(): fail(f'stale/conflicting migration still present: {stale}')

identity=must('web/supabase/migrations/20_marketplace_identity_foundation.sql','CREATE TABLE IF NOT EXISTS public.professional_profiles')
if "role IN ('customer', 'salon', 'admin', 'professional')" in identity: fail('professional must not become a legacy global role')
must('web/supabase/migrations/21_marketplace_legacy_salon_backfill.sql',"'owner'")
must('web/supabase/migrations/22_marketplace_salon_membership_ops.sql','accept_salon_invitation')
must('web/supabase/migrations/23_marketplace_capability_resolver.sql','resolve_marketplace_capability')
must('web/supabase/migrations/25_marketplace_taxonomy_services.sql','hair_style_taxonomy_bridge')
must('web/supabase/migrations/26_marketplace_professional_portfolio.sql','professional_portfolio_items')
geo=must('web/supabase/migrations/27_marketplace_geospatial_privacy.sql','professional_private_locations')
if 'consumer' in geo.lower() and 'persist' not in geo.lower(): pass
must('web/supabase/migrations/28_marketplace_public_discovery.sql','search_marketplace_providers')
booking=must('web/supabase/migrations/40_marketplace_booking_foundation.sql','marketplace_bookings_no_professional_overlap')
must('web/supabase/migrations/40_marketplace_booking_foundation.sql','FOR UPDATE OF sm SKIP LOCKED')
must('web/supabase/migrations/41_booking_operations_notifications.sql','notification_outbox')
must('web/supabase/migrations/42_booking_visual_briefs.sql','visual_brief_snapshot')
must('web/supabase/migrations/50_marketplace_trust_reviews.sql',"b.status<>'completed'")
must('web/supabase/migrations/51_trust_aware_marketplace_ranking.sql','marketplace_review_aggregates')
must('web/supabase/migrations/60_hair_careers_marketplace.sql','career_hire_handoffs')
must('web/supabase/migrations/60_hair_careers_marketplace.sql','prepare_hire_membership_invitation')
telemetry=must('web/supabase/migrations/70_marketplace_funnel_telemetry.sql','Do not store raw IP')
payment=must('web/supabase/migrations/71_marketplace_payment_readiness.sql',"'service_online_payments',FALSE")
sponsored=must('web/supabase/migrations/72_sponsored_listing_guardrails.sql',"'Sponsorisé'")
if "'sponsored_listings',FALSE" not in payment: fail('sponsored listings must default disabled')
if "payment_mode VARCHAR(24) NOT NULL DEFAULT 'pay_at_provider'" not in payment: fail('service payment MVP must default pay_at_provider')

home=must('web/src/app/page.tsx','Trouvez le professionnel qui saura vraiment réaliser')
for token in ['/discover','/rituel','Pour les professionnels','Questions fréquentes']:
 if token not in home: fail(f'landing missing {token}')
nav=must('web/src/components/Navbar.tsx','Pour les pros')
if 'Le Rituel' in nav: fail('Rituel must not lead the primary navbar')
workspace=must('web/src/components/workspace/WorkspaceShell.tsx','grid grid-cols-4')
if 'bottom.slice(0,4)' not in workspace: fail('mobile workspace bottom bar must hard-cap at 4 items')
if 'sm:hidden fixed' not in workspace: fail('bottom bar must be smartphone-only')
must('web/src/components/marketplace/BookingWizard.tsx','Continuer pour confirmer')
must('web/src/components/marketplace/PublicProviderProfile.tsx','Avis vérifiés')
must('web/src/components/careers/CareersManager.tsx','Inviter dans l’équipe')
must('web/src/components/workspace/BusinessOverview.tsx','Business actif')
must('web/src/lib/marketplace-plans.ts',"positiveEnvInt('PROFESSIONAL_PRO_PRICE_FCFA')")

print('[OK] Afrofade Marketplace V2 static contract passed')
