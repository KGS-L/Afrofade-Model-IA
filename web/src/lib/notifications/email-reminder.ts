/**
 * Email Notification Service for Afrofade Appointment Reminders
 */

export interface BookingReminderEmailParams {
  recipientEmail: string;
  recipientName: string;
  salonName: string;
  serviceName: string;
  startsAtIso: string;
  durationMinutes: number;
  priceAmountFcfa: number;
  reminderType: '24h' | '2h' | 'manual_instant';
  bookingId: string;
}

export async function sendBookingReminderEmail(params: BookingReminderEmailParams): Promise<{ success: boolean; id?: string; error?: string; simulated?: boolean }> {
  const {
    recipientEmail,
    recipientName,
    salonName,
    serviceName,
    startsAtIso,
    durationMinutes,
    priceAmountFcfa,
    reminderType,
    bookingId,
  } = params;

  const dateObj = new Date(startsAtIso);
  const dateFormatted = dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = dateObj.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const subjectPrefix = reminderType === '2h'
    ? '⏰ Rappel Imminent (2h)'
    : reminderType === 'manual_instant'
      ? '🔔 Rappel de votre Salon'
      : '📅 Rappel de votre Rendez-vous (Demain)';

  const subject = `${subjectPrefix} - ${serviceName} chez ${salonName}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afrofade.pro';
  const bookingLink = `${appUrl}/account?bookingId=${bookingId}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { text-align: center; margin-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 800; color: #f59e0b; letter-spacing: 1px; }
    .title { font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 8px; }
    .details-box { background: #0f172a; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #f59e0b; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; }
    .detail-label { color: #94a3b8; font-weight: 500; }
    .detail-value { color: #f8fafc; font-weight: 600; text-align: right; }
    .btn { display: block; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000000; font-weight: 700; padding: 14px 24px; border-radius: 10px; text-decoration: none; margin-top: 24px; font-size: 16px; }
    .footer { text-align: center; margin-top: 32px; font-size: 13px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">AFROFADE</div>
      <div class="title">${subjectPrefix}</div>
    </div>
    
    <p>Bonjour <strong>${recipientName || 'client(e)'}</strong>,</p>
    <p>Ceci est un rappel pour votre prochain rendez-vous de coiffure :</p>
    
    <div class="details-box">
      <div class="detail-row">
        <span class="detail-label">Salon</span>
        <span class="detail-value">${salonName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Prestation</span>
        <span class="detail-value">${serviceName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date & Heure</span>
        <span class="detail-value">${dateFormatted} à ${timeFormatted}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Durée</span>
        <span class="detail-value">${durationMinutes} min</span>
      </div>
      <div class="detail-row" style="margin-bottom:0;">
        <span class="detail-label">Tarif</span>
        <span class="detail-value" style="color:#f59e0b;">${priceAmountFcfa.toLocaleString('fr-FR')} FCFA</span>
      </div>
    </div>

    <a href="${bookingLink}" class="btn">Voir ma réservation sur Afrofade</a>

    <div class="footer">
      <p>Merci de votre confiance. Pour toute modification, rendez-vous sur votre espace client Afrofade.</p>
    </div>
  </div>
</body>
</html>
  `;

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@afrofade.pro';

  if (!apiKey || apiKey.startsWith('re_xxxx')) {
    console.log(`[Email Reminder Simulation] ${subject} -> ${recipientEmail}`);
    return {
      success: true,
      simulated: true,
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject,
        html: htmlContent,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Resend Email Error]', data);
      return { success: false, error: data.message || 'Echec d envoi de l email.' };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[Resend Fetch Exception]', err);
    return { success: false, error: err?.message || 'Erreur reseau email.' };
  }
}
