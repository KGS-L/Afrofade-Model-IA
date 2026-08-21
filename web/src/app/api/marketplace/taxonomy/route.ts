import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const FALLBACK_TAXONOMY = [
  { id: 'tax-cat-1', slug: 'barber-fades', kind: 'category', parent_id: null, label_fr: 'Barber & Fades', aliases: ['barber', 'fade'], sort_order: 10 },
  { id: 'tax-cat-2', slug: 'braids', kind: 'category', parent_id: null, label_fr: 'Tresses', aliases: ['tresses', 'braids'], sort_order: 20 },
  { id: 'tax-cat-3', slug: 'locks-locs', kind: 'category', parent_id: null, label_fr: 'Locks & Locs', aliases: ['locks', 'locs'], sort_order: 30 },
  { id: 'tax-cat-4', slug: 'afro-twists', kind: 'category', parent_id: null, label_fr: 'Afro & Twists', aliases: ['afro', 'twists'], sort_order: 40 },
  { id: 'tax-style-1', slug: 'low-taper-fade', kind: 'style', parent_id: 'tax-cat-1', label_fr: 'Low Taper Fade', aliases: ['taper fade'], sort_order: 10 },
  { id: 'tax-style-2', slug: 'burst-fade-mohawk', kind: 'style', parent_id: 'tax-cat-1', label_fr: 'Burst Fade Mohawk', aliases: ['burst fade'], sort_order: 20 },
  { id: 'tax-style-3', slug: 'cornrows', kind: 'style', parent_id: 'tax-cat-2', label_fr: 'Cornrows', aliases: ['tresses collées'], sort_order: 10 },
  { id: 'tax-style-4', slug: 'knotless-braids', kind: 'style', parent_id: 'tax-cat-2', label_fr: 'Knotless Braids', aliases: ['knotless'], sort_order: 20 },
  { id: 'tax-style-5', slug: 'short-locks', kind: 'style', parent_id: 'tax-cat-3', label_fr: 'Locks courtes', aliases: ['short locks'], sort_order: 10 },
  { id: 'tax-style-6', slug: 'sponge-twists', kind: 'style', parent_id: 'tax-cat-4', label_fr: 'Sponge Twists', aliases: ['afro twists'], sort_order: 10 },
];

export async function GET() {
  try {
    const { data, error } = await getServiceSupabase().from('hair_taxonomy')
      .select('id,slug,kind,parent_id,label_fr,aliases,sort_order').eq('active', true)
      .order('kind').order('sort_order').order('label_fr');

    if (error || !data || data.length === 0) {
      return NextResponse.json({ taxonomy: FALLBACK_TAXONOMY });
    }
    return NextResponse.json({ taxonomy: data });
  } catch {
    return NextResponse.json({ taxonomy: FALLBACK_TAXONOMY });
  }
}
