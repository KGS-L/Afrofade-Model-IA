import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { query } from '@/lib/db';
import { ensureReminderLogsSchema } from '@/lib/server/reminder-engine';

export async function GET(req: NextRequest) {
  const principal = await getVerifiedPrincipal(req);
  if (!principal) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  try {
    await ensureReminderLogsSchema();

    const logsRes = await query(
      `SELECT r.id, r.booking_id, r.reminder_type, r.channel, r.recipient, r.status, r.sent_at, r.created_at
       FROM public.booking_reminder_logs r
       JOIN public.marketplace_bookings b ON r.booking_id = b.id
       JOIN public.salon_memberships sm ON b.salon_id = sm.salon_id
       WHERE sm.user_id = $1 AND sm.status = 'active'
       ORDER BY r.created_at DESC
       LIMIT 200`,
      [principal.user.id]
    );

    const reminderLogsByBooking: Record<string, any[]> = {};
    for (const log of logsRes.rows) {
      if (!reminderLogsByBooking[log.booking_id]) {
        reminderLogsByBooking[log.booking_id] = [];
      }
      reminderLogsByBooking[log.booking_id].push({
        id: log.id,
        reminderType: log.reminder_type,
        channel: log.channel,
        recipient: log.recipient,
        status: log.status,
        sentAt: log.sent_at,
        createdAt: log.created_at,
      });
    }

    return NextResponse.json({ reminderLogsByBooking });
  } catch (error: any) {
    console.error('[GET Workspace Reminders Error]', error);
    return NextResponse.json({ reminderLogsByBooking: {} });
  }
}
