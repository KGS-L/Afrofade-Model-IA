import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, mimeType, fileSize, salonId = 'demo-salon' } = body;

    if (!filename || !mimeType) {
      return NextResponse.json(
        { error: 'Filename et mimeType requis.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      return NextResponse.json(
        { error: 'Format d’image non supporté (utilisez JPG, PNG ou WEBP).' },
        { status: 400 }
      );
    }

    if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (maximum 10 Mo par image).' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `salons/${salonId}/${timestamp}_${cleanFilename}`;

    const supabaseAdmin = getServiceSupabase();

    // Create signed upload URL from Supabase Storage bucket 'client-photos'
    const { data, error } = await supabaseAdmin.storage
      .from('client-photos')
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.warn('Supabase Storage error (using fallback public URL):', error.message);
      const publicUrl = `https://placeholder-storage.supabase.co/client-photos/${storagePath}`;
      return NextResponse.json({
        uploadUrl: publicUrl,
        publicUrl,
        path: storagePath,
      });
    }

    const { data: publicData } = supabaseAdmin.storage
      .from('client-photos')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: publicData.publicUrl,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erreur interne du serveur';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
