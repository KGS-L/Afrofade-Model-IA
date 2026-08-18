import { NextRequest, NextResponse } from 'next/server';
import { getGeniusPayPayment, verifyGeniusPayWebhookSignature } from '@/lib/genius-pay';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GENIUS_PAY_WEBHOOK_SECRET) {
      console.error('[GeniusPay Webhook] GENIUS_PAY_WEBHOOK_SECRET is not configured.');
      return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
    }

    const rawPayload = await req.text();
    const signature = req.headers.get('x-geniuspay-signature');
    if (!verifyGeniusPayWebhookSignature(rawPayload, signature)) {
      return NextResponse.json({ error: 'Invalid GeniusPay signature.' }, { status: 401 });
    }

    let body: any;
    try {
      body = JSON.parse(rawPayload);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const reference =
      typeof body?.data?.transaction?.reference === 'string'
        ? body.data.transaction.reference.trim()
        : '';

    if (!reference) {
      return NextResponse.json({ error: 'Missing GeniusPay transaction reference.' }, { status: 400 });
    }

    const supabaseAdmin = getServiceSupabase();
    const { data: payment, error: lookupError } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, provider_token, amount_fcfa, status')
      .eq('provider', 'genius_pay')
      .eq('provider_token', reference)
      .maybeSingle();

    if (lookupError) throw new Error(lookupError.message);
    if (!payment) return NextResponse.json({ error: 'Unknown GeniusPay payment.' }, { status: 404 });

    // Signature proves the webhook payload came from the configured GeniusPay
    // secret. Re-reading the transaction via the merchant API additionally
    // verifies its authoritative amount/status before any commercial effect.
    const verified = await getGeniusPayPayment(reference);

    if (verified.reference !== payment.provider_token) {
      return NextResponse.json({ error: 'GeniusPay reference mismatch.' }, { status: 401 });
    }

    if (Number(verified.amount) !== Number(payment.amount_fcfa)) {
      console.error('[GeniusPay Webhook] Amount mismatch', {
        paymentId: payment.id,
        expected: payment.amount_fcfa,
        received: verified.amount,
      });
      return NextResponse.json({ error: 'Payment amount mismatch.' }, { status: 409 });
    }

    if (verified.status === 'completed') {
      const { data, error } = await supabaseAdmin.rpc('finalize_afrofade_payment', {
        p_payment_id: payment.id,
        p_provider_transaction_id: String(verified.id || verified.reference),
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, finalized: true, result: data });
    }

    if (verified.status === 'failed' || verified.status === 'cancelled') {
      const nextStatus = verified.status === 'failed' ? 'failed' : 'cancelled';
      const { error } = await supabaseAdmin
        .from('payment_transactions')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', payment.id)
        .eq('status', 'pending');
      if (error) throw new Error(error.message);
      return NextResponse.json({ received: true, finalized: false, status: nextStatus });
    }

    if (verified.status === 'refunded') {
      console.warn('[GeniusPay Webhook] Refund requires reconciliation', {
        paymentId: payment.id,
        reference,
      });
      return NextResponse.json(
        { received: true, finalized: false, status: 'refunded', reconciliationRequired: true },
        { status: 202 }
      );
    }

    return NextResponse.json({ received: true, finalized: false, status: verified.status }, { status: 202 });
  } catch (error) {
    console.error('[GeniusPay Webhook Route Error]:', error);
    return NextResponse.json({ error: 'Erreur lors de la vérification GeniusPay.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
