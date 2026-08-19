import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(request);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (principal.role !== 'customer') {
      return NextResponse.json({ error: 'Décompte réservé aux particuliers.' }, { status: 403 });
    }

    const body = await request.json();
    const headId = typeof body?.headId === 'string' ? body.headId.trim() : '';
    const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : '';

    if (!/^[0-9a-fA-F-]{36}$/.test(headId) || !/^[a-zA-Z0-9_-]{12,120}$/.test(requestId)) {
      return NextResponse.json({ error: 'Requête de téléchargement invalide.' }, { status: 400 });
    }

    const supabaseAdmin = getServiceSupabase();
    const { data, error } = await supabaseAdmin.rpc('consume_customer_download_credit', {
      p_user_id: principal.user.id,
      p_head_id: headId,
      p_request_key: requestId,
    });

    if (error) {
      if (error.message.includes('insufficient_credits')) {
        return NextResponse.json({ error: 'Un crédit est requis pour télécharger en HD.', code: 'insufficient_credits' }, { status: 402 });
      }
      if (error.message.includes('head_not_found')) {
        return NextResponse.json({ error: 'Rendu introuvable.' }, { status: 404 });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, usage: data });
  } catch (error) {
    console.error('[Customer Download Credit] failed:', error);
    return NextResponse.json({ error: 'Impossible de valider le téléchargement.' }, { status: 500 });
  }
}
