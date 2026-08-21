import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getUserCreditBalance, reserveCredits } from '@/lib/server/credits-wallet';

export async function GET(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const balance = await getUserCreditBalance(principal.user.id);
    return NextResponse.json({ balance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.action || !body.idempotencyKey) {
      return NextResponse.json({ error: 'action and idempotencyKey are required' }, { status: 400 });
    }

    const result = await reserveCredits({
      userId: principal.user.id,
      action: body.action,
      idempotencyKey: body.idempotencyKey,
    });

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
