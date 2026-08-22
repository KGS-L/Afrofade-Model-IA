import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req:NextRequest){
  const type=req.nextUrl.searchParams.get('type'); const provider=req.nextUrl.searchParams.get('provider');
  if(!provider||!['professional','salon'].includes(type||''))return NextResponse.json({error:'Contexte de réservation invalide.'},{status:400});
  try{
    const db=getServiceSupabase();
    const providerColumn=type==='professional'?'professional_profile_id':'salon_id';
    const {data:services,error}=await db.from('marketplace_services').select('id,name,description,duration_minutes,price_amount,currency').eq('provider_type',type!).eq(providerColumn,provider).eq('active',true).eq('booking_enabled',true).order('price_amount');
    if(error)throw error;
    let team:any[]=[];
    if(type==='salon'&&services?.length){
      const ids=services.map((s: any)=>s.id); const {data,error:teamError}=await db.from('salon_service_professionals').select('service_id,membership_id,salon_memberships!inner(id,professional_profile_id,professional_profiles(id,professional_name,slug))').in('service_id',ids);
      if(teamError)throw teamError; team=data||[];
    }
    return NextResponse.json({services:services||[],team});
  }catch(error){console.error('[Booking Options]',error);return NextResponse.json({error:'Impossible de charger les prestations.'},{status:500});}
}
