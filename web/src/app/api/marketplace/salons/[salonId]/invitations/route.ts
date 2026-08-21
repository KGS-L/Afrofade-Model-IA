import { createHash, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

function cleanEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase().slice(0, 254) : '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ salonId: string }> }) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    const { salonId } = await params;
    const body = await req.json();
    const email = cleanEmail(body?.email);
    const role = body?.role === 'manager' ? 'manager' : body?.role === 'professional' ? 'professional' : '';
    if (!email) return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 });
    if (!role) return NextResponse.json({ error: 'Rôle d’invitation invalide.' }, { status: 400 });

    const token = randomUUID();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await getServiceSupabase().rpc('create_salon_invitation', {
      p_actor_user_id: principal.user.id,
      p_salon_id: salonId,
      p_invited_email: email,
      p_role: role,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    });

    if (error) {
      if (error.message.includes('salon_manage_forbidden')) return NextResponse.json({ error: 'Vous ne pouvez pas gérer cette équipe.' }, { status: 403 });
      if (error.message.includes('manager_cannot_grant_manager')) return NextResponse.json({ error: 'Un manager ne peut inviter que des professionnels.' }, { status: 403 });
      throw new Error(error.message);
    }

    const origin = new URL(req.url).origin;
    return NextResponse.json({
      invitation: data,
      inviteToken: token,
      acceptUrl: `${origin}/invitations/salon?token=${encodeURIComponent(token)}`,
      expiresAt,
    }, { status: 201 });
  } catch (error) {
    console.error('[Salon Invitation] POST failed:', error);
    return NextResponse.json({ error: 'Impossible de créer cette invitation.' }, { status: 500 });
  }
}
