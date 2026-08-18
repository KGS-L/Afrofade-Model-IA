import { NextRequest, NextResponse } from 'next/server';
import { getMoneyFusionPaymentStatus } from '@/lib/money-fusion';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const providerToken = typeof body?.tokenPay === 'string' ? body.tokenPay.trim() : '';

    if (!providerToken) {
      return NextResponse.json({ error: 'Missing Money Fusion tokenPay.' }, { status: 400 });
    }

    const supabaseAdmin = getServiceSupabase();
    const { data: payment, error: lookupError } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, provider_token, amount_fcfa, status')
      .eq('provider', 'money_fusion')
      .eq('provider_token', providerToken)
      .maybeSingle();

    if (lookupError) throw new Error(lookupError.message);
    if (!payment) return NextResponse.json({ error: 'Unknown Money Fusion payment.' }, { status: 404 });

    // Money Fusion's supplied Web API documentation does not define a webhook
    // signature. Never trust the event payload as proof of payment: re-fetch the
    // transaction from the provider-owned status endpoint using tokenPay.
    const verified = await getMoneyFusionPaymentStatus(providerToken);

    if (verified.tokenPay !== payment.provider_token) {
      return NextResponse.json({ error: 'Money Fusion token mismatch.' }, { status: 401 });
    }

    if (Number(verified.Montant) !== Number(payment.amount_fcfa)) {
      console.error('[Money Fusion Webhook] Amount mismatch', {
        paymentId: payment.id,
        expected: payment.amount_fcfa,
        received: verified.Montant,
      });
      return NextResponse.json({ error: 'Payment amount mismatch.' }, { status: 409 });
    }

    if (verified.statut === 'paid') {
      const { data, error } = await supabaseAdmin.rpc('finalize_afrofade_payment', {
        p_payment_id: payment.id,
        p_provider_transaction_id: String(verified.numeroTransaction || verified._id || ''),
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, finalized: true, result: data });
    }

    if (verified.statut === 'failure' || verified.statut === 'no paid') {
      const nextStatus = verified.statut === 'failure' ? 'failed' : 'cancelled';
      const { error } = await supabaseAdmin
        .from('payment_transactions')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', payment.id)
        .eq('status', 'pending');
      if (error) throw new Error(error.message);
      return NextResponse.json({ received: true, finalized: false, status: nextStatus });
    }

    return NextResponse.json({ received: true, finalized: false, status: 'pending' }, { status: 202 });
  } catch (error) {
    console.error('[Money Fusion Webhook Route Error]:', error);
    return NextResponse.json({ error: 'Erreur lors de la vérification Money Fusion.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
