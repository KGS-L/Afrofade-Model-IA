import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getDbPool } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal)
      return NextResponse.json(
        { error: 'Authentification requise.', needsAuth: true },
        { status: 401 }
      );

    const body = await req.json();
    const serviceId = typeof body?.serviceId === 'string' ? body.serviceId : '';
    const startsAt = typeof body?.startsAt === 'string' ? body.startsAt : '';
    const membershipId =
      typeof body?.membershipId === 'string' && body.membershipId
        ? body.membershipId
        : null;
    const note =
      typeof body?.note === 'string' ? body.note.slice(0, 1000) : null;

    if (!serviceId || !startsAt || Number.isNaN(Date.parse(startsAt)))
      return NextResponse.json(
        { error: 'Prestation ou créneau invalide.' },
        { status: 400 }
      );

    const client = await getDbPool().connect();
    try {
      await client.query('BEGIN');
      // Transmettre l'ID utilisateur authentifié à la fonction PL/pgSQL auth.uid()
      await client.query(
        `SELECT set_config('request.jwt.claims', $1, true)`,
        [
          JSON.stringify({
            sub: principal.user.id,
            role: principal.role,
            email: principal.user.email,
          }),
        ]
      );

      const res = await client.query(
        `SELECT public.create_marketplace_booking($1, $2, $3, $4) AS booking_id`,
        [serviceId, startsAt, membershipId, note]
      );

      await client.query('COMMIT');
      return NextResponse.json(
        { bookingId: res.rows[0].booking_id },
        { status: 201 }
      );
    } catch (dbError: any) {
      await client.query('ROLLBACK');
      const message = dbError?.message || '';

      if (
        message.includes('booking_no_professional_available') ||
        message.includes('marketplace_bookings_no_professional_overlap')
      ) {
        return NextResponse.json(
          { error: 'Ce créneau vient d’être pris. Choisissez-en un autre.' },
          { status: 409 }
        );
      }
      if (message.includes('booking_service_unavailable')) {
        return NextResponse.json(
          { error: 'Cette prestation n’est plus disponible.' },
          { status: 409 }
        );
      }
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Booking Create]', error);
    return NextResponse.json(
      { error: 'Impossible de confirmer la réservation.' },
      { status: 500 }
    );
  }
}
