-- Afrofade Database Migration 25: canonical hair/beard taxonomy + bookable services
-- BMAD Stories 13.1 and 13.2

CREATE TABLE IF NOT EXISTS public.hair_taxonomy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL,
    kind VARCHAR(24) NOT NULL DEFAULT 'style' CHECK (kind IN ('category','style','skill')),
    parent_id UUID REFERENCES public.hair_taxonomy(id) ON DELETE RESTRICT,
    label_fr TEXT NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hair_taxonomy_slug_ci ON public.hair_taxonomy(LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_hair_taxonomy_parent ON public.hair_taxonomy(parent_id);
CREATE INDEX IF NOT EXISTS idx_hair_taxonomy_active ON public.hair_taxonomy(active, kind);

-- Explicitly bridge immutable legacy/3D style identifiers to normalized taxonomy.
CREATE TABLE IF NOT EXISTS public.hair_style_taxonomy_bridge (
    legacy_style_id VARCHAR(100) PRIMARY KEY REFERENCES public.hairstyles_catalog(id) ON DELETE RESTRICT,
    taxonomy_id UUID NOT NULL REFERENCES public.hair_taxonomy(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hair_style_taxonomy_bridge_taxonomy ON public.hair_style_taxonomy_bridge(taxonomy_id);

CREATE TABLE IF NOT EXISTS public.professional_skills (
    professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    taxonomy_id UUID NOT NULL REFERENCES public.hair_taxonomy(id) ON DELETE RESTRICT,
    evidence_level VARCHAR(24) NOT NULL DEFAULT 'declared' CHECK (evidence_level IN ('declared','portfolio','verified_service','verified')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (professional_profile_id, taxonomy_id)
);

CREATE TABLE IF NOT EXISTS public.marketplace_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('salon','professional')),
    salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
    professional_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    name VARCHAR(180) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL CHECK (duration_minutes BETWEEN 5 AND 1440),
    buffer_before_minutes INT NOT NULL DEFAULT 0 CHECK (buffer_before_minutes BETWEEN 0 AND 240),
    buffer_after_minutes INT NOT NULL DEFAULT 0 CHECK (buffer_after_minutes BETWEEN 0 AND 240),
    price_amount INT NOT NULL CHECK (price_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'XOF' CHECK (currency ~ '^[A-Z]{3}$'),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    booking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT marketplace_services_provider_context_check CHECK (
        (provider_type='salon' AND salon_id IS NOT NULL AND professional_profile_id IS NULL)
        OR (provider_type='professional' AND salon_id IS NULL AND professional_profile_id IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_marketplace_services_salon ON public.marketplace_services(salon_id) WHERE salon_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_services_professional ON public.marketplace_services(professional_profile_id) WHERE professional_profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_services_bookable ON public.marketplace_services(active, booking_enabled);

CREATE TABLE IF NOT EXISTS public.service_taxonomy_links (
    service_id UUID NOT NULL REFERENCES public.marketplace_services(id) ON DELETE CASCADE,
    taxonomy_id UUID NOT NULL REFERENCES public.hair_taxonomy(id) ON DELETE RESTRICT,
    PRIMARY KEY(service_id, taxonomy_id)
);
CREATE INDEX IF NOT EXISTS idx_service_taxonomy_links_taxonomy ON public.service_taxonomy_links(taxonomy_id);

CREATE TABLE IF NOT EXISTS public.salon_service_professionals (
    service_id UUID NOT NULL REFERENCES public.marketplace_services(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.salon_memberships(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(service_id, membership_id)
);

CREATE OR REPLACE FUNCTION public.enforce_salon_service_professional_context()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_service_salon UUID; v_membership_salon UUID; v_membership_role TEXT; v_membership_status TEXT;
BEGIN
    SELECT salon_id INTO v_service_salon FROM public.marketplace_services WHERE id=NEW.service_id AND provider_type='salon';
    SELECT salon_id, role, status INTO v_membership_salon, v_membership_role, v_membership_status FROM public.salon_memberships WHERE id=NEW.membership_id;
    IF v_service_salon IS NULL OR v_membership_salon IS NULL OR v_service_salon <> v_membership_salon
       OR v_membership_role <> 'professional' OR v_membership_status <> 'active' THEN
        RAISE EXCEPTION 'service_professional_membership_invalid';
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_salon_service_professional_context ON public.salon_service_professionals;
CREATE TRIGGER trg_salon_service_professional_context BEFORE INSERT OR UPDATE ON public.salon_service_professionals
FOR EACH ROW EXECUTE FUNCTION public.enforce_salon_service_professional_context();

-- Public taxonomy is safe. Skills/services stay private until public projections in 13.5.
ALTER TABLE public.hair_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hair_style_taxonomy_bridge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_taxonomy_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_service_professionals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hair_taxonomy_public_active ON public.hair_taxonomy;
CREATE POLICY hair_taxonomy_public_active ON public.hair_taxonomy FOR SELECT USING (active=TRUE);
DROP POLICY IF EXISTS hair_style_taxonomy_bridge_public ON public.hair_style_taxonomy_bridge;
CREATE POLICY hair_style_taxonomy_bridge_public ON public.hair_style_taxonomy_bridge FOR SELECT USING (TRUE);

REVOKE ALL ON public.professional_skills, public.marketplace_services, public.service_taxonomy_links, public.salon_service_professionals FROM anon, authenticated;
GRANT SELECT ON public.hair_taxonomy, public.hair_style_taxonomy_bridge TO anon, authenticated;
GRANT ALL ON public.hair_taxonomy, public.hair_style_taxonomy_bridge, public.professional_skills, public.marketplace_services, public.service_taxonomy_links, public.salon_service_professionals TO service_role;
REVOKE ALL ON FUNCTION public.enforce_salon_service_professional_context() FROM PUBLIC;

-- Idempotent normalized seed. IDs remain stable because slugs are the external identity.
INSERT INTO public.hair_taxonomy(slug,kind,label_fr,aliases,sort_order) VALUES
 ('barber-fades','category','Barber & Fades',ARRAY['barber','fade','dégradé'],10),
 ('braids','category','Tresses',ARRAY['tresses','braids','nattes'],20),
 ('locks-locs','category','Locks & Locs',ARRAY['locks','locs','dreadlocks'],30),
 ('afro-twists','category','Afro & Twists',ARRAY['afro','twists','vanilles'],40),
 ('hair-styling','category','Coiffure',ARRAY['coiffure','styling'],50),
 ('beard','category','Barbe',ARRAY['barbe','beard'],60)
ON CONFLICT (LOWER(slug)) DO NOTHING;

-- PostgreSQL cannot target expression-index conflict with ON CONFLICT(column), so child seeds use WHERE lookup + anti-join.
INSERT INTO public.hair_taxonomy(slug,kind,parent_id,label_fr,aliases,sort_order)
SELECT seed.slug,'style',parent.id,seed.label_fr,seed.aliases,seed.sort_order
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

-- Map existing legacy catalog IDs that are known today. Future IDs can be added without touching hair_asset_versions.
INSERT INTO public.hair_style_taxonomy_bridge(legacy_style_id,taxonomy_id)
SELECT legacy.id, tax.id
FROM (VALUES
 ('fade-1','low-taper-fade'),
 ('locks-1','short-locks'),
 ('tresses-1','cornrows'),
 ('barbe-1','sculpted-beard'),
 ('afro-1','sponge-twists'),
 ('afro-2','burst-fade-mohawk')
) AS legacy(id,slug)
JOIN public.hairstyles_catalog catalog ON catalog.id=legacy.id
JOIN public.hair_taxonomy tax ON lower(tax.slug)=lower(legacy.slug)
ON CONFLICT(legacy_style_id) DO NOTHING;
