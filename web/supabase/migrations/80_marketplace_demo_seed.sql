-- Afrofade Database Migration 80: Marketplace Local Demo Seed
-- Idempotent seed data for local development & demonstration (salons, pros, services, taxonomy links)

-- 1. Ensure Hair Taxonomy categories & styles exist
INSERT INTO public.hair_taxonomy(slug, kind, label_fr, aliases, sort_order)
SELECT seed.slug, 'category', seed.label_fr, seed.aliases, seed.sort_order
FROM (VALUES
 ('barber-fades','Barber & Fades',ARRAY['barber','fade','dégradé']::TEXT[],10),
 ('braids','Tresses',ARRAY['tresses','braids','nattes']::TEXT[],20),
 ('locks-locs','Locks & Locs',ARRAY['locks','locs','dreadlocks']::TEXT[],30),
 ('afro-twists','Afro & Twists',ARRAY['afro','twists','vanilles']::TEXT[],40),
 ('hair-styling','Coiffure',ARRAY['coiffure','styling']::TEXT[],50),
 ('beard','Barbe',ARRAY['barbe','beard']::TEXT[],60)
) AS seed(slug,label_fr,aliases,sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.hair_taxonomy existing WHERE lower(existing.slug)=lower(seed.slug));

INSERT INTO public.hair_taxonomy(slug, kind, parent_id, label_fr, aliases, sort_order)
SELECT seed.slug, 'style', parent.id, seed.label_fr, seed.aliases, seed.sort_order
FROM (VALUES
 ('low-taper-fade','barber-fades','Low Taper Fade',ARRAY['taper fade','low taper']::TEXT[],10),
 ('burst-fade-mohawk','barber-fades','Burst Fade Mohawk',ARRAY['burst fade']::TEXT[],20),
 ('cornrows','braids','Cornrows',ARRAY['tresses collées','nattes plaquées']::TEXT[],10),
 ('knotless-braids','braids','Knotless Braids',ARRAY['knotless','tresses sans nœud']::TEXT[],20),
 ('short-locks','locks-locs','Locks courtes',ARRAY['short locks']::TEXT[],10),
 ('sponge-twists','afro-twists','Sponge Twists',ARRAY['afro twists','sponge']::TEXT[],10),
 ('sculpted-beard','beard','Barbe sculptée',ARRAY['contours barbe','beard shaping']::TEXT[],10)
) AS seed(slug,parent_slug,label_fr,aliases,sort_order)
JOIN public.hair_taxonomy parent ON lower(parent.slug)=lower(seed.parent_slug)
WHERE NOT EXISTS (SELECT 1 FROM public.hair_taxonomy existing WHERE lower(existing.slug)=lower(seed.slug));

-- 2. Seed Demo Salons
INSERT INTO public.salons(id, slug, name, headline, description, city, neighborhood, verification_status, listing_status)
VALUES
 ('a0000000-0000-4000-a000-000000000001', 'aicha-hair-studio', 'Aïcha Hair Studio', 'Salon spécialisé tresses et rituels capillaires', 'Salon haut de gamme à Ouagadougou 2000.', 'Ouagadougou', 'Ouaga 2000', 'verified', 'published'),
 ('a0000000-0000-4000-a000-000000000002', 'mariam-braids-beauty', 'Mariam Braids & Beauty', 'Nattes protectrices & Coiffures afros', 'Salon réputé à Karpala pour la qualité de ses tresses sans douleur.', 'Ouagadougou', 'Karpala', 'verified', 'published')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  verification_status = 'verified',
  listing_status = 'published';

-- 3. Seed Demo Professional Profiles
INSERT INTO public.professional_profiles(id, user_id, slug, professional_name, headline, bio, city, neighborhood, verification_status, listing_status)
VALUES
 ('b0000000-0000-4000-b000-000000000001', '00000000-0000-4000-8000-000000000001', 'karim-barber-pro', 'Karim Barber', 'Master Barber · Specialist Taper & Fade', 'Plus de 8 ans d’expérience en coupe homme et contours barbe.', 'Ouagadougou', 'Ouaga 2000', 'verified', 'published'),
 ('b0000000-0000-4000-b000-000000000002', '00000000-0000-4000-8000-000000000002', 'fatou-braids-pro', 'Fatou Braids', 'Spécialiste Knotless & Cornrows', 'Tresseuse passionnée par la protection du cheveu crépus et frisés.', 'Ouagadougou', 'Karpala', 'verified', 'published')
ON CONFLICT (id) DO UPDATE SET
  professional_name = EXCLUDED.professional_name,
  verification_status = 'verified',
  listing_status = 'published';

-- 4. Seed Demo Bookable Services
INSERT INTO public.marketplace_services(id, provider_type, salon_id, professional_profile_id, name, description, duration_minutes, price_amount, currency, active, booking_enabled)
VALUES
 ('c0000000-0000-4000-c000-000000000001', 'professional', NULL, 'b0000000-0000-4000-b000-000000000001', 'Low Taper Fade + Barbe', 'Dégradé bas sur mesure avec traçage net de la barbe.', 45, 3500, 'XOF', true, true),
 ('c0000000-0000-4000-c000-000000000002', 'professional', NULL, 'b0000000-0000-4000-b000-000000000002', 'Knotless Braids Moyennes', 'Tresses sans nœuds respectant le cuir chevelu.', 180, 15000, 'XOF', true, true),
 ('c0000000-0000-4000-c000-000000000003', 'salon', 'a0000000-0000-4000-a000-000000000001', NULL, 'Cornrows & Soin Hydratant', 'Nattes plaquées avec soin profond aux huiles naturelles.', 90, 8000, 'XOF', true, true),
 ('c0000000-0000-4000-c000-000000000004', 'salon', 'a0000000-0000-4000-a000-000000000002', NULL, 'Sponge Twists & Coupe Afro', 'Mise en forme afro avec vanilles au sponge.', 60, 5000, 'XOF', true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  active = true,
  booking_enabled = true;

-- 5. Link Services to Taxonomy
INSERT INTO public.service_taxonomy_links(service_id, taxonomy_id)
SELECT s.id, t.id
FROM public.marketplace_services s
JOIN public.hair_taxonomy t ON (
  (s.name ILIKE '%Taper%' AND t.slug = 'low-taper-fade')
  OR (s.name ILIKE '%Knotless%' AND t.slug = 'knotless-braids')
  OR (s.name ILIKE '%Cornrows%' AND t.slug = 'cornrows')
  OR (s.name ILIKE '%Twists%' AND t.slug = 'sponge-twists')
)
ON CONFLICT DO NOTHING;

-- 6. Seed Review Aggregates
INSERT INTO public.marketplace_review_aggregates(target_type, target_id, average_rating, review_count)
VALUES
 ('professional', 'b0000000-0000-4000-b000-000000000001', 4.90, 28),
 ('professional', 'b0000000-0000-4000-b000-000000000002', 4.85, 42),
 ('salon', 'a0000000-0000-4000-a000-000000000001', 4.95, 65),
 ('salon', 'a0000000-0000-4000-a000-000000000002', 4.80, 19)
ON CONFLICT (target_type, target_id) DO UPDATE SET
  average_rating = EXCLUDED.average_rating,
  review_count = EXCLUDED.review_count;
