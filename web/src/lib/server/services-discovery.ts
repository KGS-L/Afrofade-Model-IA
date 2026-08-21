import { getServiceSupabase } from './marketplace';

export interface BookableServiceItem {
  id: string;
  providerType: 'salon' | 'independent_professional';
  salonId?: string;
  professionalProfileId?: string;
  name: string;
  description?: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceFcfa: number;
  isActive: boolean;
}

export async function searchBookableServices(params: {
  salonId?: string;
  professionalProfileId?: string;
}): Promise<BookableServiceItem[]> {
  const supabase = getServiceSupabase();
  let query = supabase.from('bookable_services').select('*').eq('is_active', true);

  if (params.salonId) {
    query = query.eq('salon_id', params.salonId);
  }
  if (params.professionalProfileId) {
    query = query.eq('professional_profile_id', params.professionalProfileId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((s: any) => ({
    id: s.id,
    providerType: s.provider_type,
    salonId: s.salon_id,
    professionalProfileId: s.professional_profile_id,
    name: s.name,
    description: s.description,
    durationMinutes: s.duration_minutes,
    bufferBeforeMinutes: s.buffer_before_minutes,
    bufferAfterMinutes: s.buffer_after_minutes,
    priceFcfa: s.price_fcfa,
    isActive: s.is_active,
  }));
}

export async function createBookableService(
  userId: string,
  payload: Omit<BookableServiceItem, 'id' | 'isActive'>
) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('bookable_services')
    .insert({
      provider_type: payload.providerType,
      salon_id: payload.salonId || null,
      professional_profile_id: payload.professionalProfileId || null,
      name: payload.name,
      description: payload.description || null,
      duration_minutes: payload.durationMinutes,
      buffer_before_minutes: payload.bufferBeforeMinutes || 0,
      buffer_after_minutes: payload.bufferAfterMinutes || 0,
      price_fcfa: payload.priceFcfa,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create bookable service: ${error.message}`);
  }
  return data;
}

export async function getProviderPortfolio(professionalProfileId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('professional_profile_id', professionalProfileId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function addPortfolioItem(
  professionalProfileId: string,
  item: { imageUrl: string; title?: string; description?: string; styleId?: string }
) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('portfolio_items')
    .insert({
      professional_profile_id: professionalProfileId,
      image_url: item.imageUrl,
      title: item.title || null,
      description: item.description || null,
      style_id: item.styleId || null,
      is_published: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add portfolio item: ${error.message}`);
  }
  return data;
}
