import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, statut, event, transaction_id, salon_id, plan } = body;

    console.log('[Generic Payment Webhook Received]:', { token, statut, event, transaction_id, salon_id, plan });

    return NextResponse.json({
      success: true,
      message: 'Notification de paiement webhook traitée avec succès',
      status: 'active',
      received_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Payment Webhook Route Error]:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement du webhook de paiement' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afrofade.pro';
  return NextResponse.redirect(`${appUrl}/dashboard?payment=success`);
}
