import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { sendInstantManualReminder } from '@/lib/server/reminder-engine';

export async function POST(req: NextRequest) {
  const principal = await getVerifiedPrincipal(req);
  if (!principal) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const bookingId = typeof body?.bookingId === 'string' ? body.bookingId.trim() : '';

    if (!bookingId) {
      return NextResponse.json({ error: 'ID de réservation requis.' }, { status: 400 });
    }

    const reminder = await sendInstantManualReminder(bookingId, principal.user.id);

    return NextResponse.json({
      success: true,
      message: 'Rappel instantané envoyé au client avec succès.',
      reminder,
    });
  } catch (error: any) {
    console.error('[Manual Reminder Send Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Impossible d\'envoyer le rappel.' },
      { status: 500 }
    );
  }
}
