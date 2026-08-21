import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params; const supabase = getServiceSupabase();
    const { data: salon, error } = await supabase.from('salons').select('id,slug,name,headline,description,logo_url,verification_status,listing_status,address_line1,address_line2,city,neighborhood,public_phone,country,booking_confirmation_mode').eq('slug',slug).eq('verification_status','verified').eq('listing_status','published').maybeSingle();
    if (error && error.code !== 'PGRST116') throw new Error(error.message); if (!salon) return NextResponse.json({ error: 'Salon introuvable.' }, { status: 404 });
    const { data: entitled, error: entitlementError } = await supabase.rpc('marketplace_salon_subscription_active',{p_salon_id:salon.id}); if (entitlementError) throw new Error(entitlementError.message); if (!entitled) return NextResponse.json({ error: 'Salon introuvable.' }, { status: 404 });
    const [servicesResult,membersResult,aggregateResult,reviewsResult] = await Promise.all([
      supabase.from('marketplace_services').select('id,name,description,duration_minutes,price_amount,currency,service_taxonomy_links(hair_taxonomy(slug,label_fr)),salon_service_professionals(membership_id)').eq('provider_type','salon').eq('salon_id',salon.id).eq('active',true).eq('booking_enabled',true).order('price_amount'),
      supabase.from('salon_memberships').select('id,role,professional_profile_id').eq('salon_id',salon.id).eq('status','active').eq('role','professional').not('professional_profile_id','is',null),
      supabase.from('marketplace_review_aggregates').select('average_rating,review_count').eq('target_type','salon').eq('target_id',salon.id).maybeSingle(),
      supabase.from('marketplace_reviews').select('id,rating,comment,created_at').eq('salon_id',salon.id).eq('moderation_status','published').order('created_at',{ascending:false}).limit(12),
    ]);
    for(const result of [servicesResult,membersResult,aggregateResult,reviewsResult]) if(result.error&&result.error.code!=='PGRST116')throw new Error(result.error.message);
    const professionalIds=(membersResult.data??[]).map(m=>m.professional_profile_id).filter(Boolean) as string[]; let team:Array<Record<string,unknown>>=[];
    if(professionalIds.length){const {data,error:teamError}=await supabase.from('professional_profiles').select('id,slug,professional_name,headline,verification_status,listing_status').in('id',professionalIds).eq('verification_status','verified').eq('listing_status','published');if(teamError)throw new Error(teamError.message);team=data??[];}
    return NextResponse.json({salon:{id:salon.id,slug:salon.slug,name:salon.name,headline:salon.headline,description:salon.description,logoUrl:salon.logo_url,address:{line1:salon.address_line1,line2:salon.address_line2,city:salon.city,neighborhood:salon.neighborhood,country:salon.country},phone:salon.public_phone,bookingConfirmationMode:salon.booking_confirmation_mode,verificationStatus:salon.verification_status},services:servicesResult.data??[],team,rating:{average:Number(aggregateResult.data?.average_rating||0),count:Number(aggregateResult.data?.review_count||0)},reviews:reviewsResult.data??[],bookable:true});
  } catch(error){console.error('[Public Salon] failed:',error);return NextResponse.json({error:'Impossible de charger ce salon.'},{status:500});}
}
