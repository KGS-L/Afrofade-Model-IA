-- Afrofade Database Migration 42: saved looks + booking visual brief
-- BMAD Story 14.7

CREATE TABLE IF NOT EXISTS public.saved_looks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_head_id UUID REFERENCES public.customer_heads(id) ON DELETE SET NULL,
  legacy_style_id VARCHAR(100) REFERENCES public.hairstyles_catalog(id) ON DELETE SET NULL,
  taxonomy_id UUID REFERENCES public.hair_taxonomy(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  customization JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(customization)='object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_looks_user ON public.saved_looks(user_id,created_at DESC);
ALTER TABLE public.marketplace_bookings ADD COLUMN IF NOT EXISTS saved_look_id UUID REFERENCES public.saved_looks(id) ON DELETE SET NULL;
ALTER TABLE public.marketplace_bookings ADD COLUMN IF NOT EXISTS visual_brief_snapshot JSONB CHECK (visual_brief_snapshot IS NULL OR jsonb_typeof(visual_brief_snapshot)='object');

CREATE OR REPLACE FUNCTION public.attach_saved_look_to_booking(p_booking_id UUID,p_saved_look_id UUID)
RETURNS public.marketplace_bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.marketplace_bookings%ROWTYPE; l public.saved_looks%ROWTYPE; style_label TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT * INTO b FROM public.marketplace_bookings WHERE id=p_booking_id AND customer_user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_owned'; END IF;
  IF b.status NOT IN ('requested','confirmed') THEN RAISE EXCEPTION 'booking_visual_brief_locked'; END IF;
  SELECT * INTO l FROM public.saved_looks WHERE id=p_saved_look_id AND user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'saved_look_not_owned'; END IF;
  SELECT COALESCE(t.label_fr,h.name,l.title) INTO style_label FROM public.saved_looks x LEFT JOIN public.hair_taxonomy t ON t.id=x.taxonomy_id LEFT JOIN public.hairstyles_catalog h ON h.id=x.legacy_style_id WHERE x.id=l.id;
  UPDATE public.marketplace_bookings SET saved_look_id=l.id,visual_brief_snapshot=jsonb_build_object('title',l.title,'style',COALESCE(style_label,l.title),'legacyStyleId',l.legacy_style_id,'taxonomyId',l.taxonomy_id,'customization',l.customization),updated_at=NOW() WHERE id=b.id RETURNING * INTO b;
  RETURN b;
END $$;
CREATE OR REPLACE FUNCTION public.enforce_saved_look_head_ownership() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$BEGIN IF NEW.customer_head_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customer_heads h WHERE h.id=NEW.customer_head_id AND h.user_id=NEW.user_id) THEN RAISE EXCEPTION 'saved_look_head_not_owned'; END IF;RETURN NEW;END$$;
DROP TRIGGER IF EXISTS trg_saved_look_head_ownership ON public.saved_looks;
CREATE TRIGGER trg_saved_look_head_ownership BEFORE INSERT OR UPDATE OF user_id,customer_head_id ON public.saved_looks FOR EACH ROW EXECUTE FUNCTION public.enforce_saved_look_head_ownership();
ALTER TABLE public.saved_looks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saved_looks_own_select ON public.saved_looks; CREATE POLICY saved_looks_own_select ON public.saved_looks FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS saved_looks_own_insert ON public.saved_looks; CREATE POLICY saved_looks_own_insert ON public.saved_looks FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS saved_looks_own_update ON public.saved_looks; CREATE POLICY saved_looks_own_update ON public.saved_looks FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS saved_looks_own_delete ON public.saved_looks; CREATE POLICY saved_looks_own_delete ON public.saved_looks FOR DELETE TO authenticated USING(user_id=auth.uid());
REVOKE ALL ON public.saved_looks FROM anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.saved_looks TO authenticated; GRANT ALL ON public.saved_looks TO service_role;
REVOKE ALL ON FUNCTION public.attach_saved_look_to_booking(UUID,UUID) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.attach_saved_look_to_booking(UUID,UUID) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_saved_look_head_ownership() FROM PUBLIC;
