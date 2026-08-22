import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

function num(value: string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const lat = num(params.get('lat'));
    const lng = num(params.get('lng'));
    if ((lat === null) !== (lng === null)) return NextResponse.json({ error: 'Latitude et longitude doivent être fournies ensemble.' }, { status: 400 });
    if (lat !== null && (lat < -90 || lat > 90 || lng! < -180 || lng! > 180)) return NextResponse.json({ error: 'Coordonnées invalides.' }, { status: 400 });
    const radius = Math.min(Math.max(Number(params.get('radius') || 25000), 1000), 500000);
    const limit = Math.min(Math.max(Number(params.get('limit') || 20), 1), 50);
    const offset = Math.max(Number(params.get('offset') || 0), 0);
    const providerType = params.get('type');
    if (providerType && !['all','salon','professional'].includes(providerType)) return NextResponse.json({ error: 'Type de résultat invalide.' }, { status: 400 });

    const { data, error } = await getServiceSupabase().rpc('search_marketplace_providers', {
      p_query: params.get('q') || null,
      p_style_slug: params.get('style') || null,
      p_provider_type: providerType || 'all',
      p_lat: lat,
      p_lng: lng,
      p_radius_m: Math.trunc(radius),
      p_city: params.get('city') || null,
      p_limit: Math.trunc(limit),
      p_offset: Math.trunc(offset),
    });

    if (error) {
      // Échec de la recherche : réponse dégradée explicite — jamais de
      // résultats factices présentés comme réels.
      console.error('[Marketplace Discover] RPC search unavailable:', error.message);
      return NextResponse.json(
        { results: [], degraded: true, error: 'Recherche indisponible pour le moment.' },
        { status: 503 } );
    }

    return NextResponse.json({ results: data ?? [], pagination: { limit: Math.trunc(limit), offset: Math.trunc(offset), hasMore: (data?.length ?? 0) === Math.trunc(limit) } });
  } catch (error) {
    console.error('[Marketplace Discover] unexpected error:', error);
    return NextResponse.json(
      { results: [], degraded: true, error: 'Recherche indisponible pour le moment.' },
      { status: 503 } );
  }
}
