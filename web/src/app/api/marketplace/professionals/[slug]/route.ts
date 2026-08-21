import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params; const supabase = getServiceSupabase();
    const { data: profile, error } = await supabase.from('professional_profiles').select('id,slug,professional_name,headline,bio,operating_mode,job_seeking_status,verification_status,listing_status,service_radius_m,city,neighborhood,location_visibility').eq('slug', slug).eq('verification_status','verified').eq('listing_status','published').maybeSingle();
    if (error && error.code !== 'PGRST116') throw new Error(error.message); if (!profile) return NextResponse.json({ error: 'Professionnel introuvable.' }, { status: 404 });
    const { data: entitled, error: entitlementError } = await supabase.rpc('marketplace_professional_subscription_active', { p_professional_profile_id: profile.id }); if (entitlementError) throw new Error(entitlementError.message); if (!entitled) return NextResponse.json({ error: 'Professionnel introuvable.' }, { status: 404 });
    const [skillsResult, servicesResult, portfolioResult, membershipsResult, aggregateResult, reviewsResult] = await Promise.all([
      supabase.from('professional_skills').select('evidence_level,hair_taxonomy(id,slug,label_fr,kind)').eq('professional_profile_id',profile.id),
      supabase.from('marketplace_services').select('id,name,description,duration_minutes,price_amount,currency,service_taxonomy_links(hair_taxonomy(slug,label_fr))').eq('provider_type','professional').eq('professional_profile_id',profile.id).eq('active',true).eq('booking_enabled',true).order('price_amount'),
      supabase.from('professional_portfolio_items').select('id,bucket,storage_path,title,description,portfolio_taxonomy_links(hair_taxonomy(slug,label_fr))').eq('professional_profile_id',profile.id).eq('moderation_status','approved').eq('publication_status','published').order('created_at',{ascending:false}).limit(24),
      supabase.from('salon_memberships').select('salon_id,role,salons(id,slug,name,city,neighborhood,verification_status,listing_status)').eq('professional_profile_id',profile.id).eq('status','active'),
      supabase.from('marketplace_review_aggregates').select('average_rating,review_count').eq('target_type','professional').eq('target_id',profile.id).maybeSingle(),
      supabase.from('marketplace_reviews').select('id,rating,comment,created_at').eq('professional_profile_id',profile.id).eq('moderation_status','published').order('created_at',{ascending:false}).limit(12),
    ]);
    for (const result of [skillsResult,servicesResult,portfolioResult,membershipsResult,aggregateResult,reviewsResult]) if (result.error && result.error.code!=='PGRST116') throw new Error(result.error.message);
    const portfolio = await Promise.all((portfolioResult.data ?? []).map(async (item) => { const signed = await supabase.storage.from(item.bucket).createSignedUrl(item.storage_path, 900); return { ...item, storage_path: undefined, bucket: undefined, imageUrl: signed.data?.signedUrl ?? null }; }));
    const affiliations = (membershipsResult.data ?? []).flatMap((membership) => { const salon = Array.isArray(membership.salons) ? membership.salons[0] : membership.salons; if (!salon || salon.verification_status !== 'verified' || salon.listing_status !== 'published') return []; return [{ id: salon.id, slug: salon.slug, name: salon.name, city: salon.city, neighborhood: salon.neighborhood, role: membership.role }]; });
    return NextResponse.json({ profile: { id: profile.id, slug: profile.slug, name: profile.professional_name, headline: profile.headline, bio: profile.bio, operatingMode: profile.operating_mode, city: profile.city, neighborhood: ['neighborhood','approximate','precise'].includes(profile.location_visibility) ? profile.neighborhood : null, serviceRadiusM: profile.service_radius_m, verificationStatus: profile.verification_status }, skills: skillsResult.data ?? [], services: servicesResult.data ?? [], portfolio, affiliations, rating:{average:Number(aggregateResult.data?.average_rating||0),count:Number(aggregateResult.data?.review_count||0)}, reviews:reviewsResult.data??[], bookable: true });
  } catch (error) { console.error('[Public Professional] failed:', error); return NextResponse.json({ error: 'Impossible de charger ce professionnel.' }, { status: 500 }); }
}
