import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

const ALLOWED = new Set(['image/jpeg','image/png','image/webp']);
const MAX = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    const body = await req.json();
    const filename = typeof body?.filename === 'string' ? body.filename.trim() : '';
    const mimeType = body?.mimeType === 'image/jpg' ? 'image/jpeg' : typeof body?.mimeType === 'string' ? body.mimeType.toLowerCase() : '';
    const fileSize = Number(body?.fileSize || 0);
    if (!filename || !ALLOWED.has(mimeType) || !Number.isFinite(fileSize) || fileSize < 1 || fileSize > MAX) {
      return NextResponse.json({ error: 'Image invalide (JPG, PNG ou WEBP, 8 Mo max).' }, { status: 400 });
    }
    const supabase = getServiceSupabase();
    const { data: profile, error: profileError } = await supabase.from('professional_profiles').select('id').eq('user_id', principal.user.id).maybeSingle();
    if (profileError && profileError.code !== 'PGRST116') throw new Error(profileError.message);
    if (!profile) return NextResponse.json({ error: 'Créez d’abord votre profil professionnel.' }, { status: 409 });
    const clean = filename.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100) || 'portfolio.jpg';
    const path = `professionals/${profile.id}/${crypto.randomUUID()}_${clean}`;
    const { data, error } = await supabase.storage.from('portfolio').createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message || 'signed_upload_failed');
    return NextResponse.json({ storageRef: { bucket: 'portfolio', path: data.path }, signedUrl: data.signedUrl, token: data.token, contentType: mimeType, fileSize });
  } catch (error) {
    console.error('[Portfolio Upload] failed:', error);
    return NextResponse.json({ error: 'Impossible de préparer cet envoi.' }, { status: 500 });
  }
}
