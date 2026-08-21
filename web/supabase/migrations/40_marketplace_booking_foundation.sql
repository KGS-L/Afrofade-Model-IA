-- Afrofade Database Migration 40: scheduling + concurrency-safe marketplace booking
-- BMAD Stories 14.1, 14.2 and 14.3

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.professional_availability_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  local_start TIME NOT NULL,
  local_end TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Ouagadougou',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (local_end > local_start)
);
CREATE INDEX IF NOT EXISTS idx_availability_rules_profile ON public.professional_availability_rules(professional_profile_id, salon_id, weekday) WHERE active=TRUE;

CREATE TABLE IF NOT EXISTS public.professional_time_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_time_blocks_profile_range ON public.professional_time_blocks USING gist (professional_profile_id, tstzrange(starts_at,ends_at,'[)'));

CREATE TABLE IF NOT EXISTS public.marketplace_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.marketplace_services(id) ON DELETE RESTRICT,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('professional','salon')),
  salon_id UUID REFERENCES public.salons(id) ON DELETE RESTRICT,
  professional_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE RESTRICT,
  assigned_membership_id UUID REFERENCES public.salon_memberships(id) ON DELETE SET NULL,
  assigned_professional_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('requested','confirmed','cancelled_by_customer','cancelled_by_provider','completed','no_show_customer','no_show_provider','rejected','expired')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  service_name_snapshot VARCHAR(180) NOT NULL,
  duration_minutes_snapshot INT NOT NULL CHECK (duration_minutes_snapshot BETWEEN 5 AND 1440),
  price_amount_snapshot INT NOT NULL CHECK (price_amount_snapshot >= 0),
  currency_snapshot VARCHAR(3) NOT NULL,
  customer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at),
  CHECK (
    (target_type='professional' AND professional_profile_id IS NOT NULL AND salon_id IS NULL)
    OR (target_type='salon' AND salon_id IS NOT NULL AND professional_profile_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.marketplace_bookings(customer_user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_salon ON public.marketplace_bookings(salon_id, starts_at) WHERE salon_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_profile ON public.marketplace_bookings(assigned_professional_profile_id, starts_at) WHERE assigned_professional_profile_id IS NOT NULL;

ALTER TABLE public.marketplace_bookings
  ADD CONSTRAINT marketplace_bookings_no_professional_overlap
  EXCLUDE USING gist (
    assigned_professional_profile_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (assigned_professional_profile_id IS NOT NULL AND status IN ('requested','confirmed'));

CREATE TABLE IF NOT EXISTS public.booking_status_events (
  id BIGSERIAL PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.marketplace_bookings(id) ON DELETE CASCADE,
  from_status VARCHAR(32),
  to_status VARCHAR(32) NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_events_booking ON public.booking_status_events(booking_id, created_at);

CREATE OR REPLACE FUNCTION public.enforce_marketplace_booking_context()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
DECLARE s public.marketplace_services%ROWTYPE; m public.salon_memberships%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.marketplace_services WHERE id=NEW.service_id AND active=TRUE AND booking_enabled=TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_service_unavailable'; END IF;
  IF TG_OP='INSERT' THEN
    NEW.service_name_snapshot := s.name;
    NEW.duration_minutes_snapshot := s.duration_minutes;
    NEW.price_amount_snapshot := s.price_amount;
    NEW.currency_snapshot := s.currency;
    NEW.ends_at := NEW.starts_at + make_interval(mins=>s.duration_minutes+s.buffer_before_minutes+s.buffer_after_minutes);
  END IF;
  IF s.provider_type='professional' THEN
    IF NEW.target_type<>'professional' OR NEW.professional_profile_id IS DISTINCT FROM s.professional_profile_id OR NEW.salon_id IS NOT NULL THEN RAISE EXCEPTION 'booking_target_mismatch'; END IF;
    NEW.assigned_professional_profile_id := s.professional_profile_id;
    NEW.assigned_membership_id := NULL;
  ELSE
    IF NEW.target_type<>'salon' OR NEW.salon_id IS DISTINCT FROM s.salon_id OR NEW.professional_profile_id IS NOT NULL THEN RAISE EXCEPTION 'booking_target_mismatch'; END IF;
    IF NEW.assigned_membership_id IS NOT NULL THEN
      SELECT * INTO m FROM public.salon_memberships WHERE id=NEW.assigned_membership_id AND salon_id=NEW.salon_id AND role='professional' AND status='active';
      IF NOT FOUND OR m.professional_profile_id IS NULL THEN RAISE EXCEPTION 'booking_assignment_invalid'; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.salon_service_professionals x WHERE x.service_id=NEW.service_id AND x.membership_id=m.id) THEN RAISE EXCEPTION 'booking_assignment_not_eligible'; END IF;
      NEW.assigned_professional_profile_id := m.professional_profile_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_marketplace_booking_context ON public.marketplace_bookings;
CREATE TRIGGER trg_marketplace_booking_context BEFORE INSERT OR UPDATE OF service_id,target_type,salon_id,professional_profile_id,assigned_membership_id,starts_at ON public.marketplace_bookings FOR EACH ROW EXECUTE FUNCTION public.enforce_marketplace_booking_context();

CREATE OR REPLACE FUNCTION public.log_booking_status_event()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_status_events(booking_id,from_status,to_status,actor_user_id)
    VALUES(NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,auth.uid());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_booking_status_event ON public.marketplace_bookings;
CREATE TRIGGER trg_booking_status_event AFTER INSERT OR UPDATE OF status ON public.marketplace_bookings FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_event();

CREATE OR REPLACE FUNCTION public.create_marketplace_booking(
  p_service_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_membership_id UUID DEFAULT NULL,
  p_customer_note TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.marketplace_services%ROWTYPE; chosen UUID; bid UUID; initial_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT * INTO s FROM public.marketplace_services WHERE id=p_service_id AND active=TRUE AND booking_enabled=TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_service_unavailable'; END IF;
  IF p_starts_at <= NOW() THEN RAISE EXCEPTION 'booking_must_be_future'; END IF;

  IF s.provider_type='professional' THEN
    initial_status := 'confirmed';
    INSERT INTO public.marketplace_bookings(customer_user_id,service_id,target_type,professional_profile_id,status,starts_at,ends_at,service_name_snapshot,duration_minutes_snapshot,price_amount_snapshot,currency_snapshot,customer_note)
    VALUES(auth.uid(),s.id,'professional',s.professional_profile_id,initial_status,p_starts_at,p_starts_at+interval '1 minute',s.name,s.duration_minutes,s.price_amount,s.currency,left(p_customer_note,1000)) RETURNING id INTO bid;
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
  INSERT INTO public.marketplace_bookings(customer_user_id,service_id,target_type,salon_id,assigned_membership_id,status,starts_at,ends_at,service_name_snapshot,duration_minutes_snapshot,price_amount_snapshot,currency_snapshot,customer_note)
  VALUES(auth.uid(),s.id,'salon',s.salon_id,chosen,initial_status,p_starts_at,p_starts_at+interval '1 minute',s.name,s.duration_minutes,s.price_amount,s.currency,left(p_customer_note,1000)) RETURNING id INTO bid;
  RETURN bid;
END $$;

CREATE OR REPLACE FUNCTION public.list_service_availability(p_service_id UUID,p_from TIMESTAMPTZ,p_to TIMESTAMPTZ)
RETURNS TABLE(starts_at TIMESTAMPTZ, available_professionals INT) LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  WITH s AS (SELECT * FROM public.marketplace_services WHERE id=p_service_id AND active=TRUE AND booking_enabled=TRUE),
  slots AS (
    SELECT gs AS starts_at FROM s, LATERAL generate_series(p_from,p_to,interval '30 minutes') gs
    WHERE gs>NOW()
  ),
  candidates AS (
    SELECT sl.starts_at, CASE WHEN s.provider_type='professional' THEN s.professional_profile_id ELSE sm.professional_profile_id END AS pid, s.*
    FROM slots sl CROSS JOIN s
    LEFT JOIN public.salon_service_professionals ssp ON s.provider_type='salon' AND ssp.service_id=s.id
    LEFT JOIN public.salon_memberships sm ON sm.id=ssp.membership_id AND sm.status='active' AND sm.role='professional'
  )
  SELECT c.starts_at, count(DISTINCT c.pid)::INT
  FROM candidates c
  WHERE c.pid IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.professional_availability_rules ar
      WHERE ar.professional_profile_id=c.pid AND ar.active=TRUE
        AND (ar.salon_id IS NULL OR ar.salon_id=c.salon_id)
        AND ar.weekday=EXTRACT(DOW FROM c.starts_at AT TIME ZONE ar.timezone)::INT
        AND (c.starts_at AT TIME ZONE ar.timezone)::TIME >= ar.local_start
        AND ((c.starts_at+make_interval(mins=>c.duration_minutes+c.buffer_before_minutes+c.buffer_after_minutes)) AT TIME ZONE ar.timezone)::TIME <= ar.local_end
    )
    AND NOT EXISTS (SELECT 1 FROM public.professional_time_blocks tb WHERE tb.professional_profile_id=c.pid AND tstzrange(tb.starts_at,tb.ends_at,'[)') && tstzrange(c.starts_at,c.starts_at+make_interval(mins=>c.duration_minutes+c.buffer_before_minutes+c.buffer_after_minutes),'[)'))
    AND NOT EXISTS (SELECT 1 FROM public.marketplace_bookings b WHERE b.assigned_professional_profile_id=c.pid AND b.status IN ('requested','confirmed') AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(c.starts_at,c.starts_at+make_interval(mins=>c.duration_minutes+c.buffer_before_minutes+c.buffer_after_minutes),'[)'))
  GROUP BY c.starts_at ORDER BY c.starts_at;
$$;

ALTER TABLE public.professional_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketplace_bookings_customer_select ON public.marketplace_bookings;
CREATE POLICY marketplace_bookings_customer_select ON public.marketplace_bookings FOR SELECT TO authenticated USING(customer_user_id=auth.uid());
REVOKE ALL ON public.professional_availability_rules,public.professional_time_blocks,public.marketplace_bookings,public.booking_status_events FROM anon,authenticated;
GRANT SELECT ON public.marketplace_bookings TO authenticated;
GRANT ALL ON public.professional_availability_rules,public.professional_time_blocks,public.marketplace_bookings,public.booking_status_events TO service_role;
REVOKE ALL ON FUNCTION public.create_marketplace_booking(UUID,TIMESTAMPTZ,UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_marketplace_booking(UUID,TIMESTAMPTZ,UUID,TEXT) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.list_service_availability(UUID,TIMESTAMPTZ,TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_service_availability(UUID,TIMESTAMPTZ,TIMESTAMPTZ) TO anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_marketplace_booking_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_booking_status_event() FROM PUBLIC;
