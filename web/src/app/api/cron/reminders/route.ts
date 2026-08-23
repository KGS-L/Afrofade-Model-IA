import { NextRequest, NextResponse } from 'next/server';
import { processUpcomingReminders } from '@/lib/server/reminder-engine';

export async function POST(req: NextRequest) {
  return handleCron(req);
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecretHeader = req.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET || 'replace-with-a-long-random-secret';

  let providedSecret = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedSecret = authHeader.substring(7).trim();
  } else if (cronSecretHeader) {
    providedSecret = cronSecretHeader.trim();
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Accès non autorisé au CRON.' }, { status: 401 });
  }

  try {
    const results24h = await processUpcomingReminders('24h');
    const results2h = await processUpcomingReminders('2h');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        processed24hCount: results24h.length,
        processed2hCount: results2h.length,
      },
      results24h,
      results2h,
    });
  } catch (error: any) {
    console.error('[CRON Reminders Error]', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement des rappels de rendez-vous.' },
      { status: 500 }
    );
  }
}
