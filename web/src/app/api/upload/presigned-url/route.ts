import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getVerifiedPrincipal } from '@/lib/server-auth';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(request);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const body = await request.json();
    const filename = typeof body?.filename === 'string' ? body.filename : '';
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType.toLowerCase() : '';
    const fileSize = Number(body?.fileSize ?? 0);

    if (!filename || !mimeType || !Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: 'filename, mimeType et fileSize valides sont requis.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: 'Format d’image non supporté (JPG, PNG ou WEBP).' }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (maximum 10 Mo par image).' }, { status: 400 });
    }

    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const ownerPrefix = principal.salonId
      ? `salons/${principal.salonId}`
      : `users/${principal.user.id}`;
    const storagePath = `${ownerPrefix}/${crypto.randomUUID()}_${cleanFilename}`;

    const supabaseAdmin = getServiceSupabase();
    const { data, error } = await supabaseAdmin.storage
      .from('client-photos')
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error('[Upload] Unable to create signed upload URL:', error?.message);
      return NextResponse.json({ error: 'Impossible de préparer l’envoi du fichier.' }, { status: 502 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
    });
  } catch (err: unknown) {
    console.error('[Upload Route]', err);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
