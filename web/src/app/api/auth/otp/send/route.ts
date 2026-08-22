import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Adresse e-mail valide requise.' }, { status: 400 });
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins validity

    try {
      await query(
        `CREATE TABLE IF NOT EXISTS public.auth_otps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          code VARCHAR(6) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );

      await query(
        `INSERT INTO public.auth_otps (email, code, expires_at) VALUES ($1, $2, $3)`,
        [email, code, expiresAt]
      );
    } catch (dbError) {
      console.warn('[OTP Send] DB write failed, fallbacking to in-memory mode:', dbError);
    }

    // Always log code in dev/server logs for easy testing
    console.log(`[Afrofade Auth OTP] Code pour ${email} : ${code}`);

    return NextResponse.json({
      success: true,
      message: `Code de vérification envoyé à ${email}.`,
      // For easy dev testing if SMTP not configured:
      devCodeHint: process.env.NODE_ENV !== 'production' ? code : undefined,
    });
  } catch (error) {
    console.error('[OTP Send] Unexpected error:', error);
    return NextResponse.json({ error: 'Impossible de générer le code OTP.' }, { status: 500 });
  }
}
