-- Afrofade Database Migration 06: private durable asset buckets
-- BMAD Story 7.4 — buckets are private; signed URLs/tokens are delivery mechanisms.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'client-photos',
    'client-photos',
    FALSE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('heads', 'heads', FALSE),
    ('hair-assets', 'hair-assets', FALSE),
    ('tryons', 'tryons', FALSE)
ON CONFLICT (id) DO UPDATE
SET public = FALSE;

-- No broad storage.objects browser policies are created here.
-- Upload/read/delete authorization is mediated by authenticated server routes,
-- short-lived signed URLs/tokens and service-role worker operations.
