import { NextRequest,NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

async function requireAdmin(req:NextRequest){const principal=await getVerifiedPrincipal(req);return principal?.role==='admin'?principal:null;}

export async function GET(req:NextRequest){
  const principal=await requireAdmin(req);if(!principal)return NextResponse.json({error:'Accès administrateur requis.'},{status:403});
  try{
    const db=getServiceSupabase();
    const [verificationResult,reportsResult,reviewsResult,auditResult]=await Promise.all([
      db.from('marketplace_verification_requests').select('id,entity_type,professional_profile_id,salon_id,status,evidence,created_at,note').eq('status','pending').order('created_at',{ascending:false}).limit(100),
      db.from('marketplace_reports').select('id,reporter_user_id,entity_type,entity_id,reason,details,status,created_at').in('status',['open','reviewing']).order('created_at',{ascending:false}).limit(100),
      db.from('marketplace_reviews').select('id,target_type,professional_profile_id,salon_id,rating,comment,moderation_status,created_at').in('moderation_status',['flagged','hidden']).order('created_at',{ascending:false}).limit(100),
      db.from('admin_moderation_actions').select('id,action,entity_type,entity_id,note,created_at').order('created_at',{ascending:false}).limit(30),
    ]);
    for(const result of [verificationResult,reportsResult,reviewsResult,auditResult])if(result.error)throw result.error;
    const verification=verificationResult.data||[];
    const proIds=verification.map((v: any)=>v.professional_profile_id).filter(Boolean) as string[];
    const salonIds=verification.map((v: any)=>v.salon_id).filter(Boolean) as string[];
    const [prosResult,salonsResult]=await Promise.all([
      proIds.length?db.from('professional_profiles').select('id,professional_name,slug,verification_status,listing_status').in('id',proIds):Promise.resolve({data:[],error:null}),
      salonIds.length?db.from('salons').select('id,name,slug,verification_status,listing_status').in('id',salonIds):Promise.resolve({data:[],error:null}),
    ]);
    if(prosResult.error)throw prosResult.error;if(salonsResult.error)throw salonsResult.error;
    const pros=new Map((prosResult.data||[]).map((p:any)=>[p.id,p]));const salons=new Map((salonsResult.data||[]).map((s:any)=>[s.id,s]));
    return NextResponse.json({
      verification:verification.map((v: any)=>({...v,entity:v.entity_type==='professional'?pros.get(v.professional_profile_id as string)||null:salons.get(v.salon_id as string)||null})),
      reports:reportsResult.data||[],reviews:reviewsResult.data||[],audit:auditResult.data||[],
    });
  }catch(error){console.error('[Admin Marketplace Moderation GET]',error);return NextResponse.json({error:'Impossible de charger la modération marketplace.'},{status:500});}
}

export async function PATCH(req:NextRequest){
  const principal=await requireAdmin(req);if(!principal)return NextResponse.json({error:'Accès administrateur requis.'},{status:403});
  try{
    const body=await req.json();const kind=typeof body?.kind==='string'?body.kind:'';const id=typeof body?.id==='string'?body.id:'';const action=typeof body?.action==='string'?body.action:'';const note=typeof body?.note==='string'?body.note.trim().slice(0,2000)||null:null;
    if(!id||!kind||!action)return NextResponse.json({error:'Action de modération incomplète.'},{status:400});
    const db=getServiceSupabase();
    if(kind==='verification'){
      if(!['approve','reject'].includes(action))return NextResponse.json({error:'Action invalide.'},{status:400});
      const{data:request,error:requestError}=await db.from('marketplace_verification_requests').select('*').eq('id',id).eq('status','pending').maybeSingle();if(requestError)throw requestError;if(!request)return NextResponse.json({error:'Demande introuvable ou déjà traitée.'},{status:404});
      const entityId=request.entity_type==='professional'?request.professional_profile_id:request.salon_id;const table=request.entity_type==='professional'?'professional_profiles':'salons';
      const{data:before,error:beforeError}=await db.from(table).select('*').eq('id',entityId).maybeSingle();if(beforeError)throw beforeError;if(!before)return NextResponse.json({error:'Entité introuvable.'},{status:404});
      const verificationStatus=action==='approve'?'verified':'rejected';const{data:after,error:updateEntityError}=await db.from(table).update({verification_status:verificationStatus,updated_at:new Date().toISOString()}).eq('id',entityId).select('*').single();if(updateEntityError)throw updateEntityError;
      const{error:updateRequestError}=await db.from('marketplace_verification_requests').update({status:action==='approve'?'approved':'rejected',reviewed_by:principal.user.id,reviewed_at:new Date().toISOString(),note}).eq('id',id);if(updateRequestError)throw updateRequestError;
      await db.from('admin_moderation_actions').insert({admin_user_id:principal.user.id,action:`verification_${action}`,entity_type:request.entity_type,entity_id:entityId,before_state:before,after_state:after,note});
      return NextResponse.json({ok:true});
    }
    if(kind==='review'){
      const nextStatus=action==='publish'?'published':action==='hide'?'hidden':action==='remove'?'removed':null;if(!nextStatus)return NextResponse.json({error:'Action invalide.'},{status:400});
      const{data:before,error:beforeError}=await db.from('marketplace_reviews').select('*').eq('id',id).maybeSingle();if(beforeError)throw beforeError;if(!before)return NextResponse.json({error:'Avis introuvable.'},{status:404});
      const{data:after,error:updateError}=await db.from('marketplace_reviews').update({moderation_status:nextStatus,updated_at:new Date().toISOString()}).eq('id',id).select('*').single();if(updateError)throw updateError;
      await db.from('admin_moderation_actions').insert({admin_user_id:principal.user.id,action:`review_${action}`,entity_type:'review',entity_id:id,before_state:before,after_state:after,note});return NextResponse.json({ok:true});
    }
    if(kind==='report'){
      const nextStatus=action==='review'?'reviewing':action==='resolve'?'resolved':action==='dismiss'?'dismissed':null;if(!nextStatus)return NextResponse.json({error:'Action invalide.'},{status:400});
      const{data:before,error:beforeError}=await db.from('marketplace_reports').select('*').eq('id',id).maybeSingle();if(beforeError)throw beforeError;if(!before)return NextResponse.json({error:'Signalement introuvable.'},{status:404});
      const patch:any={status:nextStatus};if(nextStatus==='resolved'||nextStatus==='dismissed'){patch.resolved_by=principal.user.id;patch.resolved_at=new Date().toISOString();}
      const{data:after,error:updateError}=await db.from('marketplace_reports').update(patch).eq('id',id).select('*').single();if(updateError)throw updateError;
      await db.from('admin_moderation_actions').insert({admin_user_id:principal.user.id,action:`report_${action}`,entity_type:before.entity_type,entity_id:before.entity_id,before_state:before,after_state:after,note});return NextResponse.json({ok:true});
    }
    return NextResponse.json({error:'Type de modération invalide.'},{status:400});
  }catch(error){console.error('[Admin Marketplace Moderation PATCH]',error);return NextResponse.json({error:'Impossible d’appliquer cette action.'},{status:500});}
}
