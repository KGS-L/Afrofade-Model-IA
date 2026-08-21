import { createClient } from '@supabase/supabase-js';
import { NextRequest,NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';
function userDb(token:string){const url=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'');const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';return createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}})}

export async function GET(req:NextRequest){
 const principal=await getVerifiedPrincipal(req);if(!principal)return NextResponse.json({error:'Authentification requise.'},{status:401});
 try{const db=getServiceSupabase();const salonId=req.nextUrl.searchParams.get('salon');
  if(salonId){const{data:m}=await db.from('salon_memberships').select('role').eq('salon_id',salonId).eq('user_id',principal.user.id).eq('status','active').in('role',['owner','manager']).maybeSingle();if(!m)return NextResponse.json({error:'Contexte salon interdit.'},{status:403});const{data,error}=await db.from('job_applications').select('id,status,message,profile_snapshot,submitted_at,updated_at,job_postings!inner(id,title,salon_id),professional_profiles(id,slug,professional_name,headline)').eq('job_postings.salon_id',salonId).order('submitted_at',{ascending:false});if(error)throw error;return NextResponse.json({applications:data||[]});}
  const{data,error}=await db.from('job_applications').select('id,status,message,profile_snapshot,submitted_at,updated_at,job_postings(id,title,city,neighborhood,salons(id,slug,name))').eq('applicant_user_id',principal.user.id).order('submitted_at',{ascending:false});if(error)throw error;return NextResponse.json({applications:data||[]});
 }catch(error){console.error('[Careers Applications GET]',error);return NextResponse.json({error:'Impossible de charger les candidatures.'},{status:500});}
}
export async function POST(req:NextRequest){
 const principal=await getVerifiedPrincipal(req);if(!principal)return NextResponse.json({error:'Authentification requise.'},{status:401});
 try{const body=await req.json();const jobId=typeof body?.jobId==='string'?body.jobId:'';const message=typeof body?.message==='string'?body.message.slice(0,3000):null;if(!jobId)return NextResponse.json({error:'Offre requise.'},{status:400});const{data,error}=await userDb(principal.accessToken).rpc('submit_job_application',{p_job_id:jobId,p_message:message});if(error){const m=error.message||'';if(m.includes('professional_profile_required'))return NextResponse.json({error:'Créez d’abord votre profil professionnel.',needsProfessionalProfile:true},{status:409});if(m.includes('job_not_available'))return NextResponse.json({error:'Cette offre n’est plus disponible.'},{status:409});if(m.toLowerCase().includes('duplicate'))return NextResponse.json({error:'Vous avez déjà postulé à cette offre.'},{status:409});throw error;}return NextResponse.json({applicationId:data},{status:201});}catch(error){console.error('[Careers Applications POST]',error);return NextResponse.json({error:'Impossible d’envoyer la candidature.'},{status:500});}
}
export async function PATCH(req:NextRequest){
 const principal=await getVerifiedPrincipal(req);if(!principal)return NextResponse.json({error:'Authentification requise.'},{status:401});
 try{const body=await req.json();const id=typeof body?.applicationId==='string'?body.applicationId:'';const status=typeof body?.status==='string'?body.status:'';const note=typeof body?.note==='string'?body.note:null;if(!id||!status)return NextResponse.json({error:'Candidature et statut requis.'},{status:400});const{data,error}=await userDb(principal.accessToken).rpc('transition_job_application',{p_application_id:id,p_to_status:status,p_note:note});if(error){if((error.message||'').includes('application_transition_forbidden'))return NextResponse.json({error:'Transition non autorisée.'},{status:403});throw error;}return NextResponse.json({application:data});}catch(error){console.error('[Careers Applications PATCH]',error);return NextResponse.json({error:'Impossible de modifier la candidature.'},{status:500});}
}
