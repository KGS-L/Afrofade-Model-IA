-- Afrofade Database Migration 72: sponsored listing readiness, disabled by default
-- BMAD Story 17.5

CREATE TABLE IF NOT EXISTS public.sponsored_listing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_type VARCHAR(20) NOT NULL CHECK(provider_type IN ('professional','salon')),
  professional_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  label VARCHAR(40) NOT NULL DEFAULT 'Sponsorisé' CHECK(btrim(label)<>''),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','paused','ended')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  budget_fcfa INT NOT NULL CHECK(budget_fcfa>0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(ends_at>starts_at),
  CHECK((provider_type='professional' AND professional_profile_id IS NOT NULL AND salon_id IS NULL) OR (provider_type='salon' AND salon_id IS NOT NULL AND professional_profile_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_sponsored_active_window ON public.sponsored_listing_campaigns(status,starts_at,ends_at);

CREATE OR REPLACE FUNCTION public.guard_sponsored_listing_campaign() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
DECLARE flag BOOLEAN;eligible BOOLEAN:=FALSE;
BEGIN
 IF NEW.status='active' THEN
   SELECT enabled INTO flag FROM public.marketplace_feature_flags WHERE key='sponsored_listings';
   IF NOT COALESCE(flag,FALSE) THEN RAISE EXCEPTION 'sponsored_listings_disabled';END IF;
   IF NEW.label<>'Sponsorisé' THEN RAISE EXCEPTION 'sponsored_label_required';END IF;
   IF NEW.provider_type='professional' THEN
     SELECT (p.verification_status='verified' AND p.listing_status='published' AND public.marketplace_professional_subscription_active(p.id)) INTO eligible FROM public.professional_profiles p WHERE p.id=NEW.professional_profile_id;
     IF NOT public.resolve_marketplace_capability(NEW.created_by,'professional.independent.list','professional',NEW.professional_profile_id) THEN RAISE EXCEPTION 'sponsored_owner_not_eligible';END IF;
   ELSE
     SELECT (s.verification_status='verified' AND s.listing_status='published' AND public.marketplace_salon_subscription_active(s.id)) INTO eligible FROM public.salons s WHERE s.id=NEW.salon_id;
     IF NOT public.resolve_marketplace_capability(NEW.created_by,'salon.marketplace.list','salon',NEW.salon_id) THEN RAISE EXCEPTION 'sponsored_owner_not_eligible';END IF;
   END IF;
   IF NOT COALESCE(eligible,FALSE) THEN RAISE EXCEPTION 'sponsored_provider_not_eligible';END IF;
 END IF;
 RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS trg_sponsored_listing_campaign ON public.sponsored_listing_campaigns;
CREATE TRIGGER trg_sponsored_listing_campaign BEFORE INSERT OR UPDATE ON public.sponsored_listing_campaigns FOR EACH ROW EXECUTE FUNCTION public.guard_sponsored_listing_campaign();

CREATE OR REPLACE FUNCTION public.list_active_sponsored_providers(p_provider_type TEXT DEFAULT NULL,p_limit INT DEFAULT 5)
RETURNS TABLE(campaign_id UUID,provider_type TEXT,provider_id UUID,label TEXT) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT c.id,c.provider_type,CASE WHEN c.provider_type='professional' THEN c.professional_profile_id ELSE c.salon_id END,c.label
 FROM public.sponsored_listing_campaigns c
 WHERE EXISTS(SELECT 1 FROM public.marketplace_feature_flags f WHERE f.key='sponsored_listings' AND f.enabled)
   AND c.status='active' AND c.starts_at<=NOW() AND c.ends_at>NOW()
   AND (p_provider_type IS NULL OR p_provider_type='all' OR c.provider_type=p_provider_type)
 ORDER BY c.created_at ASC,c.id ASC LIMIT GREATEST(0,LEAST(COALESCE(p_limit,5),10));
$$;

ALTER TABLE public.sponsored_listing_campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sponsored_listing_campaigns FROM anon,authenticated;
GRANT ALL ON public.sponsored_listing_campaigns TO service_role;
REVOKE ALL ON FUNCTION public.guard_sponsored_listing_campaign(),public.list_active_sponsored_providers(TEXT,INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_sponsored_providers(TEXT,INT) TO service_role;
COMMENT ON TABLE public.sponsored_listing_campaigns IS 'Feature-gated sponsored placements. Organic ranking remains unchanged; every rendered placement must retain the Sponsorisé label.';
