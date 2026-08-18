import { NextRequest, NextResponse } from 'next/server';
import { createMoneyFusionPaymentSession } from '@/lib/money-fusion';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planName, amountFcfa, termId, salonName } = body;

    if (!planName || !amountFcfa) {
      return NextResponse.json(
        { error: 'Paramètres manquants (planName et amountFcfa requis)' },
        { status: 400 }
      );
    }

    const session = await createMoneyFusionPaymentSession({
      totalPrice: Number(amountFcfa),
      article: [
        {
          name: `Abonnement Afrofade ${planName} (${termId || 'Mensuel'})`,
          price: Number(amountFcfa),
        },
      ],
      personal_info: [
        {
          client_name: salonName || 'Salon Afrofade',
        },
      ],
      return_url: 'https://afrofade.com.kgslab.com/dashboard?payment=success&provider=money_fusion',
      cancel_url: 'https://afrofade.com.kgslab.com/dashboard?payment=cancelled',
      custom_metadata: {
        planName,
        termId: termId || '3mois',
        salonName: salonName || 'Salon Afrofade',
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('[Money Fusion Checkout Route Error]:', error);
    return NextResponse.json(
      { error: 'Échec de la génération de la session de paiement' },
      { status: 500 }
    );
  }
}
