import { getServiceSupabase } from './marketplace';

export type Capability =
  | 'MARKETPLACE_PUBLIC_LISTING'
  | 'MULTI_LOCATION_MANAGEMENT'
  | 'STAFF_RECRUITMENT'
  | 'DIRECT_BOOKING_ACCEPTANCE'
  | 'UNLIMITED_3D_RECONSTRUCTION';

export interface UserCapabilitiesResult {
  userId: string;
  salonId?: string;
  roles: string[];
  capabilities: Capability[];
}

/**
 * Story 12.5: Server-authoritative capability & entitlement resolver
 */
export async function resolveUserCapabilities(
  userId: string,
  salonId?: string
): Promise<UserCapabilitiesResult> {
  const supabase = getServiceSupabase();
  const capabilities = new Set<Capability>();
  const roles: string[] = [];

  // 1. Check user_profiles role
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (userProfile?.role) {
    roles.push(userProfile.role);
    if (userProfile.role === 'admin') {
      return {
        userId,
        salonId,
        roles: ['admin'],
        capabilities: [
          'MARKETPLACE_PUBLIC_LISTING',
          'MULTI_LOCATION_MANAGEMENT',
          'STAFF_RECRUITMENT',
          'DIRECT_BOOKING_ACCEPTANCE',
          'UNLIMITED_3D_RECONSTRUCTION',
        ],
      };
    }
  }

  // 2. Check professional profile listing state & entitlement
  const { data: proProfile } = await supabase
    .from('professional_profiles')
    .select('verification_state, listing_state')
    .eq('user_id', userId)
    .maybeSingle();

  if (proProfile?.listing_state === 'published' && proProfile?.verification_state === 'verified') {
    capabilities.add('MARKETPLACE_PUBLIC_LISTING');
    capabilities.add('DIRECT_BOOKING_ACCEPTANCE');
  }

  // 3. Check salon membership and salon plan entitlement
  if (salonId) {
    const { data: membership } = await supabase
      .from('salon_memberships')
      .select('role, state')
      .eq('user_id', userId)
      .eq('salon_id', salonId)
      .eq('state', 'active')
      .maybeSingle();

    if (membership) {
      roles.push(`salon_${membership.role}`);
      
      const { data: salon } = await supabase
        .from('salons')
        .select('plan')
        .eq('id', salonId)
        .maybeSingle();

      const plan = salon?.plan || 'PRO';

      if (membership.role === 'owner' || membership.role === 'manager') {
        capabilities.add('DIRECT_BOOKING_ACCEPTANCE');

        if (plan === 'VIP' || plan === 'EXTRA') {
          capabilities.add('STAFF_RECRUITMENT');
        }
        if (plan === 'EXTRA') {
          capabilities.add('MULTI_LOCATION_MANAGEMENT');
          capabilities.add('UNLIMITED_3D_RECONSTRUCTION');
        }
      } else if (membership.role === 'professional') {
        capabilities.add('DIRECT_BOOKING_ACCEPTANCE');
      }
    }
  }

  return {
    userId,
    salonId,
    roles,
    capabilities: Array.from(capabilities),
  };
}

export function hasCapability(
  result: UserCapabilitiesResult,
  required: Capability
): boolean {
  return result.capabilities.includes(required);
}
