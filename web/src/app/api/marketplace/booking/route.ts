import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';

function getUserScopedClient(accessToken:string){
  const url=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'');
  const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
  if(!url||!anon)throw new Error('Supabase public credentials missing');
  return createClient(url,anon,{global:{headers:{Authorization:`Bearer ${accessToken}`}},auth:{persistSession:false,autoRefreshToken:false}});
}

export async function POST(req:NextRequest){
  try{
    const principal=await getVerifiedPrincipal(req);
    if(!principal)return NextResponse.json({error:'Authentification requise.',needsAuth:true},{status:401});
    const body=await req.json(); const serviceId=typeof body?.serviceId==='string'?body.serviceId:''; const startsAt=typeof body?.startsAt==='string'?body.startsAt:''; const membershipId=typeof body?.membershipId==='string'&&body.membershipId?body.membershipId:null; const note=typeof body?.note==='string'?body.note.slice(0,1000):null;
    if(!serviceId||!startsAt||Number.isNaN(Date.parse(startsAt)))return NextResponse.json({error:'Prestation ou créneau invalide.'},{status:400});
    const db=getUserScopedClient(principal.accessToken);
    const {data,error}=await db.rpc('create_marketplace_booking',{p_service_id:serviceId,p_starts_at:startsAt,p_membership_id:membershipId,p_customer_note:note});
    if(error){
      const message=error.message||'';
      if(message.includes('booking_no_professional_available')||message.includes('marketplace_bookings_no_professional_overlap'))return NextResponse.json({error:'Ce créneau vient d’être pris. Choisissez-en un autre.'},{status:409});
      if(message.includes('booking_service_unavailable'))return NextResponse.json({error:'Cette prestation n’est plus disponible.'},{status:409});
      throw error;
    }
    return NextResponse.json({bookingId:data},{status:201});
  }catch(error){console.error('[Booking Create]',error);return NextResponse.json({error:'Impossible de confirmer la réservation.'},{status:500});}
}
