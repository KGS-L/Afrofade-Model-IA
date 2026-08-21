import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getAdminKPISummary } from '@/lib/server/admin-kpis';

export async function GET(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal || principal.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 });
    }

    const summary = await getAdminKPISummary();
    return NextResponse.json({ summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
