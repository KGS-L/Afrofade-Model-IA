import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (!principal.user.email) return NextResponse.json({ error: 'Votre compte doit avoir une adresse email.' }, { status: 409 });
    const body = await req.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token || token.length > 200) return NextResponse.json({ error: 'Invitation invalide.' }, { status: 400 });

    const { data, error } = await getServiceSupabase().rpc('accept_salon_invitation', {
      p_actor_user_id: principal.user.id,
      p_actor_email: principal.user.email,
      p_token_hash: hashToken(token),
    });
    if (error) {
      if (error.message.includes('invitation_email_mismatch')) return NextResponse.json({ error: 'Cette invitation est destinée à une autre adresse email.' }, { status: 403 });
      if (error.message.includes('invitation_expired')) return NextResponse.json({ error: 'Cette invitation a expiré.' }, { status: 410 });
      if (error.message.includes('invitation_not_found') || error.message.includes('invitation_not_pending')) return NextResponse.json({ error: 'Cette invitation n’est plus disponible.' }, { status: 404 });
      throw new Error(error.message);
    }
    return NextResponse.json({ membership: data });
  } catch (error) {
    console.error('[Salon Invitation] accept failed:', error);
    return NextResponse.json({ error: 'Impossible d’accepter cette invitation.' }, { status: 500 });
  }
}
