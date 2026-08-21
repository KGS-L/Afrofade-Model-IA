-- Afrofade Database Migration 41: booking operations + notification outbox
-- BMAD Stories 14.5 and 14.6

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id BIGSERIAL PRIMARY KEY,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(80) NOT NULL,
  aggregate_type VARCHAR(40) NOT NULL,
  aggregate_id UUID NOT NULL,
  source_event_id BIGINT REFERENCES public.booking_status_events(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload)='object'),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','cancelled')),
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts>=0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recipient_user_id,source_event_id,event_type)
);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON public.notification_outbox(status,available_at) WHERE status IN ('pending','failed');

CREATE OR REPLACE FUNCTION public.enqueue_booking_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.marketplace_bookings%ROWTYPE; pro_user UUID;
BEGIN
  SELECT * INTO b FROM public.marketplace_bookings WHERE id=NEW.booking_id;
  INSERT INTO public.notification_outbox(recipient_user_id,event_type,aggregate_type,aggregate_id,source_event_id,payload)
  VALUES(b.customer_user_id,'booking.'||NEW.to_status,'booking',b.id,NEW.id,jsonb_build_object('bookingId',b.id,'status',NEW.to_status,'startsAt',b.starts_at,'service',b.service_name_snapshot))
  ON CONFLICT DO NOTHING;
  IF b.assigned_professional_profile_id IS NOT NULL THEN
    SELECT user_id INTO pro_user FROM public.professional_profiles WHERE id=b.assigned_professional_profile_id;
    IF pro_user IS NOT NULL AND pro_user IS DISTINCT FROM b.customer_user_id THEN
      INSERT INTO public.notification_outbox(recipient_user_id,event_type,aggregate_type,aggregate_id,source_event_id,payload)
      VALUES(pro_user,'booking.'||NEW.to_status,'booking',b.id,NEW.id,jsonb_build_object('bookingId',b.id,'status',NEW.to_status,'startsAt',b.starts_at,'service',b.service_name_snapshot)) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  IF b.salon_id IS NOT NULL THEN
    INSERT INTO public.notification_outbox(recipient_user_id,event_type,aggregate_type,aggregate_id,source_event_id,payload)
    SELECT DISTINCT sm.user_id,'booking.'||NEW.to_status,'booking',b.id,NEW.id,jsonb_build_object('bookingId',b.id,'status',NEW.to_status,'startsAt',b.starts_at,'service',b.service_name_snapshot)
    FROM public.salon_memberships sm WHERE sm.salon_id=b.salon_id AND sm.status='active' AND sm.role IN ('owner','manager') AND sm.user_id IS DISTINCT FROM b.customer_user_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enqueue_booking_notifications ON public.booking_status_events;
CREATE TRIGGER trg_enqueue_booking_notifications AFTER INSERT ON public.booking_status_events FOR EACH ROW EXECUTE FUNCTION public.enqueue_booking_notifications();

CREATE OR REPLACE FUNCTION public.transition_marketplace_booking(p_booking_id UUID,p_to_status TEXT,p_note TEXT DEFAULT NULL)
RETURNS public.marketplace_bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.marketplace_bookings%ROWTYPE; allowed BOOLEAN:=FALSE; member public.salon_memberships%ROWTYPE; pro UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT * INTO b FROM public.marketplace_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF p_to_status NOT IN ('confirmed','cancelled_by_customer','cancelled_by_provider','completed','no_show_customer','no_show_provider','rejected') THEN RAISE EXCEPTION 'booking_transition_invalid'; END IF;
  IF b.customer_user_id=auth.uid() THEN allowed := p_to_status='cancelled_by_customer' AND b.status IN ('requested','confirmed');
  ELSE
    IF b.target_type='professional' THEN SELECT id INTO pro FROM public.professional_profiles WHERE id=b.professional_profile_id AND user_id=auth.uid(); allowed := pro IS NOT NULL;
    ELSE SELECT * INTO member FROM public.salon_memberships WHERE salon_id=b.salon_id AND user_id=auth.uid() AND status='active' AND role IN ('owner','manager','professional') LIMIT 1; allowed := FOUND AND (member.role IN ('owner','manager') OR member.professional_profile_id=b.assigned_professional_profile_id); END IF;
    IF allowed THEN allowed := CASE b.status WHEN 'requested' THEN p_to_status IN ('confirmed','rejected','cancelled_by_provider') WHEN 'confirmed' THEN p_to_status IN ('completed','cancelled_by_provider','no_show_customer','no_show_provider') ELSE FALSE END; END IF;
  END IF;
  IF NOT allowed THEN RAISE EXCEPTION 'booking_transition_forbidden'; END IF;
  UPDATE public.marketplace_bookings SET status=p_to_status,updated_at=NOW() WHERE id=b.id RETURNING * INTO b;
  IF p_note IS NOT NULL AND btrim(p_note)<>'' THEN UPDATE public.booking_status_events SET note=left(p_note,1000) WHERE id=(SELECT max(id) FROM public.booking_status_events WHERE booking_id=b.id); END IF;
  RETURN b;
END $$;

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_outbox_recipient_select ON public.notification_outbox;
CREATE POLICY notification_outbox_recipient_select ON public.notification_outbox FOR SELECT TO authenticated USING(recipient_user_id=auth.uid());
REVOKE ALL ON public.notification_outbox FROM anon,authenticated;
GRANT SELECT ON public.notification_outbox TO authenticated;
GRANT ALL ON public.notification_outbox TO service_role;
REVOKE ALL ON FUNCTION public.transition_marketplace_booking(UUID,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_marketplace_booking(UUID,TEXT,TEXT) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.enqueue_booking_notifications() FROM PUBLIC;
