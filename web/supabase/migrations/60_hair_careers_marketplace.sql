-- Afrofade Database Migration 60: hair-industry careers and recruitment
-- BMAD Stories 16.1, 16.4, 16.5 and 16.6

CREATE TABLE IF NOT EXISTS public.job_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  city VARCHAR(120),
  neighborhood VARCHAR(160),
  work_mode VARCHAR(20) NOT NULL DEFAULT 'onsite' CHECK(work_mode IN ('onsite','mobile','hybrid')),
  experience_min_years SMALLINT NOT NULL DEFAULT 0 CHECK(experience_min_years BETWEEN 0 AND 50),
  compensation_min INT CHECK(compensation_min IS NULL OR compensation_min>=0),
  compensation_max INT CHECK(compensation_max IS NULL OR compensation_max>=0),
  currency VARCHAR(3) NOT NULL DEFAULT 'XOF',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','closed','archived')),
  moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(moderation_status IN ('pending','approved','rejected','removed')),
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(compensation_max IS NULL OR compensation_min IS NULL OR compensation_max>=compensation_min)
);
CREATE INDEX IF NOT EXISTS idx_job_postings_public ON public.job_postings(status,moderation_status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_postings_salon ON public.job_postings(salon_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.job_posting_skills (
  job_posting_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  taxonomy_id UUID NOT NULL REFERENCES public.hair_taxonomy(id) ON DELETE RESTRICT,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY(job_posting_id,taxonomy_id)
);

CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_posting_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE RESTRICT,
  applicant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE RESTRICT,
  status VARCHAR(24) NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','viewed','shortlisted','interview','offered','hired','rejected','withdrawn','closed')),
  message TEXT,
  profile_snapshot JSONB NOT NULL CHECK(jsonb_typeof(profile_snapshot)='object'),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_posting_id,professional_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON public.job_applications(job_posting_id,status,submitted_at);
CREATE INDEX IF NOT EXISTS idx_job_applications_professional ON public.job_applications(professional_profile_id,submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.job_application_events (
  id BIGSERIAL PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  from_status VARCHAR(24),
  to_status VARCHAR(24) NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.career_hire_handoffs (
  application_id UUID PRIMARY KEY REFERENCES public.job_applications(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  invitation_id UUID REFERENCES public.salon_invitations(id) ON DELETE SET NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'awaiting_invitation' CHECK(status IN ('awaiting_invitation','invitation_created','accepted','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.salon_invitations ADD COLUMN IF NOT EXISTS career_application_id UUID REFERENCES public.job_applications(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.log_job_application_event() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.job_application_events(application_id,from_status,to_status,actor_user_id) VALUES(NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,auth.uid()); END IF;
 IF NEW.status='hired' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'hired') THEN
   INSERT INTO public.career_hire_handoffs(application_id,salon_id,professional_profile_id)
   SELECT NEW.id,j.salon_id,NEW.professional_profile_id FROM public.job_postings j WHERE j.id=NEW.job_posting_id ON CONFLICT(application_id) DO NOTHING;
 END IF;
 RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS trg_job_application_event ON public.job_applications;
CREATE TRIGGER trg_job_application_event AFTER INSERT OR UPDATE OF status ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.log_job_application_event();

CREATE OR REPLACE FUNCTION public.submit_job_application(p_job_id UUID,p_message TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j public.job_postings%ROWTYPE;p public.professional_profiles%ROWTYPE;aid UUID;snapshot JSONB;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required';END IF;
 SELECT * INTO j FROM public.job_postings WHERE id=p_job_id AND status='published' AND moderation_status='approved' AND (deadline IS NULL OR deadline>NOW());
 IF NOT FOUND THEN RAISE EXCEPTION 'job_not_available';END IF;
 SELECT * INTO p FROM public.professional_profiles WHERE user_id=auth.uid();IF NOT FOUND THEN RAISE EXCEPTION 'professional_profile_required';END IF;
 snapshot:=jsonb_build_object('professionalName',p.professional_name,'headline',p.headline,'city',p.city,'jobSeekingStatus',p.job_seeking_status,
   'skills',(SELECT COALESCE(jsonb_agg(jsonb_build_object('slug',ht.slug,'label',ht.label_fr,'evidence',ps.evidence_level)),'[]'::jsonb) FROM public.professional_skills ps JOIN public.hair_taxonomy ht ON ht.id=ps.taxonomy_id WHERE ps.professional_profile_id=p.id),
   'portfolioCount',(SELECT count(*) FROM public.professional_portfolio_items pi WHERE pi.professional_profile_id=p.id AND pi.publication_status='published' AND pi.moderation_status='approved'));
 INSERT INTO public.job_applications(job_posting_id,applicant_user_id,professional_profile_id,message,profile_snapshot) VALUES(j.id,auth.uid(),p.id,left(p_message,3000),snapshot) RETURNING id INTO aid;RETURN aid;
END$$;

CREATE OR REPLACE FUNCTION public.transition_job_application(p_application_id UUID,p_to_status TEXT,p_note TEXT DEFAULT NULL)
RETURNS public.job_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.job_applications%ROWTYPE;j public.job_postings%ROWTYPE;allowed BOOLEAN:=FALSE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required';END IF;
 SELECT * INTO a FROM public.job_applications WHERE id=p_application_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'application_not_found';END IF;
 SELECT * INTO j FROM public.job_postings WHERE id=a.job_posting_id;
 IF a.applicant_user_id=auth.uid() THEN allowed:=p_to_status='withdrawn' AND a.status IN ('submitted','viewed','shortlisted','interview','offered');
 ELSIF public.marketplace_can_manage_salon(auth.uid(),j.salon_id) THEN
  allowed:=CASE a.status WHEN 'submitted' THEN p_to_status IN ('viewed','shortlisted','rejected') WHEN 'viewed' THEN p_to_status IN ('shortlisted','rejected') WHEN 'shortlisted' THEN p_to_status IN ('interview','rejected') WHEN 'interview' THEN p_to_status IN ('offered','rejected') WHEN 'offered' THEN p_to_status IN ('hired','rejected') ELSE FALSE END;
 END IF;
 IF NOT allowed THEN RAISE EXCEPTION 'application_transition_forbidden';END IF;
 UPDATE public.job_applications SET status=p_to_status,updated_at=NOW() WHERE id=a.id RETURNING * INTO a;
 IF p_note IS NOT NULL AND btrim(p_note)<>'' THEN UPDATE public.job_application_events SET note=left(p_note,2000) WHERE id=(SELECT max(id) FROM public.job_application_events WHERE application_id=a.id);END IF;
 RETURN a;
END$$;

CREATE OR REPLACE FUNCTION public.prepare_hire_membership_invitation(p_application_id UUID,p_token_hash TEXT,p_expires_at TIMESTAMPTZ)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.job_applications%ROWTYPE;j public.job_postings%ROWTYPE;email TEXT;inv UUID;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required';END IF;
 SELECT * INTO a FROM public.job_applications WHERE id=p_application_id AND status='hired';IF NOT FOUND THEN RAISE EXCEPTION 'hired_application_required';END IF;
 SELECT * INTO j FROM public.job_postings WHERE id=a.job_posting_id;IF NOT public.marketplace_can_manage_salon(auth.uid(),j.salon_id) THEN RAISE EXCEPTION 'salon_manage_forbidden';END IF;
 SELECT u.email INTO email FROM auth.users u WHERE u.id=a.applicant_user_id;IF email IS NULL THEN RAISE EXCEPTION 'candidate_email_missing';END IF;
 INSERT INTO public.salon_invitations(salon_id,invited_email,role,invited_by,token_hash,expires_at,career_application_id)
 VALUES(j.salon_id,lower(email),'professional',auth.uid(),p_token_hash,p_expires_at,a.id)
 ON CONFLICT(salon_id,lower(invited_email)) WHERE status='pending' DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at,career_application_id=EXCLUDED.career_application_id,updated_at=NOW() RETURNING id INTO inv;
 UPDATE public.career_hire_handoffs SET invitation_id=inv,status='invitation_created',updated_at=NOW() WHERE application_id=a.id;RETURN inv;
END$$;

CREATE OR REPLACE FUNCTION public.sync_career_handoff_acceptance() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$BEGIN IF NEW.status='accepted' AND NEW.career_application_id IS NOT NULL THEN UPDATE public.career_hire_handoffs SET status='accepted',invitation_id=NEW.id,updated_at=NOW() WHERE application_id=NEW.career_application_id;END IF;RETURN NEW;END$$;
DROP TRIGGER IF EXISTS trg_sync_career_handoff_acceptance ON public.salon_invitations;
CREATE TRIGGER trg_sync_career_handoff_acceptance AFTER UPDATE OF status ON public.salon_invitations FOR EACH ROW EXECUTE FUNCTION public.sync_career_handoff_acceptance();

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;ALTER TABLE public.job_posting_skills ENABLE ROW LEVEL SECURITY;ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;ALTER TABLE public.job_application_events ENABLE ROW LEVEL SECURITY;ALTER TABLE public.career_hire_handoffs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jobs_public_published ON public.job_postings;CREATE POLICY jobs_public_published ON public.job_postings FOR SELECT USING(status='published' AND moderation_status='approved');
DROP POLICY IF EXISTS applications_own_select ON public.job_applications;CREATE POLICY applications_own_select ON public.job_applications FOR SELECT TO authenticated USING(applicant_user_id=auth.uid());
REVOKE ALL ON public.job_postings,public.job_posting_skills,public.job_applications,public.job_application_events,public.career_hire_handoffs FROM anon,authenticated;GRANT SELECT ON public.job_postings,public.job_posting_skills TO anon,authenticated;GRANT SELECT ON public.job_applications TO authenticated;GRANT ALL ON public.job_postings,public.job_posting_skills,public.job_applications,public.job_application_events,public.career_hire_handoffs TO service_role;
REVOKE ALL ON FUNCTION public.submit_job_application(UUID,TEXT),public.transition_job_application(UUID,TEXT,TEXT),public.prepare_hire_membership_invitation(UUID,TEXT,TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_job_application(UUID,TEXT),public.transition_job_application(UUID,TEXT,TEXT),public.prepare_hire_membership_invitation(UUID,TEXT,TIMESTAMPTZ) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.log_job_application_event(),public.sync_career_handoff_acceptance() FROM PUBLIC;
