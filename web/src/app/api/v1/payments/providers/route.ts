import { NextResponse } from 'next/server';
import { getEnabledPaymentProviders, type PaymentProvider } from '@/lib/payment-providers';

const PROVIDER_LABELS: Record<PaymentProvider, { label: string; description: string }> = {
  money_fusion: {
    label: 'Money Fusion',
    description: 'Paiement mobile via la page sécurisée Money Fusion',
  },
  genius_pay: {
    label: 'GeniusPay',
    description: 'Wave, Orange Money, MTN Money et carte via le checkout GeniusPay',
  },
};

export async function GET() {
  const providers = getEnabledPaymentProviders().map((id) => ({
    id,
    ...PROVIDER_LABELS[id],
  }));

  return NextResponse.json({ providers });
}
