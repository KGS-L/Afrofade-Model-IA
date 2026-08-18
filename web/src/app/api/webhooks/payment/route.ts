import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

function isPaidStatus(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  return ['paid', 'success', 'successful', 'completed', 'complete'].includes(value.toLowerCase());
}

function hasValidWebhookSecret(req: NextRequest): boolean {
  const expected = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!expected) return false;

  const bearer = req.headers.get('authorization');
  const explicit = req.headers.get('x-afrofade-webhook-secret');
  return bearer === `Bearer ${expected}` || explicit === expected;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.PAYMENT_WEBHOOK_SECRET) {
      console.error('[Payment Webhook] PAYMENT_WEBHOOK_SECRET is not configured.');
      return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
    }

    if (!hasValidWebhookSecret(req)) {
      return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
    }

    const body = await req.json();
    const paymentId = body?.payment_id || body?.paymentId || body?.custom_metadata?.paymentId;
    const providerToken = body?.token;
    const providerTransactionId = body?.transaction_id || body?.transactionId || '';
    const paid = isPaidStatus(body?.statut ?? body?.status ?? body?.event);

    if (!paymentId || !providerToken) {
      return NextResponse.json({ error: 'Missing payment identifiers.' }, { status: 400 });
    }

    if (!paid) {
      return NextResponse.json({ received: true, finalized: false }, { status: 202 });
    }

    const supabaseAdmin = getServiceSupabase();
    const { data: payment, error: lookupError } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, provider_token, status')
      .eq('id', paymentId)
      .single();

    if (lookupError || !payment) {
      return NextResponse.json({ error: 'Unknown payment.' }, { status: 404 });
    }

    if (!payment.provider_token || payment.provider_token !== providerToken) {
      return NextResponse.json({ error: 'Payment token mismatch.' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin.rpc('finalize_afrofade_payment', {
      p_payment_id: payment.id,
      p_provider_transaction_id: String(providerTransactionId),
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('[Payment Webhook Route Error]:', error);
    return NextResponse.json({ error: 'Erreur lors du traitement du webhook de paiement.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
