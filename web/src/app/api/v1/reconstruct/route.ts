import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(request);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const body = await request.json();
    const payloadPhotos = body?.photos_urls || body?.photos;

    if (!Array.isArray(payloadPhotos) || payloadPhotos.length === 0) {
      return NextResponse.json({ error: 'Au moins une photo client est requise.' }, { status: 400 });
    }

    if (payloadPhotos.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 photos sont autorisées.' }, { status: 400 });
    }

    const backendUrl = process.env.API_INTERNAL_URL;
    const internalSecret = process.env.API_INTERNAL_SECRET;
    if (!backendUrl || !internalSecret) {
      console.error('[Reconstruct Proxy] API_INTERNAL_URL/API_INTERNAL_SECRET missing.');
      return NextResponse.json({ error: 'Service 3D indisponible.' }, { status: 503 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${backendUrl}/api/v1/reconstruct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': internalSecret,
        },
        body: JSON.stringify({
          ...body,
          photos_urls: payloadPhotos,
          salon_id: principal.salonId || principal.user.id,
        }),
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.error(`[Reconstruct Proxy] Backend ${response.status}: ${detail.slice(0, 300)}`);
        return NextResponse.json({ error: 'La reconstruction 3D a échoué.' }, { status: response.status });
      }

      return NextResponse.json(await response.json());
    } catch (fetchError) {
      console.error('[Reconstruct Proxy] Backend unreachable:', fetchError);
      return NextResponse.json({ error: 'Le moteur 3D est temporairement indisponible.' }, { status: 503 });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('[Reconstruct Proxy]', error);
    return NextResponse.json({ error: 'Erreur interne lors de la reconstruction 3D.' }, { status: 500 });
  }
}
