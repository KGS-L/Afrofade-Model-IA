import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getPaymentProviderStates } from '@/lib/payment-providers';

export async function GET() {
  try {
    const states = await getPaymentProviderStates(getServiceSupabase());
    return NextResponse.json({ providers: states.filter((state) => state.effectiveEnabled) });
  } catch (error) {
    console.error('[Payment Providers] failed:', error);
    return NextResponse.json({ providers: [] }, { status: 503 });
  }
}
