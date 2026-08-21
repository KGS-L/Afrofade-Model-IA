-- Afrofade Database Migration 26: professional portfolio metadata + private bucket
-- BMAD Story 13.3

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('portfolio','portfolio',FALSE,8388608,ARRAY['image/jpeg','image/png','image/webp']::TEXT[])
ON CONFLICT(id) DO UPDATE SET public=FALSE,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.professional_portfolio_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bucket TEXT NOT NULL DEFAULT 'portfolio' CHECK (bucket='portfolio'),
    storage_path TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes BETWEEN 1 AND 8388608),
    title VARCHAR(160),
    description TEXT,
    moderation_status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected','hidden')),
    publication_status VARCHAR(24) NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published','archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT professional_portfolio_owner_fk
        FOREIGN KEY (professional_profile_id, owner_user_id)
        REFERENCES public.professional_profiles(id,user_id) ON DELETE CASCADE,
    CONSTRAINT professional_portfolio_path_owner_check
        CHECK (storage_path LIKE ('professionals/' || professional_profile_id::TEXT || '/%') AND storage_path NOT LIKE '%..%')
);
CREATE INDEX IF NOT EXISTS idx_professional_portfolio_profile ON public.professional_portfolio_items(professional_profile_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_professional_portfolio_public ON public.professional_portfolio_items(professional_profile_id,publication_status,moderation_status);

CREATE TABLE IF NOT EXISTS public.portfolio_taxonomy_links (
    portfolio_item_id UUID NOT NULL REFERENCES public.professional_portfolio_items(id) ON DELETE CASCADE,
    taxonomy_id UUID NOT NULL REFERENCES public.hair_taxonomy(id) ON DELETE RESTRICT,
    PRIMARY KEY(portfolio_item_id,taxonomy_id)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_taxonomy_taxonomy ON public.portfolio_taxonomy_links(taxonomy_id);

ALTER TABLE public.professional_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_taxonomy_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.professional_portfolio_items, public.portfolio_taxonomy_links FROM anon, authenticated;
GRANT ALL ON public.professional_portfolio_items, public.portfolio_taxonomy_links TO service_role;

-- No broad storage.objects browser policies are introduced. Signed upload/read URLs
-- are mediated by server routes that derive professional ownership from auth user.
COMMENT ON TABLE public.professional_portfolio_items IS
 'Private portfolio metadata. Public media requires approved+published projection and signed delivery.';
