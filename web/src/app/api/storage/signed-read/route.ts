import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';
import { isStoredAssetRef, type StoredAssetRef } from '@/lib/storage-types';

function normalizedExpiresIn(value: unknown): number {
  const parsed = Number(value ?? 300);
  if (!Number.isFinite(parsed)) return 300;
  return Math.min(Math.max(Math.trunc(parsed), 30), 3600);
}

function principalOwnsAsset(
  principal: NonNullable<Awaited<ReturnType<typeof getVerifiedPrincipal>>>,
  asset: StoredAssetRef
): boolean {
  if (asset.bucket === 'hair-assets') {
    // Catalogue reads will get a dedicated published-asset policy later.
    return principal.role === 'admin';
  }

  const prefixes = [`users/${principal.user.id}/`];
  if (principal.salonId) prefixes.push(`salons/${principal.salonId}/`);

  if (asset.bucket === 'client-photos' || asset.bucket === 'heads' || asset.bucket === 'tryons') {
    return prefixes.some((prefix) => asset.path.startsWith(prefix));
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(request);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const body = await request.json();
    const storageRef = body?.storageRef;
    if (!isStoredAssetRef(storageRef)) {
      return NextResponse.json({ error: 'Référence de stockage invalide.' }, { status: 400 });
    }

    if (!principalOwnsAsset(principal, storageRef)) {
      return NextResponse.json({ error: 'Accès refusé à cet asset.' }, { status: 403 });
    }

    const expiresIn = normalizedExpiresIn(body?.expiresIn);
    const supabaseAdmin = getServiceSupabase();
    const { data, error } = await supabaseAdmin.storage
      .from(storageRef.bucket)
      .createSignedUrl(storageRef.path, expiresIn);

    if (error || !data?.signedUrl) {
      console.error('[Storage Signed Read] Unable to create URL:', error?.message);
      return NextResponse.json({ error: 'Impossible de signer la lecture de cet asset.' }, { status: 502 });
    }

    return NextResponse.json({
      storageRef,
      signedUrl: data.signedUrl,
      expiresIn,
    });
  } catch (error) {
    console.error('[Storage Signed Read]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
