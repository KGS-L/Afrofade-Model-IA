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

ALTER TABLE public.marketplace_funnel_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketplace_funnel_events FROM anon,authenticated;
GRANT ALL ON public.marketplace_funnel_events TO service_role;
REVOKE ALL ON public.marketplace_funnel_daily FROM anon,authenticated;
GRANT SELECT ON public.marketplace_funnel_daily TO service_role;

COMMENT ON TABLE public.marketplace_funnel_events IS 'Privacy-aware product funnel events. Do not store raw IP, precise GPS, email, phone, free-form prompts or asset URLs in properties.';
