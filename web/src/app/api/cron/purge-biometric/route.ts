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
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      console.error('[Biometric Purge] CRON_SECRET is not configured.');
      return NextResponse.json({ error: 'Cron not configured.' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const supabaseAdmin = getServiceSupabase();
    const { data: expiredHeads, error: queryError } = await supabaseAdmin
      .from('clients_heads')
      .select('id, photos_urls, mesh_3d_url, expires_at')
      .eq('is_saved_permanently', false)
      .lt('expires_at', new Date().toISOString());

    if (queryError) throw new Error(queryError.message);

    const headsToPurge = expiredHeads || [];
    let freedStorageFilesCount = 0;

    for (const head of headsToPurge) {
      if (!Array.isArray(head.photos_urls)) continue;
      for (const photoUrl of head.photos_urls) {
        if (typeof photoUrl !== 'string' || !photoUrl.includes('client-photos/')) continue;
        const path = photoUrl.split('client-photos/')[1]?.split('?')[0];
        if (!path) continue;

        const { error: storageError } = await supabaseAdmin.storage.from('client-photos').remove([path]);
        if (!storageError) freedStorageFilesCount += 1;
      }
    }

    let deletedCount = 0;
    if (headsToPurge.length > 0) {
      const idsToDelete = headsToPurge.map((head) => head.id);
      const { error: deleteError } = await supabaseAdmin.from('clients_heads').delete().in('id', idsToDelete);
      if (deleteError) throw new Error(deleteError.message);
      deletedCount = idsToDelete.length;
    }

    return NextResponse.json({
      success: true,
      purgedCount: deletedCount,
      freedStorageFiles: freedStorageFilesCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la purge biométrique';
    console.error('[Biometric Purge]', message);
    return NextResponse.json({ error: 'Erreur lors de la purge biométrique.' }, { status: 500 });
  }
}
