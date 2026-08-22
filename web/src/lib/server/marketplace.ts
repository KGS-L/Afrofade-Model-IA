import { getServiceSupabase } from '@/lib/supabase';
export { getServiceSupabase };
import {
  ProfessionalProfile,
  SalonMembership,
  SalonMembershipRole,
  SalonMembershipState,
} from '@/lib/types/marketplace';

/**
 * Story 12.3: Get or create professional profile for an authenticated user
 */
export async function getProfessionalProfile(userId: string): Promise<ProfessionalProfile | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('professional_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching professional profile:', error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    fullName: data.full_name,
    headline: data.headline,
    bio: data.bio,
    operatingMode: data.operating_mode,
    jobSeekingState: data.job_seeking_state,
    city: data.city,
    neighborhood: data.neighborhood,
    serviceRadiusKm: data.service_radius_km,
    verificationState: data.verification_state,
    listingState: data.listing_state,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Story 12.3: Upsert professional profile
 */
export async function upsertProfessionalProfile(
  userId: string,
  payload: Partial<Omit<ProfessionalProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<ProfessionalProfile> {
  const supabase = getServiceSupabase();

  const row = {
    user_id: userId,
    ...(payload.fullName !== undefined && { full_name: payload.fullName }),
    ...(payload.headline !== undefined && { headline: payload.headline }),
    ...(payload.bio !== undefined && { bio: payload.bio }),
    ...(payload.operatingMode !== undefined && { operating_mode: payload.operatingMode }),
    ...(payload.jobSeekingState !== undefined && { job_seeking_state: payload.jobSeekingState }),
    ...(payload.city !== undefined && { city: payload.city }),
    ...(payload.neighborhood !== undefined && { neighborhood: payload.neighborhood }),
    ...(payload.serviceRadiusKm !== undefined && { service_radius_km: payload.serviceRadiusKm }),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('professional_profiles')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert professional profile: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    fullName: data.full_name,
    headline: data.headline,
    bio: data.bio,
    operatingMode: data.operating_mode,
    jobSeekingState: data.job_seeking_state,
    city: data.city,
    neighborhood: data.neighborhood,
    serviceRadiusKm: data.service_radius_km,
    verificationState: data.verification_state,
    listingState: data.listing_state,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Story 12.3: Public professional profile (filters out non-published/unverified)
 */
export async function getPublicProfessionalProfile(userId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('professional_profiles')
    .select('id, full_name, headline, bio, operating_mode, city, neighborhood, service_radius_km, verification_state, listing_state')
    .eq('user_id', userId)
    .eq('listing_state', 'published')
    .eq('verification_state', 'verified')
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

/**
 * Story 12.4: Get all active memberships for a user
 */
export async function getUserSalonMemberships(userId: string): Promise<SalonMembership[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('salon_memberships')
    .select('*')
    .eq('user_id', userId);

  if (error || !data) return [];

  return data.map((m: any) => ({
    id: m.id,
    userId: m.user_id,
    salonId: m.salon_id,
    role: m.role as SalonMembershipRole,
    state: m.state as SalonMembershipState,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }));
}

/**
 * Story 12.4: Create salon and grant creator owner membership
 */
export async function createSalonWithOwner(
  userId: string,
  salonData: { name: string; phone?: string; country?: string; plan?: string }
) {
  const supabase = getServiceSupabase();

  const { data: salon, error: salonError } = await supabase
    .from('salons')
    .insert({
      name: salonData.name,
      phone: salonData.phone || null,
      country: salonData.country || "Côte d'Ivoire",
      plan: salonData.plan || 'PRO',
    })
    .select()
    .single();

  if (salonError) {
    throw new Error(`Failed to create salon: ${salonError.message}`);
  }

  const { error: membershipError } = await supabase
    .from('salon_memberships')
    .insert({
      user_id: userId,
      salon_id: salon.id,
      role: 'owner',
      state: 'active',
    });

  if (membershipError) {
    throw new Error(`Failed to create salon membership: ${membershipError.message}`);
  }

  return salon;
}
