-- Afrofade — Seed de démonstration local (développement uniquement)
-- Appliqué par scripts/dev-db/provision.sh après la chaîne de migrations.
-- Idempotent : UUIDs fixes + ON CONFLICT DO NOTHING.

\set ON_ERROR_STOP on

-- ============ Utilisateurs (mock auth.users local) ============
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-000000000001', 'demo@afrofade.dev', '{"full_name":"Awa Compaoré"}'),
  ('00000000-0000-4000-8000-000000000002', 'karim@afrofade.dev', '{"full_name":"Karim Sawadogo"}'),
  ('00000000-0000-4000-8000-000000000003', 'fatou@afrofade.dev', '{"full_name":"Fatou Ouédraogo"}'),
  ('00000000-0000-4000-8000-000000000004', 'sylvain@afrofade.dev', '{"full_name":"Sylvain Kaboré"}'),
  ('00000000-0000-4000-8000-000000000005', 'admin@afrofade.dev', '{"full_name":"Admin Afrofade"}'),
  ('00000000-0000-4000-8000-000000000006', 'amina@afrofade.dev', '{"full_name":"Amina Traoré"}')
ON CONFLICT (id) DO NOTHING;

-- ============ Salon (avant les profils : user_profiles.salon_id y référence) ============
INSERT INTO salons (id, name, phone, country, plan, slug, headline, description, city, neighborhood,
                    public_phone, verification_status, listing_status, booking_confirmation_mode, public_location)
VALUES (
  'aaaa1de0-0000-4000-8000-0000000000a1',
  'Salon Élégance Ouaga', '+226 70 00 00 01', 'Burkina Faso', 'VIP',
  'salon-elegance-ouaga',
  'Coiffure mixte au cœur de Ouaga 2000',
  'Salon polyvalent : coupes, tresses, soins et coloration. Équipe de professionnels confirmés, ambiance premium.',
  'Ouagadougou', 'Ouaga 2000', '+226 70 00 00 01',
  'verified', 'published', 'manual',
  ST_SetSRID(ST_MakePoint(-1.5197, 12.3714), 4326)::geography
) ON CONFLICT (id) DO NOTHING;

-- Profils legacy (rôle customer/salon/admin)
INSERT INTO user_profiles (user_id, role, salon_id) VALUES
  ('00000000-0000-4000-8000-000000000001', 'customer', NULL),
  ('00000000-0000-4000-8000-000000000002', 'customer', NULL),
  ('00000000-0000-4000-8000-000000000003', 'customer', NULL),
  ('00000000-0000-4000-8000-000000000004', 'salon', 'aaaa1de0-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-000000000005', 'admin', NULL),
  ('00000000-0000-4000-8000-000000000006', 'customer', NULL)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO customer_profiles (user_id, display_name) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Awa Compaoré')
ON CONFLICT DO NOTHING;

-- ============ Professionnels ============
INSERT INTO professional_profiles (id, user_id, slug, professional_name, headline, bio, operating_mode,
                                   job_seeking_status, verification_status, listing_status, service_radius_m,
                                   city, neighborhood, location_visibility, public_location)
VALUES
  ('bbbb2de0-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000002',
   'karim-barber-pro', 'Karim Sawadogo', 'Barbier premium — fades & contours millimétrés',
   'Barbier depuis 8 ans, spécialiste du fade et du design de barbe. Déplacement à domicile sur Ouagadougou.',
   'independent', 'not_looking', 'verified', 'published', 15000,
   'Ouagadougou', 'Gounghin', 'precise', ST_SetSRID(ST_MakePoint(-1.5303, 12.3900), 4326)::geography),
  ('bbbb2de0-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000003',
   'fatou-braids-pro', 'Fatou Ouédraogo', 'Tresses & protective styling — studio privé',
   'Experte tresses collées, knotless et faux locs. Studio privé calme, rendez-vous conseillés.',
   'studio', 'not_looking', 'verified', 'published', 10000,
   'Ouagadougou', 'Patte d''Oie', 'neighborhood', ST_SetSRID(ST_MakePoint(-1.5050, 12.3300), 4326)::geography),
  ('bbbb2de0-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-000000000006',
   'amina-hair-stylist', 'Amina Traoré', 'Styliste — coloration & soins (en salon)',
   'Styliste en salon, coloration végétale et soins profonds. Ouverte aux opportunités.',
   'hybrid', 'open', 'verified', 'published', 8000,
   'Ouagadougou', 'Ouaga 2000', 'city', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============ Memberships ============
INSERT INTO salon_memberships (id, salon_id, user_id, professional_profile_id, role, status, started_at)
VALUES
  ('cccc3de0-0000-4000-8000-0000000000c1', 'aaaa1de0-0000-4000-8000-0000000000a1',
   '00000000-0000-4000-8000-000000000004', NULL, 'owner', 'active', NOW() - INTERVAL '1 year'),
  ('cccc3de0-0000-4000-8000-0000000000c2', 'aaaa1de0-0000-4000-8000-0000000000a1',
   '00000000-0000-4000-8000-000000000006', 'bbbb2de0-0000-4000-8000-0000000000b3', 'professional', 'active', NOW() - INTERVAL '6 months')
ON CONFLICT (id) DO NOTHING;

-- ============ Abonnements actifs (entitlements) ============
INSERT INTO professional_subscriptions (id, professional_profile_id, user_id, product_id, provider, status, starts_at, expires_at)
VALUES
  ('dddd4de0-0000-4000-8000-0000000000d1', 'bbbb2de0-0000-4000-8000-0000000000b1',
   '00000000-0000-4000-8000-000000000002', 'PROFESSIONAL_PRO', 'manual', 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days'),
  ('dddd4de0-0000-4000-8000-0000000000d2', 'bbbb2de0-0000-4000-8000-0000000000b2',
   '00000000-0000-4000-8000-000000000003', 'PROFESSIONAL_PRO', 'manual', 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscriptions (id, salon_id, provider, amount_fcfa, status, expires_at)
VALUES ('dddd4de0-0000-4000-8000-0000000000d3', 'aaaa1de0-0000-4000-8000-0000000000a1',
        'manual', 25000, 'active', NOW() + INTERVAL '200 days')
ON CONFLICT (id) DO NOTHING;

-- ============ Taxonomie cheveux ============
INSERT INTO hair_taxonomy (id, slug, kind, parent_id, label_fr, aliases, active, sort_order) VALUES
  ('e0f0aa00-0000-4000-8000-0000000000e1', 'tresses', 'category', NULL, 'Tresses & tissage', ARRAY['tressage','weaving'], TRUE, 1),
  ('e0f0aa00-0000-4000-8000-0000000000e2', 'coupe-barbier', 'category', NULL, 'Coupe & barbier', ARRAY['barbier','coupe'], TRUE, 2),
  ('e0f0aa00-0000-4000-8000-0000000000e3', 'soins-coloration', 'category', NULL, 'Soins & coloration', ARRAY['soin','couleur'], TRUE, 3),
  ('e0f0bb00-0000-4000-8000-0000000001e1', 'tresses-collees', 'style', 'e0f0aa00-0000-4000-8000-0000000000e1', 'Tresses collées', ARRAY['colle','braids'], TRUE, 1),
  ('e0f0bb00-0000-4000-8000-0000000001e2', 'knotless', 'style', 'e0f0aa00-0000-4000-8000-0000000000e1', 'Knotless braids', ARRAY['knotless braids','sans noeud'], TRUE, 2),
  ('e0f0bb00-0000-4000-8000-0000000001e3', 'faux-locs', 'style', 'e0f0aa00-0000-4000-8000-0000000000e1', 'Faux locs', ARRAY['locs','dreadlocks'], TRUE, 3),
  ('e0f0bb00-0000-4000-8000-0000000001e4', 'vanille', 'style', 'e0f0aa00-0000-4000-8000-0000000000e1', 'Vanille', ARRAY['vanilles','twist'], TRUE, 4),
  ('e0f0bb00-0000-4000-8000-0000000001e5', 'fade', 'style', 'e0f0aa00-0000-4000-8000-0000000000e2', 'Dégradé / Fade', ARRAY['degrade','taper'], TRUE, 1),
  ('e0f0bb00-0000-4000-8000-0000000001e6', 'line-up', 'style', 'e0f0aa00-0000-4000-8000-0000000000e2', 'Line-up & contours', ARRAY['contour','edge up'], TRUE, 2),
  ('e0f0cc00-0000-4000-8000-0000000002e1', 'barbe-design', 'skill', 'e0f0aa00-0000-4000-8000-0000000000e2', 'Barbe & design', ARRAY['barbe'], TRUE, 1),
  ('e0f0cc00-0000-4000-8000-0000000002e2', 'coloration-vegetale', 'skill', 'e0f0aa00-0000-4000-8000-0000000000e3', 'Coloration végétale', ARRAY['couleur vegetale'], TRUE, 1),
  ('e0f0cc00-0000-4000-8000-0000000002e3', 'soin-profond', 'skill', 'e0f0aa00-0000-4000-8000-0000000000e3', 'Soin profond / hydratation', ARRAY['soin hydratant'], TRUE, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO professional_skills (professional_profile_id, taxonomy_id, evidence_level) VALUES
  ('bbbb2de0-0000-4000-8000-0000000000b1', 'e0f0bb00-0000-4000-8000-0000000001e5', 'verified_service'),
  ('bbbb2de0-0000-4000-8000-0000000000b1', 'e0f0bb00-0000-4000-8000-0000000001e6', 'verified_service'),
  ('bbbb2de0-0000-4000-8000-0000000000b1', 'e0f0cc00-0000-4000-8000-0000000002e1', 'portfolio'),
  ('bbbb2de0-0000-4000-8000-0000000000b2', 'e0f0bb00-0000-4000-8000-0000000001e1', 'verified_service'),
  ('bbbb2de0-0000-4000-8000-0000000000b2', 'e0f0bb00-0000-4000-8000-0000000001e2', 'verified_service'),
  ('bbbb2de0-0000-4000-8000-0000000000b2', 'e0f0bb00-0000-4000-8000-0000000001e3', 'portfolio'),
  ('bbbb2de0-0000-4000-8000-0000000000b3', 'e0f0cc00-0000-4000-8000-0000000002e2', 'declared'),
  ('bbbb2de0-0000-4000-8000-0000000000b3', 'e0f0cc00-0000-4000-8000-0000000002e3', 'declared')
ON CONFLICT DO NOTHING;

-- ============ Services ============
INSERT INTO marketplace_services (id, provider_type, salon_id, professional_profile_id, name, description,
                                  duration_minutes, buffer_before_minutes, buffer_after_minutes, price_amount, currency)
VALUES
  ('f1f1b000-0000-4000-8000-0000000000f1', 'professional', NULL, 'bbbb2de0-0000-4000-8000-0000000000b1',
   'Coupe + barbe signature', 'Fade au choix, contours nets et finition à la serviette chaude.', 45, 5, 10, 8000, 'XOF'),
  ('f1f1b000-0000-4000-8000-0000000000f2', 'professional', NULL, 'bbbb2de0-0000-4000-8000-0000000000b1',
   'Design fade premium', 'Dégradé travaillé aux tondeuses et ciseaux, contours dessinés au rasoir.', 30, 5, 5, 5000, 'XOF'),
  ('f1f1b000-0000-4000-8000-0000000000f3', 'professional', NULL, 'bbbb2de0-0000-4000-8000-0000000000b2',
   'Tresses collées (moyennes)', 'Pose complète, mèches fournies, durée selon densité.', 180, 15, 15, 15000, 'XOF'),
  ('f1f1b000-0000-4000-8000-0000000000f4', 'professional', NULL, 'bbbb2de0-0000-4000-8000-0000000000b2',
   'Faux locs', 'Pose faux locs, rendu naturel garanti.', 240, 15, 15, 25000, 'XOF'),
  ('f1f1b000-0000-4000-8000-0000000000f5', 'salon', 'aaaa1de0-0000-4000-8000-0000000000a1', NULL,
   'Coupe homme express', 'Coupe simple sans rendez-vous long, en salon.', 30, 0, 5, 4000, 'XOF'),
  ('f1f1b000-0000-4000-8000-0000000000f6', 'salon', 'aaaa1de0-0000-4000-8000-0000000000a1', NULL,
   'Soin hydratant profond', 'Shampoing, soin profond et coiffage léger.', 60, 10, 10, 7000, 'XOF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_taxonomy_links (service_id, taxonomy_id) VALUES
  ('f1f1b000-0000-4000-8000-0000000000f1', 'e0f0bb00-0000-4000-8000-0000000001e5'),
  ('f1f1b000-0000-4000-8000-0000000000f1', 'e0f0cc00-0000-4000-8000-0000000002e1'),
  ('f1f1b000-0000-4000-8000-0000000000f2', 'e0f0bb00-0000-4000-8000-0000000001e5'),
  ('f1f1b000-0000-4000-8000-0000000000f3', 'e0f0bb00-0000-4000-8000-0000000001e1'),
  ('f1f1b000-0000-4000-8000-0000000000f4', 'e0f0bb00-0000-4000-8000-0000000001e3'),
  ('f1f1b000-0000-4000-8000-0000000000f5', 'e0f0aa00-0000-4000-8000-0000000000e2'),
  ('f1f1b000-0000-4000-8000-0000000000f6', 'e0f0cc00-0000-4000-8000-0000000002e3')
ON CONFLICT DO NOTHING;

-- Services salon éligibles : membership d'Amina
INSERT INTO salon_service_professionals (service_id, membership_id) VALUES
  ('f1f1b000-0000-4000-8000-0000000000f5', 'cccc3de0-0000-4000-8000-0000000000c2'),
  ('f1f1b000-0000-4000-8000-0000000000f6', 'cccc3de0-0000-4000-8000-0000000000c2')
ON CONFLICT DO NOTHING;

-- ============ Disponibilités ============
INSERT INTO professional_availability_rules (id, professional_profile_id, salon_id, weekday, local_start, local_end, timezone)
VALUES
  ('a5a5b000-0000-4000-8000-0000000001a1', 'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 1, '09:00', '19:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000001a2', 'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 2, '09:00', '19:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000001a3', 'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 3, '09:00', '19:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000001a4', 'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 4, '09:00', '19:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000001a5', 'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 5, '09:00', '19:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000001a6', 'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 6, '09:00', '18:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000002a1', 'bbbb2de0-0000-4000-8000-0000000000b2', NULL, 2, '08:30', '18:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000002a2', 'bbbb2de0-0000-4000-8000-0000000000b2', NULL, 3, '08:30', '18:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000002a3', 'bbbb2de0-0000-4000-8000-0000000000b2', NULL, 4, '08:30', '18:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000002a4', 'bbbb2de0-0000-4000-8000-0000000000b2', NULL, 5, '08:30', '18:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000002a5', 'bbbb2de0-0000-4000-8000-0000000000b2', NULL, 6, '08:30', '17:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000003a1', 'bbbb2de0-0000-4000-8000-0000000000b3', 'aaaa1de0-0000-4000-8000-0000000000a1', 1, '09:00', '18:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000003a2', 'bbbb2de0-0000-4000-8000-0000000000b3', 'aaaa1de0-0000-4000-8000-0000000000a1', 2, '09:00', '18:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000003a3', 'bbbb2de0-0000-4000-8000-0000000000b3', 'aaaa1de0-0000-4000-8000-0000000000a1', 3, '09:00', '18:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000003a4', 'bbbb2de0-0000-4000-8000-0000000000b3', 'aaaa1de0-0000-4000-8000-0000000000a1', 4, '09:00', '18:00', 'Africa/Ouagadougou'),
  ('a5a5b000-0000-4000-8000-0000000003a5', 'bbbb2de0-0000-4000-8000-0000000000b3', 'aaaa1de0-0000-4000-8000-0000000000a1', 5, '09:00', '18:00', 'Africa/Ouagadougou')
ON CONFLICT (id) DO NOTHING;

-- ============ Portfolio ============
INSERT INTO professional_portfolio_items (id, professional_profile_id, owner_user_id, storage_path, mime_type,
                                          file_size_bytes, title, description, moderation_status, publication_status)
VALUES
  ('b6b6c000-0000-4000-8000-0000000001b1', 'bbbb2de0-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000002',
   'professionals/bbbb2de0-0000-4000-8000-0000000000b1/fade-mid-skin.jpg', 'image/jpeg', 240000, 'Mid skin fade', 'Dégradé moyen peau, contours nets.', 'approved', 'published'),
  ('b6b6c000-0000-4000-8000-0000000001b2', 'bbbb2de0-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000002',
   'professionals/bbbb2de0-0000-4000-8000-0000000000b1/barbe-design.jpg', 'image/jpeg', 210000, 'Barbe design', 'Barbe structurée au rasoir.', 'approved', 'published'),
  ('b6b6c000-0000-4000-8000-0000000002b1', 'bbbb2de0-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000003',
   'professionals/bbbb2de0-0000-4000-8000-0000000000b2/knotless-longues.jpg', 'image/jpeg', 320000, 'Knotless longues', 'Pose knotless soignée.', 'approved', 'published'),
  ('b6b6c000-0000-4000-8000-0000000002b2', 'bbbb2de0-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000003',
   'professionals/bbbb2de0-0000-4000-8000-0000000000b2/faux-locs.jpg', 'image/jpeg', 290000, 'Faux locs bouclés', 'Rendu naturel sur longueurs.', 'approved', 'published')
ON CONFLICT (id) DO NOTHING;

INSERT INTO portfolio_taxonomy_links (portfolio_item_id, taxonomy_id) VALUES
  ('b6b6c000-0000-4000-8000-0000000001b1', 'e0f0bb00-0000-4000-8000-0000000001e5'),
  ('b6b6c000-0000-4000-8000-0000000001b2', 'e0f0cc00-0000-4000-8000-0000000002e1'),
  ('b6b6c000-0000-4000-8000-0000000002b1', 'e0f0bb00-0000-4000-8000-0000000001e2'),
  ('b6b6c000-0000-4000-8000-0000000002b2', 'e0f0bb00-0000-4000-8000-0000000001e3')
ON CONFLICT DO NOTHING;

-- ============ Réservations (passées terminées + future confirmée) ============
INSERT INTO marketplace_bookings (id, customer_user_id, service_id, target_type, salon_id, professional_profile_id,
                                  assigned_professional_profile_id, assigned_membership_id, status, starts_at, ends_at,
                                  service_name_snapshot, duration_minutes_snapshot, price_amount_snapshot, currency_snapshot)
VALUES
  ('c7c7d000-0000-4000-8000-0000000001c1', '00000000-0000-4000-8000-000000000001',
   'f1f1b000-0000-4000-8000-0000000000f1', 'professional', NULL, 'bbbb2de0-0000-4000-8000-0000000000b1',
   'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 'completed',
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '45 minutes',
   'Coupe + barbe signature', 45, 8000, 'XOF'),
  ('c7c7d000-0000-4000-8000-0000000001c2', '00000000-0000-4000-8000-000000000001',
   'f1f1b000-0000-4000-8000-0000000000f3', 'professional', NULL, 'bbbb2de0-0000-4000-8000-0000000000b2',
   'bbbb2de0-0000-4000-8000-0000000000b2', NULL, 'completed',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days' + INTERVAL '180 minutes',
   'Tresses collées (moyennes)', 180, 15000, 'XOF'),
  ('c7c7d000-0000-4000-8000-0000000001c3', '00000000-0000-4000-8000-000000000001',
   'f1f1b000-0000-4000-8000-0000000000f5', 'salon', 'aaaa1de0-0000-4000-8000-0000000000a1', NULL,
   'bbbb2de0-0000-4000-8000-0000000000b3', 'cccc3de0-0000-4000-8000-0000000000c2', 'completed',
   NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days' + INTERVAL '30 minutes',
   'Coupe homme express', 30, 4000, 'XOF'),
  ('c7c7d000-0000-4000-8000-0000000001c4', '00000000-0000-4000-8000-000000000001',
   'f1f1b000-0000-4000-8000-0000000000f6', 'salon', 'aaaa1de0-0000-4000-8000-0000000000a1', NULL,
   'bbbb2de0-0000-4000-8000-0000000000b3', 'cccc3de0-0000-4000-8000-0000000000c2', 'completed',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days' + INTERVAL '60 minutes',
   'Soin hydratant profond', 60, 7000, 'XOF'),
  ('c7c7d000-0000-4000-8000-0000000001c5', '00000000-0000-4000-8000-000000000001',
   'f1f1b000-0000-4000-8000-0000000000f2', 'professional', NULL, 'bbbb2de0-0000-4000-8000-0000000000b1',
   'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 'confirmed',
   NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '30 minutes',
   'Design fade premium', 30, 5000, 'XOF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO booking_status_events (booking_id, from_status, to_status, actor_user_id, created_at) VALUES
  ('c7c7d000-0000-4000-8000-0000000001c1', NULL, 'confirmed', '00000000-0000-4000-8000-000000000001', NOW() - INTERVAL '8 days'),
  ('c7c7d000-0000-4000-8000-0000000001c1', 'confirmed', 'completed', '00000000-0000-4000-8000-000000000002', NOW() - INTERVAL '7 days'),
  ('c7c7d000-0000-4000-8000-0000000001c2', NULL, 'confirmed', '00000000-0000-4000-8000-000000000001', NOW() - INTERVAL '15 days'),
  ('c7c7d000-0000-4000-8000-0000000001c2', 'confirmed', 'completed', '00000000-0000-4000-8000-000000000003', NOW() - INTERVAL '14 days'),
  ('c7c7d000-0000-4000-8000-0000000001c3', NULL, 'confirmed', '00000000-0000-4000-8000-000000000001', NOW() - INTERVAL '22 days'),
  ('c7c7d000-0000-4000-8000-0000000001c3', 'confirmed', 'completed', '00000000-0000-4000-8000-000000000004', NOW() - INTERVAL '21 days'),
  ('c7c7d000-0000-4000-8000-0000000001c4', NULL, 'confirmed', '00000000-0000-4000-8000-000000000001', NOW() - INTERVAL '31 days'),
  ('c7c7d000-0000-4000-8000-0000000001c4', 'confirmed', 'completed', '00000000-0000-4000-8000-000000000004', NOW() - INTERVAL '30 days'),
  ('c7c7d000-0000-4000-8000-0000000001c5', NULL, 'confirmed', '00000000-0000-4000-8000-000000000001', NOW() - INTERVAL '1 day');

-- ============ Avis vérifiés (agrégats recalculés par la vue) ============
INSERT INTO marketplace_reviews (id, booking_id, reviewer_user_id, target_type, professional_profile_id, salon_id, rating, comment, moderation_status, created_at) VALUES
  ('d8d8e000-0000-4000-8000-0000000001d1', 'c7c7d000-0000-4000-8000-0000000001c1', '00000000-0000-4000-8000-000000000001',
   'professional', 'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 5, 'Précision au top, le meilleur fade de Ouaga. Ponctuel et propre.', 'published', NOW() - INTERVAL '6 days'),
  ('d8d8e000-0000-4000-8000-0000000001d2', 'c7c7d000-0000-4000-8000-0000000001c2', '00000000-0000-4000-8000-000000000001',
   'professional', 'bbbb2de0-0000-4000-8000-0000000000b2', NULL, 4, 'Très beau travail sur les tresses, studio nickel. Juste un peu long.', 'published', NOW() - INTERVAL '13 days'),
  ('d8d8e000-0000-4000-8000-0000000001d3', 'c7c7d000-0000-4000-8000-0000000001c3', '00000000-0000-4000-8000-000000000001',
   'salon', NULL, 'aaaa1de0-0000-4000-8000-0000000000a1', 5, 'Accueil chaleureux, coupe rapide et soignée.', 'published', NOW() - INTERVAL '20 days'),
  ('d8d8e000-0000-4000-8000-0000000001d4', 'c7c7d000-0000-4000-8000-0000000001c4', '00000000-0000-4000-8000-000000000001',
   'salon', NULL, 'aaaa1de0-0000-4000-8000-0000000000a1', 4, 'Soin hydratant efficace, cheveux tout doux.', 'published', NOW() - INTERVAL '29 days')
ON CONFLICT (id) DO NOTHING;

-- ============ Recrutement ============
INSERT INTO job_postings (id, salon_id, created_by, title, description, city, neighborhood, work_mode,
                          experience_min_years, compensation_min, compensation_max, currency, status, moderation_status, deadline)
VALUES
  ('e9e9f000-0000-4000-8000-0000000001e1', 'aaaa1de0-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000004',
   'Coiffeur(seuse) tresses expérimenté(e)', 'Nous cherchons un(e) spécialiste tresses collées et knotless pour renforcer l''équipe. Clientèle fidèle, produits fournis.',
   'Ouagadougou', 'Ouaga 2000', 'onsite', 2, 80000, 120000, 'XOF', 'published', 'approved', NOW() + INTERVAL '45 days'),
  ('e9e9f000-0000-4000-8000-0000000001e2', 'aaaa1de0-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000004',
   'Barbier freelance (week-ends)', 'Renfort barbier samedi/dimanche pour coupes fades et contours. Rémunération à la prestation.',
   'Ouagadougou', NULL, 'hybrid', 1, NULL, NULL, 'XOF', 'published', 'approved', NOW() + INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_posting_skills (job_posting_id, taxonomy_id) VALUES
  ('e9e9f000-0000-4000-8000-0000000001e1', 'e0f0bb00-0000-4000-8000-0000000001e1'),
  ('e9e9f000-0000-4000-8000-0000000001e1', 'e0f0bb00-0000-4000-8000-0000000001e2'),
  ('e9e9f000-0000-4000-8000-0000000001e2', 'e0f0bb00-0000-4000-8000-0000000001e5')
ON CONFLICT DO NOTHING;

INSERT INTO job_applications (id, job_posting_id, applicant_user_id, professional_profile_id, status, message, profile_snapshot)
VALUES
  ('f0f0a000-0000-4000-8000-0000000001f1', 'e9e9f000-0000-4000-8000-0000000001e2',
   '00000000-0000-4000-8000-000000000002', 'bbbb2de0-0000-4000-8000-0000000000b1', 'submitted',
   'Bonjour, barbier indépendant depuis 8 ans, disponible week-ends. Portfolio sur mon profil.',
   '{"professional_name":"Karim Sawadogo","slug":"karim-barber-pro","skills":["fade","line-up","barbe-design"]}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_application_events (application_id, from_status, to_status, actor_user_id)
SELECT 'f0f0a000-0000-4000-8000-0000000001f1', NULL, 'submitted', '00000000-0000-4000-8000-000000000002'
WHERE NOT EXISTS (SELECT 1 FROM job_application_events WHERE application_id = 'f0f0a000-0000-4000-8000-0000000001f1');

-- ============ Notifications + télémétrie (démo) ============
INSERT INTO notification_outbox (recipient_user_id, event_type, aggregate_type, aggregate_id, payload, status)
VALUES
  ('00000000-0000-4000-8000-000000000002', 'booking_created', 'booking', 'c7c7d000-0000-4000-8000-0000000001c5',
   '{"service":"Design fade premium"}'::jsonb, 'pending')
ON CONFLICT DO NOTHING;

INSERT INTO marketplace_funnel_events (event_type, anonymous_session_id, provider_type, provider_id, style_slug, source, properties, created_at)
SELECT * FROM (VALUES
  ('search'::VARCHAR(60), 'seed-session-1', NULL::VARCHAR(20), NULL::UUID, NULL::TEXT, 'landing', '{"city":"Ouagadougou"}'::jsonb, NOW() - INTERVAL '7 days'),
  ('provider_view', 'seed-session-1', 'professional', 'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 'discover', '{}'::jsonb, NOW() - INTERVAL '7 days' + INTERVAL '2 minutes'),
  ('booking_started', 'seed-session-1', 'professional', 'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 'provider_profile', '{}'::jsonb, NOW() - INTERVAL '7 days' + INTERVAL '5 minutes'),
  ('booking_created', 'seed-session-1', 'professional', 'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 'booking_wizard', '{"price_fcfa":8000}'::jsonb, NOW() - INTERVAL '7 days' + INTERVAL '8 minutes'),
  ('booking_completed', 'seed-session-1', 'professional', 'bbbb2de0-0000-4000-8000-0000000000b1', NULL, 'provider_ops', '{}'::jsonb, NOW() - INTERVAL '7 days' + INTERVAL '60 minutes'),
  ('job_view', 'seed-session-2', NULL, NULL, NULL, 'careers', '{"job":"Barbier freelance (week-ends)"}'::jsonb, NOW() - INTERVAL '2 days')
) AS seed(event_type, anonymous_session_id, provider_type, provider_id, style_slug, source, properties, created_at)
WHERE NOT EXISTS (SELECT 1 FROM marketplace_funnel_events WHERE anonymous_session_id LIKE 'seed-session-%');
