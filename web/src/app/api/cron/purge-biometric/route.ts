import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  return handlePurge(request);
}

export async function POST(request: NextRequest) {
  return handlePurge(request);
}

async function handlePurge(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecretParam = request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || 'afrofade_biometric_purge_secret_key';

    const isAuthorized =
      authHeader === `Bearer ${expectedSecret}` || cronSecretParam === expectedSecret;

    if (!isAuthorized && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Non autorisé. Clé CRON_SECRET requise.' },
        { status: 401 }
      );
    }

    const supabaseAdmin = getServiceSupabase();

    // 1. Fetch unsaved client heads where expires_at < NOW()
    const { data: expiredHeads, error: queryError } = await supabaseAdmin
      .from('clients_heads')
      .select('id, photo_urls, mesh_glb_url, expires_at')
      .eq('is_saved_permanently', false)
      .lt('expires_at', new Date().toISOString());

    if (queryError) {
      console.warn('Erreur lors de la recherche des têtes 3D expirées:', queryError.message);
    }

    const headsToPurge = expiredHeads || [];
    let freedStorageFilesCount = 0;

    // 2. Remove files from Supabase Storage bucket 'client-photos'
    for (const head of headsToPurge) {
      if (Array.isArray(head.photo_urls)) {
        for (const photoUrl of head.photo_urls) {
          if (typeof photoUrl === 'string' && photoUrl.includes('client-photos/')) {
            const path = photoUrl.split('client-photos/')[1];
            if (path) {
              await supabaseAdmin.storage.from('client-photos').remove([path]);
              freedStorageFilesCount++;
            }
          }
        }
      }
    }

    // 3. Delete expired database records
    let deletedCount = 0;
    if (headsToPurge.length > 0) {
      const idsToDelete = headsToPurge.map((h) => h.id);
      const { error: deleteError } = await supabaseAdmin
        .from('clients_heads')
        .delete()
        .in('id', idsToDelete);

      if (!deleteError) {
        deletedCount = idsToDelete.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Purge biométrique 30 jours (CEDEAO) exécutée avec succès.',
      purgedCount: deletedCount,
      freedStorageFiles: freedStorageFilesCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la purge biométrique';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
