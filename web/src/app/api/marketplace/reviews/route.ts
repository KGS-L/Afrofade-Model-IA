import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { createVerifiedReview, getProviderReviews } from '@/lib/server/reviews-moderation';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const salonId = searchParams.get('salonId') || undefined;
    const proId = searchParams.get('professionalProfileId') || undefined;

    const reviews = await getProviderReviews({ salonId, professionalProfileId: proId });
    return NextResponse.json({ reviews });
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
    if (!body.bookingId || !body.rating) {
      return NextResponse.json({ error: 'bookingId and rating are required' }, { status: 400 });
    }

    const review = await createVerifiedReview({
      bookingId: body.bookingId,
      customerId: principal.user.id,
      rating: body.rating,
      comment: body.comment,
    });

    return NextResponse.json({ review });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
