import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req:NextRequest){
  const serviceId=req.nextUrl.searchParams.get('service');
  const from=req.nextUrl.searchParams.get('from');
  const to=req.nextUrl.searchParams.get('to');
  if(!serviceId||!from||!to)return NextResponse.json({error:'service, from et to sont requis.'},{status:400});
  try{
    const {data,error}=await getServiceSupabase().rpc('list_service_availability',{p_service_id:serviceId,p_from:from,p_to:to});
    if(error)throw error;
    return NextResponse.json({slots:(data||[]).filter((slot:any)=>Number(slot.available_professionals)>0)});
  }catch(error){console.error('[Booking Availability]',error);return NextResponse.json({error:'Impossible de charger les créneaux.'},{status:500});}
}
