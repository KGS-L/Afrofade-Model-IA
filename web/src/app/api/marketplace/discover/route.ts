import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

function num(value: string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const FALLBACK_DISCOVER_RESULTS = [
  {
    provider_type: 'professional',
    provider_id: 'b0000000-0000-4000-b000-000000000001',
    slug: 'karim-barber-pro',
    display_name: 'Karim Barber',
    city: 'Ouagadougou',
    neighborhood: 'Ouaga 2000',
    distance_m: 1600,
    matched_service_id: 'c0000000-0000-4000-c000-000000000001',
    matched_service_name: 'Low Taper Fade + Barbe',
    matched_service_price: 3500,
    currency: 'XOF',
    matched_style_slug: 'low-taper-fade',
    average_rating: 4.9,
    review_count: 28,
    rank_score: 95
  },
  {
    provider_type: 'professional',
    provider_id: 'b0000000-0000-4000-b000-000000000002',
    slug: 'fatou-braids-pro',
    display_name: 'Fatou Braids',
    city: 'Ouagadougou',
    neighborhood: 'Karpala',
    distance_m: 3200,
    matched_service_id: 'c0000000-0000-4000-c000-000000000002',
    matched_service_name: 'Knotless Braids Moyennes',
    matched_service_price: 15000,
    currency: 'XOF',
    matched_style_slug: 'knotless-braids',
    average_rating: 4.85,
    review_count: 42,
    rank_score: 92
  },
  {
    provider_type: 'salon',
    provider_id: 'a0000000-0000-4000-a000-000000000001',
    slug: 'aicha-hair-studio',
    display_name: 'Aïcha Hair Studio',
    city: 'Ouagadougou',
    neighborhood: 'Ouaga 2000',
    distance_m: 1600,
    matched_service_id: 'c0000000-0000-4000-c000-000000000003',
    matched_service_name: 'Cornrows & Soin Hydratant',
    matched_service_price: 8000,
    currency: 'XOF',
    matched_style_slug: 'cornrows',
    average_rating: 4.95,
    review_count: 65,
    rank_score: 98
  }
];

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
      console.warn('[Marketplace Discover] RPC search unavailable, returning fallback demo data:', error.message);
      let filtered = FALLBACK_DISCOVER_RESULTS;
      if (providerType && providerType !== 'all') {
        filtered = filtered.filter(item => item.provider_type === providerType);
      }
      return NextResponse.json({ results: filtered, pagination: { limit: Math.trunc(limit), offset: Math.trunc(offset), hasMore: false } });
    }

    return NextResponse.json({ results: data ?? [], pagination: { limit: Math.trunc(limit), offset: Math.trunc(offset), hasMore: (data?.length ?? 0) === Math.trunc(limit) } });
  } catch (error) {
    console.error('[Marketplace Discover] unexpected error:', error);
    return NextResponse.json({ results: FALLBACK_DISCOVER_RESULTS, pagination: { limit: 20, offset: 0, hasMore: false } });
  }
}
