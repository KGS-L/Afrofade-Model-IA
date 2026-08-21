import { getServiceSupabase } from './marketplace';

export interface HairAssetVersionRecord {
  id: string;
  styleId: string;
  version: number;
  provider: string;
  polygonCount: number;
  status: 'draft' | 'validated' | 'published' | 'retired';
  createdAt: string;
}

export async function listPublishedHairAssets(): Promise<HairAssetVersionRecord[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('hairstyles_catalog')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((h: any) => ({
    id: h.id,
    styleId: h.id,
    version: 1,
    provider: 'trellis2',
    polygonCount: 15000,
    status: 'published',
    createdAt: h.created_at || new Date().toISOString(),
  }));
}
