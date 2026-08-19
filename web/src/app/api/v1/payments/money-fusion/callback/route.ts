import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Use /api/webhooks/money-fusion for provider notifications.' },
    { status: 410 }
  );
}

export async function GET(req: NextRequest) {
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : req.nextUrl.origin)).replace(/\/$/, '');
  const paymentId = req.nextUrl.searchParams.get('payment_id');
  const suffix = paymentId ? `&payment_id=${encodeURIComponent(paymentId)}` : '';

  // A browser redirect is not proof of payment. The UI must wait for the
  // verified webhook/database status instead of assuming success here.
  return NextResponse.redirect(`${appUrl}/dashboard?payment=pending&provider=money_fusion${suffix}`);
}
