import { query } from '@/lib/db';
import { sendBookingReminderEmail } from '@/lib/notifications/email-reminder';

export interface ProcessedReminderResult {
  bookingId: string;
  reminderType: '24h' | '2h' | 'manual_instant';
  recipient: string;
  status: 'sent' | 'failed';
  error?: string;
  simulated?: boolean;
}

export async function ensureReminderLogsSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS public.booking_reminder_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL REFERENCES public.marketplace_bookings(id) ON DELETE CASCADE,
      reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('24h', '2h', 'manual_instant')),
      channel VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'push')),
      recipient VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
      scheduled_for TIMESTAMPTZ NOT NULL,
      sent_at TIMESTAMPTZ,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unq_booking_reminder_channel UNIQUE (booking_id, reminder_type, channel)
    )
  `);
}

export async function processUpcomingReminders(reminderType: '24h' | '2h'): Promise<ProcessedReminderResult[]> {
  await ensureReminderLogsSchema();

  const now = new Date();
  let minStart: Date;
  let maxStart: Date;

  if (reminderType === '24h') {
    // Window: +23h to +25h
    minStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    maxStart = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  } else {
    // Window: +90m to +150m (approx 2h)
    minStart = new Date(now.getTime() + 90 * 60 * 1000);
    maxStart = new Date(now.getTime() + 150 * 60 * 1000);
  }

  // Find eligible bookings that have NOT yet received this reminder_type
  const bookingsRes = await query(
    `SELECT b.id, b.customer_user_id, b.starts_at, b.service_name_snapshot, 
            b.duration_minutes_snapshot, b.price_amount_snapshot,
            s.name AS salon_name,
            COALESCE(up.email, u.email) AS customer_email,
            COALESCE(up.full_name, up.display_name, 'Client Afrofade') AS customer_name
     FROM public.marketplace_bookings b
     LEFT JOIN public.salons s ON b.salon_id = s.id
     LEFT JOIN public.user_profiles up ON b.customer_user_id = up.user_id
     LEFT JOIN auth.users u ON b.customer_user_id = u.id
     WHERE b.status IN ('requested', 'confirmed')
       AND b.starts_at >= $1 AND b.starts_at <= $2
       AND NOT EXISTS (
         SELECT 1 FROM public.booking_reminder_logs r 
         WHERE r.booking_id = b.id AND r.reminder_type = $3 AND r.channel = 'email'
       )`,
    [minStart.toISOString(), maxStart.toISOString(), reminderType]
  );

  const results: ProcessedReminderResult[] = [];

  for (const b of bookingsRes.rows) {
    const recipient = b.customer_email || `user_${b.customer_user_id.substring(0, 8)}@afrofade.internal`;
    const salonName = b.salon_name || 'Salon partenaire Afrofade';
    const recipientName = b.customer_name || 'Client';

    const sendRes = await sendBookingReminderEmail({
      recipientEmail: recipient,
      recipientName,
      salonName,
      serviceName: b.service_name_snapshot,
      startsAtIso: b.starts_at,
      durationMinutes: b.duration_minutes_snapshot,
      priceAmountFcfa: b.price_amount_snapshot,
      reminderType,
      bookingId: b.id,
    });

    const status = sendRes.success ? 'sent' : 'failed';

    try {
      await query(
        `INSERT INTO public.booking_reminder_logs 
          (booking_id, reminder_type, channel, recipient, status, scheduled_for, sent_at, error_message)
         VALUES ($1, $2, 'email', $3, $4, $5, $6, $7)
         ON CONFLICT (booking_id, reminder_type, channel) 
         DO UPDATE SET status = EXCLUDED.status, sent_at = EXCLUDED.sent_at, error_message = EXCLUDED.error_message`,
        [
          b.id,
          reminderType,
          recipient,
          status,
          b.starts_at,
          sendRes.success ? new Date().toISOString() : null,
          sendRes.error || null,
        ]
      );
    } catch (dbErr) {
      console.error('[Reminder Engine] DB log write failed:', dbErr);
    }

    results.push({
      bookingId: b.id,
      reminderType,
      recipient,
      status,
      error: sendRes.error,
      simulated: sendRes.simulated,
    });
  }

  return results;
}

export async function sendInstantManualReminder(bookingId: string, salonUserId: string): Promise<ProcessedReminderResult> {
  await ensureReminderLogsSchema();

  // Verify booking belongs to a salon owned by salonUserId
  const checkRes = await query(
    `SELECT b.id, b.starts_at, b.service_name_snapshot, 
            b.duration_minutes_snapshot, b.price_amount_snapshot,
            s.name AS salon_name,
            COALESCE(up.email, u.email) AS customer_email,
            COALESCE(up.full_name, up.display_name, 'Client Afrofade') AS customer_name
     FROM public.marketplace_bookings b
     JOIN public.salons s ON b.salon_id = s.id
     JOIN public.salon_memberships sm ON sm.salon_id = s.id
     LEFT JOIN public.user_profiles up ON b.customer_user_id = up.user_id
     LEFT JOIN auth.users u ON b.customer_user_id = u.id
     WHERE b.id = $1 AND sm.user_id = $2 AND sm.role = 'owner' AND sm.status = 'active'
     LIMIT 1`,
    [bookingId, salonUserId]
  );

  if (!checkRes.rows.length) {
    throw new Error('Réservation introuvable ou vous n\'avez pas la permission de gérer ce salon.');
  }

  const b = checkRes.rows[0];
  const recipient = b.customer_email || `user_${salonUserId.substring(0, 8)}@afrofade.internal`;

  const sendRes = await sendBookingReminderEmail({
    recipientEmail: recipient,
    recipientName: b.customer_name || 'Client',
    salonName: b.salon_name || 'Votre Salon',
    serviceName: b.service_name_snapshot,
    startsAtIso: b.starts_at,
    durationMinutes: b.duration_minutes_snapshot,
    priceAmountFcfa: b.price_amount_snapshot,
    reminderType: 'manual_instant',
    bookingId: b.id,
  });

  const status = sendRes.success ? 'sent' : 'failed';

  await query(
    `INSERT INTO public.booking_reminder_logs 
      (booking_id, reminder_type, channel, recipient, status, scheduled_for, sent_at, error_message)
     VALUES ($1, 'manual_instant', 'email', $2, $3, NOW(), $4, $5)
     ON CONFLICT (booking_id, reminder_type, channel) 
     DO UPDATE SET status = EXCLUDED.status, sent_at = EXCLUDED.sent_at, error_message = EXCLUDED.error_message`,
    [
      b.id,
      recipient,
      status,
      sendRes.success ? new Date().toISOString() : null,
      sendRes.error || null,
    ]
  );

  return {
    bookingId: b.id,
    reminderType: 'manual_instant',
    recipient,
    status,
    error: sendRes.error,
    simulated: sendRes.simulated,
  };
}
