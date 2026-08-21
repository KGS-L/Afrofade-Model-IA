-- Afrofade Database Migration 73: marketplace payment abstraction & sponsored listings readiness
-- BMAD Stories 17.4 & 17.5

-- 1. Booking Accounting & Split Fields
ALTER TABLE public.marketplace_bookings ADD COLUMN IF NOT EXISTS platform_fee_amount INT DEFAULT 0;
ALTER TABLE public.marketplace_bookings ADD COLUMN IF NOT EXISTS provider_net_amount INT DEFAULT 0;
ALTER TABLE public.marketplace_bookings ADD COLUMN IF NOT EXISTS psp_reference VARCHAR(128);
ALTER TABLE public.marketplace_bookings ADD COLUMN IF NOT EXISTS psp_settlement_id VARCHAR(128);
ALTER TABLE public.marketplace_bookings ADD COLUMN IF NOT EXISTS psp_provider_account_id VARCHAR(128);
ALTER TABLE public.marketplace_bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(24) NOT NULL DEFAULT 'unpaid';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_bookings_platform_fee_check') THEN
    ALTER TABLE public.marketplace_bookings ADD CONSTRAINT marketplace_bookings_platform_fee_check CHECK (platform_fee_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_bookings_provider_net_check') THEN
    ALTER TABLE public.marketplace_bookings ADD CONSTRAINT marketplace_bookings_provider_net_check CHECK (provider_net_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_bookings_payment_status_check') THEN
    ALTER TABLE public.marketplace_bookings ADD CONSTRAINT marketplace_bookings_payment_status_check CHECK (payment_status IN ('unpaid', 'deposit_paid', 'fully_paid', 'refunded', 'failed'));
  END IF;
END $$;

-- 2. Deterministic Payment Split Helper
CREATE OR REPLACE FUNCTION public.calculate_marketplace_booking_split(
  service_price INT,
  commission_rate_bips INT DEFAULT 1000
) RETURNS TABLE (
  gross_amount INT,
  platform_fee INT,
  provider_net INT
) LANGUAGE plpgsql IMMUTABLE STRICT SET search_path = public AS $$
DECLARE
  calculated_fee INT;
BEGIN
  IF service_price < 0 OR commission_rate_bips < 0 OR commission_rate_bips > 10000 THEN
    RAISE EXCEPTION 'invalid_split_parameters';
  END IF;
  calculated_fee := ROUND((service_price::NUMERIC * commission_rate_bips::NUMERIC) / 10000.0);
  RETURN QUERY SELECT
    service_price AS gross_amount,
    calculated_fee AS platform_fee,
    (service_price - calculated_fee) AS provider_net;
END $$;

-- 3. Update create_marketplace_booking to populate split amounts
CREATE OR REPLACE FUNCTION public.create_marketplace_booking(
  p_service_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_membership_id UUID DEFAULT NULL,
  p_customer_note TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  s public.marketplace_services%ROWTYPE;
  chosen UUID;
  bid UUID;
  initial_status TEXT;
  calc_fee INT;
  calc_net INT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT * INTO s FROM public.marketplace_services WHERE id=p_service_id AND active=TRUE AND booking_enabled=TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_service_unavailable'; END IF;
  IF p_starts_at <= NOW() THEN RAISE EXCEPTION 'booking_must_be_future'; END IF;

  calc_fee := ROUND((s.price_amount::NUMERIC * 1000.0) / 10000.0);
  calc_net := s.price_amount - calc_fee;

  IF s.provider_type='professional' THEN
    initial_status := 'confirmed';
    INSERT INTO public.marketplace_bookings(
      customer_user_id,service_id,target_type,professional_profile_id,status,starts_at,ends_at,
      service_name_snapshot,duration_minutes_snapshot,price_amount_snapshot,currency_snapshot,customer_note,
      platform_fee_amount,provider_net_amount,payment_status
    )
    VALUES(
      auth.uid(),s.id,'professional',s.professional_profile_id,initial_status,p_starts_at,p_starts_at+interval '1 minute',
      s.name,s.duration_minutes,s.price_amount,s.currency,left(p_customer_note,1000),
      calc_fee,calc_net,'unpaid'
    ) RETURNING id INTO bid;
    RETURN bid;
  END IF;

  chosen := p_membership_id;
  IF chosen IS NULL THEN
    SELECT ssp.membership_id INTO chosen
    FROM public.salon_service_professionals ssp
    JOIN public.salon_memberships sm ON sm.id=ssp.membership_id AND sm.status='active' AND sm.role='professional' AND sm.professional_profile_id IS NOT NULL
    WHERE ssp.service_id=s.id
      AND NOT EXISTS (
        SELECT 1 FROM public.marketplace_bookings b
        WHERE b.assigned_professional_profile_id=sm.professional_profile_id
          AND b.status IN ('requested','confirmed')
          AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(p_starts_at,p_starts_at+make_interval(mins=>s.duration_minutes+s.buffer_before_minutes+s.buffer_after_minutes),'[)')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.professional_time_blocks tb
        WHERE tb.professional_profile_id=sm.professional_profile_id
          AND tstzrange(tb.starts_at,tb.ends_at,'[)') && tstzrange(p_starts_at,p_starts_at+make_interval(mins=>s.duration_minutes+s.buffer_before_minutes+s.buffer_after_minutes),'[)')
      )
    ORDER BY sm.created_at ASC LIMIT 1 FOR UPDATE OF sm SKIP LOCKED;
  END IF;
  IF chosen IS NULL THEN RAISE EXCEPTION 'booking_no_professional_available'; END IF;

  SELECT CASE WHEN booking_confirmation_mode='auto' THEN 'confirmed' ELSE 'requested' END INTO initial_status FROM public.salons WHERE id=s.salon_id;
  INSERT INTO public.marketplace_bookings(
    customer_user_id,service_id,target_type,salon_id,assigned_membership_id,status,starts_at,ends_at,
    service_name_snapshot,duration_minutes_snapshot,price_amount_snapshot,currency_snapshot,customer_note,
    platform_fee_amount,provider_net_amount,payment_status
  )
  VALUES(
    auth.uid(),s.id,'salon',s.salon_id,chosen,initial_status,p_starts_at,p_starts_at+interval '1 minute',
    s.name,s.duration_minutes,s.price_amount,s.currency,left(p_customer_note,1000),
    calc_fee,calc_net,'unpaid'
  ) RETURNING id INTO bid;
  RETURN bid;
END $$;

-- 4. Sponsored Listings Campaigns (Story 17.5)
CREATE TABLE IF NOT EXISTS public.marketplace_sponsored_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type VARCHAR(24) NOT NULL CHECK (provider_type IN ('professional', 'salon')),
  provider_id UUID NOT NULL,
  title VARCHAR(120) NOT NULL,
  badge_label VARCHAR(32) NOT NULL DEFAULT 'Sponsorisé',
  budget_fcfa INT NOT NULL CHECK (budget_fcfa >= 0),
  bid_bips INT NOT NULL DEFAULT 100 CHECK (bid_bips >= 0),
  impressions_count INT NOT NULL DEFAULT 0 CHECK (impressions_count >= 0),
  clicks_count INT NOT NULL DEFAULT 0 CHECK (clicks_count >= 0),
  status VARCHAR(24) NOT NULL DEFAULT 'paused' CHECK (status IN ('active', 'paused', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketplace_sponsored_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketplace_sponsored_listings_select_public ON public.marketplace_sponsored_listings;
CREATE POLICY marketplace_sponsored_listings_select_public ON public.marketplace_sponsored_listings
  FOR SELECT TO authenticated, anon USING (status = 'active');

GRANT SELECT ON public.marketplace_sponsored_listings TO anon, authenticated;
GRANT ALL ON public.marketplace_sponsored_listings TO service_role;

COMMENT ON TABLE public.marketplace_sponsored_listings IS 'Story 17.5: Sponsored listings campaigns. Disabled by default via sponsored_listings feature flag.';
