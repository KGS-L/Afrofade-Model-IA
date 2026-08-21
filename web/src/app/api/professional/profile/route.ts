import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

const OPERATING_MODES = new Set(['independent', 'mobile', 'studio', 'hybrid', 'salon_only']);
const JOB_SEEKING = new Set(['not_looking', 'open', 'actively_looking']);

function cleanString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanNullable(value: unknown, max: number): string | null {
  const cleaned = cleanString(value, max);
  return cleaned || null;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function GET(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const { data, error } = await getServiceSupabase()
      .from('professional_profiles')
      .select('id, slug, professional_name, headline, bio, operating_mode, job_seeking_status, verification_status, listing_status, service_radius_m, city, neighborhood, created_at, updated_at')
      .eq('user_id', principal.user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return NextResponse.json({ profile: data ?? null });
  } catch (error) {
    console.error('[Professional Profile] GET failed:', error);
    return NextResponse.json({ error: 'Impossible de charger votre profil professionnel.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const body = await req.json();
    const professionalName = cleanString(body?.professionalName, 160);
    const headline = cleanNullable(body?.headline, 180);
    const bio = cleanNullable(body?.bio, 2000);
    const city = cleanNullable(body?.city, 120);
    const neighborhood = cleanNullable(body?.neighborhood, 160);
    const operatingMode = cleanString(body?.operatingMode, 32);
    const jobSeekingStatus = cleanString(body?.jobSeekingStatus, 24) || 'not_looking';
    const requestedSlug = cleanString(body?.slug, 80);
    const slug = requestedSlug ? slugify(requestedSlug) : slugify(professionalName);
    const radiusRaw = body?.serviceRadiusM;
    const serviceRadiusM = radiusRaw === null || radiusRaw === undefined || radiusRaw === '' ? null : Number(radiusRaw);

    if (!professionalName) return NextResponse.json({ error: 'Le nom professionnel est requis.' }, { status: 400 });
    if (!slug || slug.length < 3) return NextResponse.json({ error: 'Choisissez un identifiant public valide.' }, { status: 400 });
    if (!OPERATING_MODES.has(operatingMode)) return NextResponse.json({ error: 'Mode d’activité invalide.' }, { status: 400 });
    if (!JOB_SEEKING.has(jobSeekingStatus)) return NextResponse.json({ error: 'Statut de recherche d’emploi invalide.' }, { status: 400 });
    if (serviceRadiusM !== null && (!Number.isInteger(serviceRadiusM) || serviceRadiusM < 0 || serviceRadiusM > 500000)) {
      return NextResponse.json({ error: 'Rayon de service invalide.' }, { status: 400 });
    }

    const supabaseAdmin = getServiceSupabase();
    const payload = {
      user_id: principal.user.id,
      slug,
      professional_name: professionalName,
      headline,
      bio,
      operating_mode: operatingMode,
      job_seeking_status: jobSeekingStatus,
      service_radius_m: serviceRadiusM,
      city,
      neighborhood,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('professional_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('id, slug, professional_name, headline, bio, operating_mode, job_seeking_status, verification_status, listing_status, service_radius_m, city, neighborhood, created_at, updated_at')
      .single();

    if (error?.code === '23505') return NextResponse.json({ error: 'Cet identifiant professionnel est déjà utilisé.' }, { status: 409 });
    if (error) throw new Error(error.message);

    return NextResponse.json({ profile: data }, { status: 200 });
  } catch (error) {
    console.error('[Professional Profile] PUT failed:', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer votre profil professionnel.' }, { status: 500 });
  }
}
