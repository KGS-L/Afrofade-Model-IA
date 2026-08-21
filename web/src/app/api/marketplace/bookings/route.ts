import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { createBookingWithRpc, getUserBookings } from '@/lib/server/booking-engine';

export async function GET(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookings = await getUserBookings(principal.user.id);
    return NextResponse.json({ bookings });
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
    if (!body.serviceId || !body.startTime || !body.providerType) {
      return NextResponse.json({ error: 'serviceId, startTime, and providerType are required' }, { status: 400 });
    }

    const idempotencyKey = body.idempotencyKey || `bk_${principal.user.id}_${Date.now()}`;

    const result = await createBookingWithRpc({
      idempotencyKey,
      customerId: principal.user.id,
      providerType: body.providerType,
      salonId: body.salonId,
      professionalProfileId: body.professionalProfileId,
      serviceId: body.serviceId,
      startTime: body.startTime,
      tryonHeadId: body.tryonHeadId,
    });

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
