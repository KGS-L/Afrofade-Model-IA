-- Afrofade Database Migration 28: public marketplace discovery projection + ranking V1
-- BMAD Stories 13.5 and 13.6

CREATE OR REPLACE FUNCTION public.search_marketplace_providers(
    p_query TEXT DEFAULT NULL,
    p_style_slug TEXT DEFAULT NULL,
    p_provider_type TEXT DEFAULT NULL,
    p_lat DOUBLE PRECISION DEFAULT NULL,
    p_lng DOUBLE PRECISION DEFAULT NULL,
    p_radius_m INT DEFAULT 25000,
    p_city TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
) RETURNS TABLE(
    provider_type TEXT,
    provider_id UUID,
    slug TEXT,
    display_name TEXT,
    city TEXT,
    neighborhood TEXT,
    distance_m DOUBLE PRECISION,
    matched_service_id UUID,
    matched_service_name TEXT,
    matched_service_price INT,
    currency TEXT,
    matched_style_slug TEXT,
    rank_score DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
WITH input AS (
    SELECT
      NULLIF(btrim(p_query),'') AS q,
      NULLIF(lower(btrim(p_style_slug)),'') AS style_slug,
      CASE WHEN p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180
           THEN ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography ELSE NULL END AS user_point,
      GREATEST(1000,LEAST(COALESCE(p_radius_m,25000),500000)) AS radius_m,
      NULLIF(lower(btrim(p_city)),'') AS city,
      GREATEST(1,LEAST(COALESCE(p_limit,20),50)) AS page_limit,
      GREATEST(COALESCE(p_offset,0),0) AS page_offset
),
salon_candidates AS (
    SELECT
      'salon'::TEXT AS provider_type,
      s.id AS provider_id,
      s.slug,
      s.name::TEXT AS display_name,
      s.city::TEXT,
      s.neighborhood::TEXT,
      CASE WHEN i.user_point IS NOT NULL AND s.public_location IS NOT NULL
           THEN ST_Distance(s.public_location,i.user_point) ELSE NULL END AS distance_m,
      svc.id AS matched_service_id,
      svc.name::TEXT AS matched_service_name,
      svc.price_amount AS matched_service_price,
      svc.currency::TEXT,
      style.slug::TEXT AS matched_style_slug,
      (CASE WHEN i.style_slug IS NOT NULL AND style.slug=i.style_slug THEN 100 ELSE 0 END
       + CASE WHEN i.q IS NOT NULL AND (s.name ILIKE '%'||i.q||'%' OR svc.name ILIKE '%'||i.q||'%') THEN 30 ELSE 0 END
       + CASE WHEN i.city IS NOT NULL AND lower(COALESCE(s.city,''))=i.city THEN 20 ELSE 0 END
       + CASE WHEN i.user_point IS NOT NULL AND s.public_location IS NOT NULL
              THEN GREATEST(0,50-(ST_Distance(s.public_location,i.user_point)/1000.0)) ELSE 0 END
      )::DOUBLE PRECISION AS rank_score
    FROM public.salons s
    CROSS JOIN input i
    JOIN LATERAL (
      SELECT ms.*
      FROM public.marketplace_services ms
      WHERE ms.provider_type='salon' AND ms.salon_id=s.id AND ms.active AND ms.booking_enabled
        AND (i.q IS NULL OR ms.name ILIKE '%'||i.q||'%' OR s.name ILIKE '%'||i.q||'%')
        AND (i.style_slug IS NULL OR EXISTS (
          SELECT 1 FROM public.service_taxonomy_links stl JOIN public.hair_taxonomy ht ON ht.id=stl.taxonomy_id
          WHERE stl.service_id=ms.id AND lower(ht.slug)=i.style_slug AND ht.active
        ))
      ORDER BY ms.price_amount ASC, ms.id
      LIMIT 1
    ) svc ON TRUE
    LEFT JOIN LATERAL (
      SELECT ht.slug
      FROM public.service_taxonomy_links stl JOIN public.hair_taxonomy ht ON ht.id=stl.taxonomy_id
      WHERE stl.service_id=svc.id AND (i.style_slug IS NULL OR lower(ht.slug)=i.style_slug)
      ORDER BY CASE WHEN lower(ht.slug)=i.style_slug THEN 0 ELSE 1 END, ht.sort_order, ht.slug
      LIMIT 1
    ) style ON TRUE
    WHERE (p_provider_type IS NULL OR p_provider_type IN ('all','salon'))
      AND s.listing_status='published'
      AND s.verification_status='verified'
      AND public.marketplace_salon_subscription_active(s.id)
      AND (
        (i.user_point IS NOT NULL AND s.public_location IS NOT NULL AND ST_DWithin(s.public_location,i.user_point,i.radius_m))
        OR (i.city IS NOT NULL AND lower(COALESCE(s.city,''))=i.city)
        OR (i.user_point IS NULL AND i.city IS NULL)
      )
),
professional_candidates AS (
    SELECT
      'professional'::TEXT AS provider_type,
      p.id AS provider_id,
      p.slug,
      COALESCE(p.professional_name,'Professionnel Afrofade')::TEXT AS display_name,
      p.city::TEXT,
      CASE WHEN p.location_visibility IN ('neighborhood','approximate','precise') THEN p.neighborhood::TEXT ELSE NULL END AS neighborhood,
      CASE WHEN i.user_point IS NOT NULL AND p.public_location IS NOT NULL
           THEN ST_Distance(p.public_location,i.user_point) ELSE NULL END AS distance_m,
      svc.id AS matched_service_id,
      svc.name::TEXT AS matched_service_name,
      svc.price_amount AS matched_service_price,
      svc.currency::TEXT,
      style.slug::TEXT AS matched_style_slug,
      (CASE WHEN i.style_slug IS NOT NULL AND style.slug=i.style_slug THEN 100 ELSE 0 END
       + CASE WHEN i.q IS NOT NULL AND (p.professional_name ILIKE '%'||i.q||'%' OR svc.name ILIKE '%'||i.q||'%') THEN 30 ELSE 0 END
       + CASE WHEN i.city IS NOT NULL AND lower(COALESCE(p.city,''))=i.city THEN 20 ELSE 0 END
       + CASE WHEN i.user_point IS NOT NULL AND p.public_location IS NOT NULL
              THEN GREATEST(0,50-(ST_Distance(p.public_location,i.user_point)/1000.0)) ELSE 0 END
      )::DOUBLE PRECISION AS rank_score
    FROM public.professional_profiles p
    CROSS JOIN input i
    JOIN LATERAL (
      SELECT ms.*
      FROM public.marketplace_services ms
      WHERE ms.provider_type='professional' AND ms.professional_profile_id=p.id AND ms.active AND ms.booking_enabled
        AND (i.q IS NULL OR ms.name ILIKE '%'||i.q||'%' OR p.professional_name ILIKE '%'||i.q||'%')
        AND (i.style_slug IS NULL OR EXISTS (
          SELECT 1 FROM public.service_taxonomy_links stl JOIN public.hair_taxonomy ht ON ht.id=stl.taxonomy_id
          WHERE stl.service_id=ms.id AND lower(ht.slug)=i.style_slug AND ht.active
        ))
      ORDER BY ms.price_amount ASC, ms.id
      LIMIT 1
    ) svc ON TRUE
    LEFT JOIN LATERAL (
      SELECT ht.slug
      FROM public.service_taxonomy_links stl JOIN public.hair_taxonomy ht ON ht.id=stl.taxonomy_id
      WHERE stl.service_id=svc.id AND (i.style_slug IS NULL OR lower(ht.slug)=i.style_slug)
      ORDER BY CASE WHEN lower(ht.slug)=i.style_slug THEN 0 ELSE 1 END, ht.sort_order, ht.slug
      LIMIT 1
    ) style ON TRUE
    WHERE (p_provider_type IS NULL OR p_provider_type IN ('all','professional'))
      AND p.listing_status='published'
      AND p.verification_status='verified'
      AND p.operating_mode IN ('independent','mobile','studio','hybrid')
      AND p.location_visibility <> 'hidden'
      AND public.marketplace_professional_subscription_active(p.id)
      AND (
        (i.user_point IS NOT NULL AND p.public_location IS NOT NULL AND ST_DWithin(p.public_location,i.user_point,i.radius_m))
        OR (i.city IS NOT NULL AND lower(COALESCE(p.city,''))=i.city)
        OR (i.user_point IS NULL AND i.city IS NULL)
      )
),
combined AS (
    SELECT * FROM salon_candidates
    UNION ALL
    SELECT * FROM professional_candidates
)
SELECT c.*
FROM combined c CROSS JOIN input i
ORDER BY c.rank_score DESC, c.distance_m ASC NULLS LAST, c.display_name ASC, c.provider_id ASC
LIMIT (SELECT page_limit FROM input)
OFFSET (SELECT page_offset FROM input);
$$;

REVOKE ALL ON FUNCTION public.search_marketplace_providers(TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,INT,TEXT,INT,INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_marketplace_providers(TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,INT,TEXT,INT,INT) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.search_marketplace_providers(TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,INT,TEXT,INT,INT) IS
 'Deterministic marketplace ranking V1. Uses only public provider location and never persists consumer GPS.';
