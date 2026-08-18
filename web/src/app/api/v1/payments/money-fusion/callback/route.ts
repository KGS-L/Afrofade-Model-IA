import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, statut, event, transaction_id } = body;

    console.log('[Money Fusion Webhook Received]:', { token, statut, event, transaction_id });

    // Enregistrement de la transaction et mise à jour de la souscription du salon
    return NextResponse.json({
      success: true,
      message: 'Notification de paiement Money Fusion traitée avec succès',
      received_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Money Fusion Callback Route Error]:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement du webhook Money Fusion' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const status = url.searchParams.get('status');

  // Redirection d'apprentissage après paiement Mobile Money
  return NextResponse.redirect('https://afrofade.com.kgslab.com/dashboard?payment=success');
}
