import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { searchBookableServices, createBookableService } from '@/lib/server/services-discovery';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const salonId = searchParams.get('salonId') || undefined;
    const proId = searchParams.get('professionalProfileId') || undefined;

    const services = await searchBookableServices({ salonId, professionalProfileId: proId });
    return NextResponse.json({ services });
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
    const service = await createBookableService(principal.user.id, body);
    return NextResponse.json({ service });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
