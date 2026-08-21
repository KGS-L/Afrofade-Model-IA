import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await getServiceSupabase().from('hair_taxonomy')
      .select('id,slug,kind,parent_id,label_fr,aliases,sort_order').eq('active',true)
      .order('kind').order('sort_order').order('label_fr');
    if (error) throw new Error(error.message);
    return NextResponse.json({ taxonomy: data ?? [] });
  } catch (error) {
    console.error('[Marketplace Taxonomy] failed:', error);
    return NextResponse.json({ error: 'Impossible de charger les styles.' }, { status: 500 });
  }
}
