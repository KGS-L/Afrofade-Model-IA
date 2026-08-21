-- Afrofade Database Migration 27: PostGIS provider location + privacy separation
-- BMAD Story 13.4

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE public.salons
    ADD COLUMN IF NOT EXISTS public_location geography(Point,4326),
    ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

ALTER TABLE public.professional_profiles
    ADD COLUMN IF NOT EXISTS public_location geography(Point,4326),
    ADD COLUMN IF NOT EXISTS service_area_center geography(Point,4326),
    ADD COLUMN IF NOT EXISTS location_visibility VARCHAR(24) NOT NULL DEFAULT 'city',
    ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname='professional_profiles_location_visibility_check'
          AND conrelid='public.professional_profiles'::regclass
    ) THEN
        ALTER TABLE public.professional_profiles
          ADD CONSTRAINT professional_profiles_location_visibility_check
          CHECK (location_visibility IN ('hidden','city','neighborhood','approximate','precise'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.professional_private_locations (
    professional_profile_id UUID PRIMARY KEY REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exact_location geography(Point,4326),
    address_line1 TEXT,
    address_line2 TEXT,
    city VARCHAR(120),
    neighborhood VARCHAR(160),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT professional_private_location_owner_fk
      FOREIGN KEY(professional_profile_id,owner_user_id)
      REFERENCES public.professional_profiles(id,user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_salons_public_location_gist ON public.salons USING GIST(public_location);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_public_location_gist ON public.professional_profiles USING GIST(public_location);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_service_area_gist ON public.professional_profiles USING GIST(service_area_center);
CREATE INDEX IF NOT EXISTS idx_professional_private_location_gist ON public.professional_private_locations USING GIST(exact_location);

ALTER TABLE public.professional_private_locations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.professional_private_locations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.professional_private_locations TO service_role;

CREATE OR REPLACE FUNCTION public.marketplace_set_professional_location(
    p_actor_user_id UUID,
    p_professional_profile_id UUID,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_visibility TEXT,
    p_city TEXT,
    p_neighborhood TEXT,
    p_address_line1 TEXT,
    p_address_line2 TEXT,
    p_service_radius_m INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE v_point geography(Point,4326); v_public geography(Point,4326); v_center geography(Point,4326);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.professional_profiles WHERE id=p_professional_profile_id AND user_id=p_actor_user_id) THEN
        RAISE EXCEPTION 'professional_location_owner_mismatch';
    END IF;
    IF p_visibility NOT IN ('hidden','city','neighborhood','approximate','precise') THEN RAISE EXCEPTION 'professional_location_visibility_invalid'; END IF;
    IF p_lat IS NOT NULL OR p_lng IS NOT NULL THEN
        IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN
            RAISE EXCEPTION 'professional_location_coordinates_invalid';
        END IF;
        v_point := ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography;
    END IF;
    IF p_service_radius_m IS NOT NULL AND (p_service_radius_m < 0 OR p_service_radius_m > 500000) THEN RAISE EXCEPTION 'professional_service_radius_invalid'; END IF;

    INSERT INTO public.professional_private_locations(professional_profile_id,owner_user_id,exact_location,address_line1,address_line2,city,neighborhood,updated_at)
    VALUES(p_professional_profile_id,p_actor_user_id,v_point,NULLIF(btrim(p_address_line1),''),NULLIF(btrim(p_address_line2),''),NULLIF(btrim(p_city),''),NULLIF(btrim(p_neighborhood),''),NOW())
    ON CONFLICT(professional_profile_id) DO UPDATE SET
      owner_user_id=EXCLUDED.owner_user_id,exact_location=EXCLUDED.exact_location,address_line1=EXCLUDED.address_line1,address_line2=EXCLUDED.address_line2,
      city=EXCLUDED.city,neighborhood=EXCLUDED.neighborhood,updated_at=NOW();

    -- Precise explicitly publishes the exact point. Approximate publishes a deterministic
    -- rounded point (~1 km scale) rather than the private home coordinate. Hidden/city/neighborhood publish no point.
    IF p_visibility='precise' THEN
      v_public := v_point;
    ELSIF p_visibility='approximate' AND v_point IS NOT NULL THEN
      v_public := ST_SetSRID(ST_MakePoint(round(ST_X(v_point::geometry)::numeric,2)::double precision,round(ST_Y(v_point::geometry)::numeric,2)::double precision),4326)::geography;
    ELSE
      v_public := NULL;
    END IF;
    v_center := CASE WHEN p_visibility IN ('approximate','precise') THEN v_public ELSE NULL END;

    UPDATE public.professional_profiles
    SET city=NULLIF(btrim(p_city),''),neighborhood=NULLIF(btrim(p_neighborhood),''),
        service_radius_m=p_service_radius_m,location_visibility=p_visibility,
        public_location=v_public,service_area_center=v_center,location_updated_at=NOW(),updated_at=NOW()
    WHERE id=p_professional_profile_id;

    RETURN jsonb_build_object('visibility',p_visibility,'has_public_point',v_public IS NOT NULL,'city',NULLIF(btrim(p_city),''),'neighborhood',NULLIF(btrim(p_neighborhood),''));
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_set_salon_public_location(
    p_actor_user_id UUID,
    p_salon_id UUID,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
BEGIN
    IF NOT public.marketplace_can_manage_salon(p_actor_user_id,p_salon_id) THEN RAISE EXCEPTION 'salon_location_manage_forbidden'; END IF;
    IF p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'salon_location_coordinates_invalid'; END IF;
    UPDATE public.salons SET public_location=ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography,location_updated_at=NOW(),updated_at=NOW() WHERE id=p_salon_id;
    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.marketplace_set_professional_location(UUID,UUID,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,TEXT,TEXT,TEXT,INT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.marketplace_set_salon_public_location(UUID,UUID,DOUBLE PRECISION,DOUBLE PRECISION) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_set_professional_location(UUID,UUID,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,TEXT,TEXT,TEXT,INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketplace_set_salon_public_location(UUID,UUID,DOUBLE PRECISION,DOUBLE PRECISION) TO service_role;
