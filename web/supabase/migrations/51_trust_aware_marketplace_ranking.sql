-- Afrofade Database Migration 51: trust-aware deterministic ranking
-- BMAD Story 15.5

DROP FUNCTION IF EXISTS public.search_marketplace_providers(TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,INT,TEXT,INT,INT);
CREATE FUNCTION public.search_marketplace_providers(
 p_query TEXT DEFAULT NULL,p_style_slug TEXT DEFAULT NULL,p_provider_type TEXT DEFAULT NULL,
 p_lat DOUBLE PRECISION DEFAULT NULL,p_lng DOUBLE PRECISION DEFAULT NULL,p_radius_m INT DEFAULT 25000,
 p_city TEXT DEFAULT NULL,p_limit INT DEFAULT 20,p_offset INT DEFAULT 0
) RETURNS TABLE(
 provider_type TEXT,provider_id UUID,slug TEXT,display_name TEXT,city TEXT,neighborhood TEXT,distance_m DOUBLE PRECISION,
 matched_service_id UUID,matched_service_name TEXT,matched_service_price INT,currency TEXT,matched_style_slug TEXT,
 average_rating NUMERIC,review_count BIGINT,rank_score DOUBLE PRECISION
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
WITH input AS (
 SELECT NULLIF(btrim(p_query),'') q,NULLIF(lower(btrim(p_style_slug)),'') style_slug,
 CASE WHEN p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180 THEN ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography ELSE NULL END user_point,
 GREATEST(1000,LEAST(COALESCE(p_radius_m,25000),500000)) radius_m,NULLIF(lower(btrim(p_city)),'') city,
 GREATEST(1,LEAST(COALESCE(p_limit,20),50)) page_limit,GREATEST(COALESCE(p_offset,0),0) page_offset
),
salon_candidates AS (
 SELECT 'salon'::TEXT provider_type,s.id provider_id,s.slug,s.name::TEXT display_name,s.city::TEXT,s.neighborhood::TEXT,
 CASE WHEN i.user_point IS NOT NULL AND s.public_location IS NOT NULL THEN ST_Distance(s.public_location,i.user_point) END distance_m,
 svc.id matched_service_id,svc.name::TEXT matched_service_name,svc.price_amount matched_service_price,svc.currency::TEXT,style.slug::TEXT matched_style_slug,
 COALESCE(ra.average_rating,0)::NUMERIC average_rating,COALESCE(ra.review_count,0)::BIGINT review_count,
 (CASE WHEN i.style_slug IS NOT NULL AND style.slug=i.style_slug THEN 100 ELSE 0 END
  +CASE WHEN i.q IS NOT NULL AND (s.name ILIKE '%'||i.q||'%' OR svc.name ILIKE '%'||i.q||'%') THEN 30 ELSE 0 END
  +CASE WHEN i.city IS NOT NULL AND lower(COALESCE(s.city,''))=i.city THEN 20 ELSE 0 END
  +CASE WHEN i.user_point IS NOT NULL AND s.public_location IS NOT NULL THEN GREATEST(0,50-(ST_Distance(s.public_location,i.user_point)/1000.0)) ELSE 0 END
  +COALESCE(ra.average_rating,0)*8 + LEAST(COALESCE(ra.review_count,0),100)*0.15
  +CASE WHEN EXISTS(SELECT 1 FROM public.salon_service_professionals ssp JOIN public.salon_memberships sm ON sm.id=ssp.membership_id JOIN public.professional_availability_rules ar ON ar.professional_profile_id=sm.professional_profile_id AND ar.active WHERE ssp.service_id=svc.id AND sm.status='active') THEN 10 ELSE 0 END
 )::DOUBLE PRECISION rank_score
 FROM public.salons s CROSS JOIN input i
 JOIN LATERAL (SELECT ms.* FROM public.marketplace_services ms WHERE ms.provider_type='salon' AND ms.salon_id=s.id AND ms.active AND ms.booking_enabled
  AND (i.q IS NULL OR ms.name ILIKE '%'||i.q||'%' OR s.name ILIKE '%'||i.q||'%')
  AND (i.style_slug IS NULL OR EXISTS(SELECT 1 FROM public.service_taxonomy_links stl JOIN public.hair_taxonomy ht ON ht.id=stl.taxonomy_id WHERE stl.service_id=ms.id AND lower(ht.slug)=i.style_slug AND ht.active))
  ORDER BY ms.price_amount,ms.id LIMIT 1) svc ON TRUE
 LEFT JOIN LATERAL (SELECT ht.slug FROM public.service_taxonomy_links stl JOIN public.hair_taxonomy ht ON ht.id=stl.taxonomy_id WHERE stl.service_id=svc.id AND (i.style_slug IS NULL OR lower(ht.slug)=i.style_slug) ORDER BY CASE WHEN lower(ht.slug)=i.style_slug THEN 0 ELSE 1 END,ht.sort_order,ht.slug LIMIT 1) style ON TRUE
 LEFT JOIN public.marketplace_review_aggregates ra ON ra.target_type='salon' AND ra.target_id=s.id
 WHERE (p_provider_type IS NULL OR p_provider_type IN ('all','salon')) AND s.listing_status='published' AND s.verification_status='verified' AND public.marketplace_salon_subscription_active(s.id)
 AND ((i.user_point IS NOT NULL AND s.public_location IS NOT NULL AND ST_DWithin(s.public_location,i.user_point,i.radius_m)) OR (i.city IS NOT NULL AND lower(COALESCE(s.city,''))=i.city) OR (i.user_point IS NULL AND i.city IS NULL))
),
professional_candidates AS (
 SELECT 'professional'::TEXT,p.id,p.slug,COALESCE(p.professional_name,'Professionnel Afrofade')::TEXT,p.city::TEXT,
 CASE WHEN p.location_visibility IN ('neighborhood','approximate','precise') THEN p.neighborhood::TEXT END,
 CASE WHEN i.user_point IS NOT NULL AND p.public_location IS NOT NULL THEN ST_Distance(p.public_location,i.user_point) END,
 svc.id,svc.name::TEXT,svc.price_amount,svc.currency::TEXT,style.slug::TEXT,
 COALESCE(ra.average_rating,0)::NUMERIC,COALESCE(ra.review_count,0)::BIGINT,
 (CASE WHEN i.style_slug IS NOT NULL AND style.slug=i.style_slug THEN 100 ELSE 0 END
  +CASE WHEN i.q IS NOT NULL AND (p.professional_name ILIKE '%'||i.q||'%' OR svc.name ILIKE '%'||i.q||'%') THEN 30 ELSE 0 END
  +CASE WHEN i.city IS NOT NULL AND lower(COALESCE(p.city,''))=i.city THEN 20 ELSE 0 END
  +CASE WHEN i.user_point IS NOT NULL AND p.public_location IS NOT NULL THEN GREATEST(0,50-(ST_Distance(p.public_location,i.user_point)/1000.0)) ELSE 0 END
  +COALESCE(ra.average_rating,0)*8 + LEAST(COALESCE(ra.review_count,0),100)*0.15
  +CASE WHEN EXISTS(SELECT 1 FROM public.professional_availability_rules ar WHERE ar.professional_profile_id=p.id AND ar.active) THEN 10 ELSE 0 END
  +CASE WHEN EXISTS(SELECT 1 FROM public.professional_portfolio_items pi WHERE pi.professional_profile_id=p.id AND pi.publication_status='published' AND pi.moderation_status='approved') THEN 5 ELSE 0 END
 )::DOUBLE PRECISION
 FROM public.professional_profiles p CROSS JOIN input i
 JOIN LATERAL (SELECT ms.* FROM public.marketplace_services ms WHERE ms.provider_type='professional' AND ms.professional_profile_id=p.id AND ms.active AND ms.booking_enabled
  AND (i.q IS NULL OR ms.name ILIKE '%'||i.q||'%' OR p.professional_name ILIKE '%'||i.q||'%')
  AND (i.style_slug IS NULL OR EXISTS(SELECT 1 FROM public.service_taxonomy_links stl JOIN public.hair_taxonomy ht ON ht.id=stl.taxonomy_id WHERE stl.service_id=ms.id AND lower(ht.slug)=i.style_slug AND ht.active))
  ORDER BY ms.price_amount,ms.id LIMIT 1) svc ON TRUE
 LEFT JOIN LATERAL (SELECT ht.slug FROM public.service_taxonomy_links stl JOIN public.hair_taxonomy ht ON ht.id=stl.taxonomy_id WHERE stl.service_id=svc.id AND (i.style_slug IS NULL OR lower(ht.slug)=i.style_slug) ORDER BY CASE WHEN lower(ht.slug)=i.style_slug THEN 0 ELSE 1 END,ht.sort_order,ht.slug LIMIT 1) style ON TRUE
 LEFT JOIN public.marketplace_review_aggregates ra ON ra.target_type='professional' AND ra.target_id=p.id
 WHERE (p_provider_type IS NULL OR p_provider_type IN ('all','professional')) AND p.listing_status='published' AND p.verification_status='verified' AND p.operating_mode IN ('independent','mobile','studio','hybrid') AND p.location_visibility<>'hidden' AND public.marketplace_professional_subscription_active(p.id)
 AND ((i.user_point IS NOT NULL AND p.public_location IS NOT NULL AND ST_DWithin(p.public_location,i.user_point,i.radius_m)) OR (i.city IS NOT NULL AND lower(COALESCE(p.city,''))=i.city) OR (i.user_point IS NULL AND i.city IS NULL))
),combined AS (SELECT * FROM salon_candidates UNION ALL SELECT * FROM professional_candidates)
SELECT c.* FROM combined c CROSS JOIN input i ORDER BY c.rank_score DESC,c.distance_m ASC NULLS LAST,c.review_count DESC,c.display_name,c.provider_id LIMIT (SELECT page_limit FROM input) OFFSET (SELECT page_offset FROM input);
$$;
REVOKE ALL ON FUNCTION public.search_marketplace_providers(TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,INT,TEXT,INT,INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_marketplace_providers(TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,INT,TEXT,INT,INT) TO anon,authenticated,service_role;
COMMENT ON FUNCTION public.search_marketplace_providers(TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,INT,TEXT,INT,INT) IS 'Ranking V2: style/service + distance + availability + verified review reputation + portfolio. Deterministic and auditable.';
