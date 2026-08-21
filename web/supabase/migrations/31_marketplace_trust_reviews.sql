-- Afrofade Database Migration 31: trust, verified reviews and moderation
-- BMAD Stories 15.1, 15.2, 15.4

CREATE TABLE IF NOT EXISTS public.marketplace_verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(20) NOT NULL CHECK(entity_type IN ('professional','salon')),
  professional_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(evidence)='object'),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK((entity_type='professional' AND professional_profile_id IS NOT NULL AND salon_id IS NULL) OR (entity_type='salon' AND salon_id IS NOT NULL AND professional_profile_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_one_pending_pro ON public.marketplace_verification_requests(professional_profile_id) WHERE status='pending' AND professional_profile_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_one_pending_salon ON public.marketplace_verification_requests(salon_id) WHERE status='pending' AND salon_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.marketplace_bookings(id) ON DELETE RESTRICT,
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_type VARCHAR(20) NOT NULL CHECK(target_type IN ('professional','salon')),
  professional_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  moderation_status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK(moderation_status IN ('published','hidden','flagged','removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK((target_type='professional' AND professional_profile_id IS NOT NULL AND salon_id IS NULL) OR (target_type='salon' AND salon_id IS NOT NULL AND professional_profile_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_booking_professional_unique ON public.marketplace_reviews(booking_id,professional_profile_id) WHERE professional_profile_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_booking_salon_unique ON public.marketplace_reviews(booking_id,salon_id) WHERE salon_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_review_professional_published ON public.marketplace_reviews(professional_profile_id,rating) WHERE moderation_status='published';
CREATE INDEX IF NOT EXISTS idx_review_salon_published ON public.marketplace_reviews(salon_id,rating) WHERE moderation_status='published';

CREATE TABLE IF NOT EXISTS public.marketplace_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type VARCHAR(24) NOT NULL CHECK(entity_type IN ('professional','salon','review','portfolio','job')),
  entity_id UUID NOT NULL,
  reason VARCHAR(60) NOT NULL,
  details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_marketplace_reports_status ON public.marketplace_reports(status,created_at);

CREATE TABLE IF NOT EXISTS public.admin_moderation_actions (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(24) NOT NULL,
  entity_id UUID NOT NULL,
  before_state JSONB,
  after_state JSONB,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.submit_verified_review(p_booking_id UUID,p_target_type TEXT,p_rating INT,p_comment TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.marketplace_bookings%ROWTYPE; rid UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT * INTO b FROM public.marketplace_bookings WHERE id=p_booking_id AND customer_user_id=auth.uid();
  IF NOT FOUND OR b.status<>'completed' THEN RAISE EXCEPTION 'review_requires_completed_booking'; END IF;
  IF p_rating<1 OR p_rating>5 THEN RAISE EXCEPTION 'review_rating_invalid'; END IF;
  IF p_target_type='professional' THEN
    IF b.assigned_professional_profile_id IS NULL THEN RAISE EXCEPTION 'review_target_invalid'; END IF;
    INSERT INTO public.marketplace_reviews(booking_id,reviewer_user_id,target_type,professional_profile_id,rating,comment)
    VALUES(b.id,auth.uid(),'professional',b.assigned_professional_profile_id,p_rating,left(p_comment,3000)) RETURNING id INTO rid;
  ELSIF p_target_type='salon' THEN
    IF b.salon_id IS NULL THEN RAISE EXCEPTION 'review_target_invalid'; END IF;
    INSERT INTO public.marketplace_reviews(booking_id,reviewer_user_id,target_type,salon_id,rating,comment)
    VALUES(b.id,auth.uid(),'salon',b.salon_id,p_rating,left(p_comment,3000)) RETURNING id INTO rid;
  ELSE RAISE EXCEPTION 'review_target_invalid'; END IF;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.submit_marketplace_report(p_entity_type TEXT,p_entity_id UUID,p_reason TEXT,p_details TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF p_entity_type NOT IN ('professional','salon','review','portfolio','job') OR btrim(COALESCE(p_reason,''))='' THEN RAISE EXCEPTION 'report_invalid'; END IF;
  INSERT INTO public.marketplace_reports(reporter_user_id,entity_type,entity_id,reason,details) VALUES(auth.uid(),p_entity_type,p_entity_id,left(p_reason,60),left(p_details,3000)) RETURNING id INTO rid;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_marketplace_entity_state(p_entity_type TEXT,p_entity_id UUID,p_verification TEXT,p_listing TEXT,p_note TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE before_json JSONB; after_json JSONB;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'admin_required'; END IF;
  IF p_verification NOT IN ('unverified','pending','verified','rejected','suspended') OR p_listing NOT IN ('draft','published','paused','suspended') THEN RAISE EXCEPTION 'state_invalid'; END IF;
  IF p_entity_type='professional' THEN
    SELECT to_jsonb(p) INTO before_json FROM public.professional_profiles p WHERE id=p_entity_id FOR UPDATE;
    IF before_json IS NULL THEN RAISE EXCEPTION 'entity_not_found'; END IF;
    UPDATE public.professional_profiles SET verification_status=p_verification,listing_status=p_listing,updated_at=NOW() WHERE id=p_entity_id RETURNING to_jsonb(professional_profiles.*) INTO after_json;
  ELSIF p_entity_type='salon' THEN
    SELECT to_jsonb(s) INTO before_json FROM public.salons s WHERE id=p_entity_id FOR UPDATE;
    IF before_json IS NULL THEN RAISE EXCEPTION 'entity_not_found'; END IF;
    UPDATE public.salons SET verification_status=p_verification,listing_status=p_listing,updated_at=NOW() WHERE id=p_entity_id RETURNING to_jsonb(salons.*) INTO after_json;
  ELSE RAISE EXCEPTION 'entity_type_invalid'; END IF;
  INSERT INTO public.admin_moderation_actions(admin_user_id,action,entity_type,entity_id,before_state,after_state,note) VALUES(auth.uid(),'set_listing_state',p_entity_type,p_entity_id,before_json,after_json,left(p_note,2000));
  RETURN TRUE;
END $$;

CREATE OR REPLACE VIEW public.marketplace_review_aggregates AS
SELECT 'professional'::TEXT AS target_type,professional_profile_id AS target_id,round(avg(rating)::numeric,2) AS average_rating,count(*)::BIGINT AS review_count
FROM public.marketplace_reviews WHERE moderation_status='published' AND professional_profile_id IS NOT NULL GROUP BY professional_profile_id
UNION ALL
SELECT 'salon'::TEXT,salon_id,round(avg(rating)::numeric,2),count(*)::BIGINT
FROM public.marketplace_reviews WHERE moderation_status='published' AND salon_id IS NOT NULL GROUP BY salon_id;

ALTER TABLE public.marketplace_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_moderation_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reviews_public_published ON public.marketplace_reviews;
CREATE POLICY reviews_public_published ON public.marketplace_reviews FOR SELECT USING(moderation_status='published');
DROP POLICY IF EXISTS reports_own_select ON public.marketplace_reports;
CREATE POLICY reports_own_select ON public.marketplace_reports FOR SELECT TO authenticated USING(reporter_user_id=auth.uid());
REVOKE ALL ON public.marketplace_verification_requests,public.marketplace_reports,public.admin_moderation_actions FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.marketplace_reviews FROM anon,authenticated;
GRANT SELECT ON public.marketplace_reviews TO anon,authenticated;
GRANT SELECT ON public.marketplace_reports TO authenticated;
GRANT ALL ON public.marketplace_verification_requests,public.marketplace_reviews,public.marketplace_reports,public.admin_moderation_actions TO service_role;
GRANT SELECT ON public.marketplace_review_aggregates TO anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.submit_verified_review(UUID,TEXT,INT,TEXT),public.submit_marketplace_report(TEXT,UUID,TEXT,TEXT),public.admin_set_marketplace_entity_state(TEXT,UUID,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_verified_review(UUID,TEXT,INT,TEXT),public.submit_marketplace_report(TEXT,UUID,TEXT,TEXT) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_marketplace_entity_state(TEXT,UUID,TEXT,TEXT,TEXT) TO authenticated,service_role;
