-- Afrofade Database Migration 70: marketplace funnel telemetry
-- BMAD Story 17.1

CREATE TABLE IF NOT EXISTS public.marketplace_funnel_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(60) NOT NULL CHECK(event_type IN (
    'search','style_view','tryon_start','tryon_complete','provider_view','provider_click',
    'booking_started','booking_created','booking_completed','review_submitted',
    'job_view','job_application','subscription_checkout_started','subscription_activated'
  )),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_session_id VARCHAR(80),
  provider_type VARCHAR(20) CHECK(provider_type IS NULL OR provider_type IN ('professional','salon')),
  provider_id UUID,
  style_slug TEXT,
  source VARCHAR(80),
  properties JSONB NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(properties)='object' AND pg_column_size(properties)<=16384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(user_id IS NOT NULL OR anonymous_session_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_marketplace_funnel_event_time ON public.marketplace_funnel_events(event_type,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_funnel_user_time ON public.marketplace_funnel_events(user_id,created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_funnel_session_time ON public.marketplace_funnel_events(anonymous_session_id,created_at DESC) WHERE anonymous_session_id IS NOT NULL;

CREATE OR REPLACE VIEW public.marketplace_funnel_daily AS
SELECT date_trunc('day',created_at) AS day,event_type,count(*)::BIGINT AS event_count,
       count(DISTINCT user_id)::BIGINT AS authenticated_users,
       count(DISTINCT anonymous_session_id)::BIGINT AS anonymous_sessions
FROM public.marketplace_funnel_events
GROUP BY 1,2;

-- Completion events are generated server-side from authoritative business state.
-- Every trigger is best-effort: telemetry must never block booking, review, payment or Try-On persistence.
CREATE OR REPLACE FUNCTION public.track_marketplace_booking_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.marketplace_bookings%ROWTYPE;
BEGIN
  IF NEW.to_status <> 'completed' THEN RETURN NEW; END IF;
  SELECT * INTO b FROM public.marketplace_bookings WHERE id=NEW.booking_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  INSERT INTO public.marketplace_funnel_events(event_type,user_id,provider_type,provider_id,source,properties)
  VALUES('booking_completed',b.customer_user_id,b.target_type,
    CASE WHEN b.target_type='salon' THEN b.salon_id ELSE b.professional_profile_id END,
    'booking_status',jsonb_build_object('serviceId',b.service_id));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_marketplace_booking_completed_telemetry ON public.booking_status_events;
CREATE TRIGGER trg_marketplace_booking_completed_telemetry AFTER INSERT ON public.booking_status_events FOR EACH ROW EXECUTE FUNCTION public.track_marketplace_booking_completed();

CREATE OR REPLACE FUNCTION public.track_marketplace_review_submitted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.marketplace_funnel_events(event_type,user_id,provider_type,provider_id,source,properties)
  VALUES('review_submitted',NEW.reviewer_user_id,NEW.target_type,
    CASE WHEN NEW.target_type='salon' THEN NEW.salon_id ELSE NEW.professional_profile_id END,
    'verified_review',jsonb_build_object('rating',NEW.rating));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_marketplace_review_submitted_telemetry ON public.marketplace_reviews;
CREATE TRIGGER trg_marketplace_review_submitted_telemetry AFTER INSERT ON public.marketplace_reviews FOR EACH ROW EXECUTE FUNCTION public.track_marketplace_review_submitted();

CREATE OR REPLACE FUNCTION public.track_marketplace_subscription_activated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_provider_type TEXT;v_provider_id UUID;
BEGIN
  IF NEW.status <> 'paid' OR NEW.purpose <> 'subscription' OR OLD.status='paid' THEN RETURN NEW; END IF;
  IF NEW.salon_id IS NOT NULL THEN v_provider_type:='salon';v_provider_id:=NEW.salon_id;
  ELSIF COALESCE(NEW.metadata->>'professionalProfileId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_provider_type:='professional';v_provider_id:=(NEW.metadata->>'professionalProfileId')::UUID;
  END IF;
  INSERT INTO public.marketplace_funnel_events(event_type,user_id,provider_type,provider_id,source,properties)
  VALUES('subscription_activated',NEW.user_id,v_provider_type,v_provider_id,'payment_finalization',jsonb_build_object('productId',NEW.product_id));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_marketplace_subscription_activated_telemetry ON public.payment_transactions;
CREATE TRIGGER trg_marketplace_subscription_activated_telemetry AFTER UPDATE OF status ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.track_marketplace_subscription_activated();

CREATE OR REPLACE FUNCTION public.track_marketplace_tryon_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.marketplace_funnel_events(event_type,user_id,style_slug,source,properties)
  VALUES('tryon_complete',NEW.user_id,NULL,'customer_reconstruction',jsonb_build_object('headSavedPermanently',NEW.is_saved_permanently));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_marketplace_tryon_completed_telemetry ON public.customer_heads;
CREATE TRIGGER trg_marketplace_tryon_completed_telemetry AFTER INSERT ON public.customer_heads FOR EACH ROW EXECUTE FUNCTION public.track_marketplace_tryon_completed();

ALTER TABLE public.marketplace_funnel_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketplace_funnel_events FROM anon,authenticated;
GRANT ALL ON public.marketplace_funnel_events TO service_role;
REVOKE ALL ON public.marketplace_funnel_daily FROM anon,authenticated;
GRANT SELECT ON public.marketplace_funnel_daily TO service_role;
REVOKE ALL ON FUNCTION public.track_marketplace_booking_completed(),public.track_marketplace_review_submitted(),public.track_marketplace_subscription_activated(),public.track_marketplace_tryon_completed() FROM PUBLIC;

COMMENT ON TABLE public.marketplace_funnel_events IS 'Privacy-aware product funnel events. Do not store raw IP, precise GPS, email, phone, free-form prompts or asset URLs in properties.';
