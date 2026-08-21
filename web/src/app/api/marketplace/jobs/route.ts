import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { listActiveJobs, createJobPosting } from '@/lib/server/careers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || undefined;

    const jobs = await listActiveJobs(city);
    return NextResponse.json({ jobs });
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
    if (!body.salonId || !body.title || !body.description || !body.workMode) {
      return NextResponse.json({ error: 'salonId, title, description, and workMode are required' }, { status: 400 });
    }

    const job = await createJobPosting(principal.user.id, body);
    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
