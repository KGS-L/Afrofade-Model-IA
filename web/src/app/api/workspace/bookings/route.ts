import { NextRequest,NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase, getUserScopedClient as userDb } from '@/lib/supabase';

export async function GET(req:NextRequest){
  const principal=await getVerifiedPrincipal(req);if(!principal)return NextResponse.json({error:'Authentification requise.'},{status:401});
  const context=req.nextUrl.searchParams.get('context')||'personal'; const db=getServiceSupabase();
  let query=db.from('marketplace_bookings').select('id,status,starts_at,ends_at,service_name_snapshot,duration_minutes_snapshot,price_amount_snapshot,currency_snapshot,target_type,salon_id,professional_profile_id,assigned_professional_profile_id,visual_brief_snapshot,created_at').order('starts_at',{ascending:true}).limit(100);
  if(context==='personal')query=query.eq('customer_user_id',principal.user.id);
  else if(context.startsWith('professional:')){const id=context.slice('professional:'.length);const {data}=await db.from('professional_profiles').select('id').eq('id',id).eq('user_id',principal.user.id).maybeSingle();if(!data)return NextResponse.json({error:'Contexte interdit.'},{status:403});query=query.eq('assigned_professional_profile_id',id);}
  else if(context.startsWith('salon:')){const salonId=context.slice('salon:'.length);const {data:membership}=await db.from('salon_memberships').select('role,professional_profile_id').eq('salon_id',salonId).eq('user_id',principal.user.id).eq('status','active').maybeSingle();if(!membership)return NextResponse.json({error:'Contexte interdit.'},{status:403});query=query.eq('salon_id',salonId);if(membership.role==='professional')query=query.eq('assigned_professional_profile_id',membership.professional_profile_id);}
  else return NextResponse.json({error:'Contexte invalide.'},{status:400});
  const {data,error}=await query;if(error)return NextResponse.json({error:'Impossible de charger les réservations.'},{status:500});return NextResponse.json({bookings:data||[]});
}

export async function PATCH(req:NextRequest){
  const principal=await getVerifiedPrincipal(req);if(!principal)return NextResponse.json({error:'Authentification requise.'},{status:401});
  try{const body=await req.json();const bookingId=typeof body?.bookingId==='string'?body.bookingId:'';const status=typeof body?.status==='string'?body.status:'';const note=typeof body?.note==='string'?body.note:null;if(!bookingId||!status)return NextResponse.json({error:'Réservation et statut requis.'},{status:400});const {data,error}=await userDb(principal.accessToken).rpc('transition_marketplace_booking',{p_booking_id:bookingId,p_to_status:status,p_note:note});if(error){if((error.message||'').includes('booking_transition_forbidden'))return NextResponse.json({error:'Transition non autorisée.'},{status:403});throw error;}return NextResponse.json({booking:data});}catch(error){console.error('[Workspace Booking Transition]',error);return NextResponse.json({error:'Impossible de modifier la réservation.'},{status:500});}
}
