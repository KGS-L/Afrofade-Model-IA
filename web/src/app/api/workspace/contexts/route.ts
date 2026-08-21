import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

export type WorkspaceContextPayload =
  | { key: 'personal'; type: 'personal'; id: null; label: string; role: 'customer' }
  | { key: string; type: 'professional'; id: string; label: string; role: 'professional'; verificationStatus: string; listingStatus: string }
  | { key: string; type: 'salon'; id: string; label: string; role: 'owner' | 'manager' | 'professional'; city: string | null; neighborhood: string | null }
  | { key: 'admin'; type: 'admin'; id: null; label: string; role: 'admin' };

export async function GET(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    const supabase = getServiceSupabase();
    const [professionalResult, membershipsResult] = await Promise.all([
      supabase.from('professional_profiles')
        .select('id, professional_name, verification_status, listing_status')
        .eq('user_id', principal.user.id).maybeSingle(),
      supabase.from('salon_memberships')
        .select('salon_id, role, status, salons(id, name, city, neighborhood)')
        .eq('user_id', principal.user.id).eq('status', 'active').order('created_at', { ascending: true }),
    ]);
    if (professionalResult.error && professionalResult.error.code !== 'PGRST116') throw new Error(professionalResult.error.message);
    if (membershipsResult.error) throw new Error(membershipsResult.error.message);

    const contexts: WorkspaceContextPayload[] = [
      { key: 'personal', type: 'personal', id: null, label: 'Mon espace personnel', role: 'customer' },
    ];

    const professional = professionalResult.data;
    if (professional) {
      contexts.push({
        key: `professional:${professional.id}`,
        type: 'professional',
        id: professional.id,
        label: professional.professional_name || 'Mon activité professionnelle',
        role: 'professional',
        verificationStatus: professional.verification_status,
        listingStatus: professional.listing_status,
      });
    }

    for (const membership of membershipsResult.data ?? []) {
      const relation = Array.isArray(membership.salons) ? membership.salons[0] : membership.salons;
      if (!relation || !['owner', 'manager', 'professional'].includes(membership.role)) continue;
      contexts.push({
        key: `salon:${membership.salon_id}`,
        type: 'salon',
        id: membership.salon_id,
        label: relation.name || 'Salon Afrofade',
        role: membership.role as 'owner' | 'manager' | 'professional',
        city: relation.city ?? null,
        neighborhood: relation.neighborhood ?? null,
      });
    }

    if (principal.role === 'admin') contexts.push({ key: 'admin', type: 'admin', id: null, label: 'Administration Afrofade', role: 'admin' });

    return NextResponse.json({ contexts, legacy: { role: principal.role, salonId: principal.salonId } });
  } catch (error) {
    console.error('[Workspace Contexts] failed:', error);
    return NextResponse.json({ error: 'Impossible de charger vos espaces.' }, { status: 500 });
  }
}
