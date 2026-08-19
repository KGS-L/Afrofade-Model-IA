import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  return handlePurge(request);
}

export async function POST(request: NextRequest) {
  return handlePurge(request);
}

function generatedFilename(meshUrl: unknown): string | null {
  if (typeof meshUrl !== 'string') return null;
  const match = meshUrl.match(/^\/api\/v1\/models\/(recon_[0-9]+\.glb)$/);
  return match?.[1] || null;
}

async function deleteGeneratedModel(filename: string): Promise<boolean> {
  const backendUrl = process.env.API_INTERNAL_URL;
  const internalSecret = process.env.API_INTERNAL_SECRET;
  if (!backendUrl || !internalSecret) return false;

  try {
    const response = await fetch(`${backendUrl}/api/v1/models/${filename}`, {
      method: 'DELETE',
      headers: { 'X-Internal-API-Key': internalSecret },
      cache: 'no-store',
    });
    return response.ok;
  } catch (error) {
    console.warn('[Biometric Purge] generated model deletion failed:', error);
    return false;
  }
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
    const now = new Date().toISOString();
    const [salonResult, customerResult] = await Promise.all([
      supabaseAdmin
        .from('clients_heads')
        .select('id, photos_urls, mesh_3d_url, expires_at')
        .eq('is_saved_permanently', false)
        .lt('expires_at', now),
      supabaseAdmin
        .from('customer_heads')
        .select('id, mesh_3d_url, expires_at')
        .eq('is_saved_permanently', false)
        .lt('expires_at', now),
    ]);

    if (salonResult.error) throw new Error(salonResult.error.message);
    if (customerResult.error) throw new Error(customerResult.error.message);

    const salonHeads = salonResult.data || [];
    const customerHeads = customerResult.data || [];
    let freedStorageFilesCount = 0;
    let freedGeneratedModels = 0;

    for (const head of salonHeads) {
      if (Array.isArray(head.photos_urls)) {
        for (const photoUrl of head.photos_urls) {
          if (typeof photoUrl !== 'string' || !photoUrl.includes('client-photos/')) continue;
          const path = photoUrl.split('client-photos/')[1]?.split('?')[0];
          if (!path) continue;
          const { error } = await supabaseAdmin.storage.from('client-photos').remove([path]);
          if (!error) freedStorageFilesCount += 1;
        }
      }
      const filename = generatedFilename(head.mesh_3d_url);
      if (filename && await deleteGeneratedModel(filename)) freedGeneratedModels += 1;
    }

    for (const head of customerHeads) {
      const filename = generatedFilename(head.mesh_3d_url);
      if (filename && await deleteGeneratedModel(filename)) freedGeneratedModels += 1;
    }

    if (salonHeads.length > 0) {
      const { error } = await supabaseAdmin.from('clients_heads').delete().in('id', salonHeads.map((head) => head.id));
      if (error) throw new Error(error.message);
    }
    if (customerHeads.length > 0) {
      const { error } = await supabaseAdmin.from('customer_heads').delete().in('id', customerHeads.map((head) => head.id));
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      purgedSalonHeads: salonHeads.length,
      purgedCustomerHeads: customerHeads.length,
      freedStorageFiles: freedStorageFilesCount,
      freedGeneratedModels,
      timestamp: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la purge biométrique';
    console.error('[Biometric Purge]', message);
    return NextResponse.json({ error: 'Erreur lors de la purge biométrique.' }, { status: 500 });
  }
}
