import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Legacy payment webhook retired.',
      endpoints: ['/api/webhooks/money-fusion', '/api/webhooks/genius-pay'],
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
