-- Afrofade Database Migration 52: fix audit snapshot capture for marketplace moderation

CREATE OR REPLACE FUNCTION public.admin_set_marketplace_entity_state(p_entity_type TEXT,p_entity_id UUID,p_verification TEXT,p_listing TEXT,p_note TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE before_json JSONB;after_json JSONB;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'admin_required';END IF;
  IF p_verification NOT IN ('unverified','pending','verified','rejected','suspended') OR p_listing NOT IN ('draft','published','paused','suspended') THEN RAISE EXCEPTION 'state_invalid';END IF;
  IF p_entity_type='professional' THEN
    SELECT to_jsonb(p) INTO before_json FROM public.professional_profiles p WHERE id=p_entity_id FOR UPDATE;
    IF before_json IS NULL THEN RAISE EXCEPTION 'entity_not_found';END IF;
    UPDATE public.professional_profiles SET verification_status=p_verification,listing_status=p_listing,updated_at=NOW() WHERE id=p_entity_id;
    SELECT to_jsonb(p) INTO after_json FROM public.professional_profiles p WHERE id=p_entity_id;
  ELSIF p_entity_type='salon' THEN
    SELECT to_jsonb(s) INTO before_json FROM public.salons s WHERE id=p_entity_id FOR UPDATE;
    IF before_json IS NULL THEN RAISE EXCEPTION 'entity_not_found';END IF;
    UPDATE public.salons SET verification_status=p_verification,listing_status=p_listing,updated_at=NOW() WHERE id=p_entity_id;
    SELECT to_jsonb(s) INTO after_json FROM public.salons s WHERE id=p_entity_id;
  ELSE RAISE EXCEPTION 'entity_type_invalid';END IF;
  INSERT INTO public.admin_moderation_actions(admin_user_id,action,entity_type,entity_id,before_state,after_state,note)
  VALUES(auth.uid(),'set_listing_state',p_entity_type,p_entity_id,before_json,after_json,left(p_note,2000));
  RETURN TRUE;
END$$;
REVOKE ALL ON FUNCTION public.admin_set_marketplace_entity_state(TEXT,UUID,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_marketplace_entity_state(TEXT,UUID,TEXT,TEXT,TEXT) TO authenticated,service_role;
