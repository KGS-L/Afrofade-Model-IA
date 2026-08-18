import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

const FILENAME_PATTERN = /^recon_[0-9]+\.glb$/;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const principal = await getVerifiedPrincipal(request);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const { filename } = await context.params;
    if (!FILENAME_PATTERN.test(filename)) {
      return NextResponse.json({ error: 'Nom de modèle invalide.' }, { status: 400 });
    }

    const meshUrl = `/api/v1/models/${filename}`;
    const supabaseAdmin = getServiceSupabase();
    let authorized = false;

    if (principal.role === 'customer') {
      const { data, error } = await supabaseAdmin
        .from('customer_heads')
        .select('id')
        .eq('user_id', principal.user.id)
        .eq('mesh_3d_url', meshUrl)
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      authorized = Boolean(data);
    } else if (principal.role === 'salon' && principal.salonId) {
      const { data, error } = await supabaseAdmin
        .from('clients_heads')
        .select('id')
        .eq('salon_id', principal.salonId)
        .eq('mesh_3d_url', meshUrl)
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      authorized = Boolean(data);
    }

    if (!authorized) return NextResponse.json({ error: 'Accès au modèle refusé.' }, { status: 403 });

    const backendUrl = process.env.API_INTERNAL_URL;
    const internalSecret = process.env.API_INTERNAL_SECRET;
    if (!backendUrl || !internalSecret) {
      return NextResponse.json({ error: 'Service 3D indisponible.' }, { status: 503 });
    }

    const backendResponse = await fetch(`${backendUrl}/api/v1/models/${filename}`, {
      headers: { 'X-Internal-API-Key': internalSecret },
      cache: 'no-store',
    });

    if (!backendResponse.ok) {
      return NextResponse.json({ error: 'Modèle 3D introuvable.' }, { status: backendResponse.status });
    }

    const bytes = await backendResponse.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[Generated Model Proxy] failed:', error);
    return NextResponse.json({ error: 'Impossible de charger le modèle 3D.' }, { status: 500 });
  }
}
