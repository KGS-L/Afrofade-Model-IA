import { createHash,randomBytes } from 'crypto';
import { NextRequest,NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getUserScopedClient as userDb } from '@/lib/supabase';
export async function POST(req:NextRequest){
 const principal=await getVerifiedPrincipal(req);if(!principal)return NextResponse.json({error:'Authentification requise.'},{status:401});
 try{const body=await req.json();const applicationId=typeof body?.applicationId==='string'?body.applicationId:'';if(!applicationId)return NextResponse.json({error:'Candidature requise.'},{status:400});const token=randomBytes(32).toString('base64url');const hash=createHash('sha256').update(token).digest('hex');const expiresAt=new Date(Date.now()+7*24*3600*1000).toISOString();const{data,error}=await userDb(principal.accessToken).rpc('prepare_hire_membership_invitation',{p_application_id:applicationId,p_token_hash:hash,p_expires_at:expiresAt});if(error){const m=error.message||'';if(m.includes('hired_application_required'))return NextResponse.json({error:'La candidature doit être marquée comme recrutée.'},{status:409});if(m.includes('salon_manage_forbidden'))return NextResponse.json({error:'Action non autorisée pour ce salon.'},{status:403});throw error;}return NextResponse.json({invitationId:data,acceptPath:`/invitation?token=${encodeURIComponent(token)}`,expiresAt});}catch(error){console.error('[Careers Hire Invitation]',error);return NextResponse.json({error:'Impossible de préparer l’invitation.'},{status:500});}
}
