import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

function userDb(token: string) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    const salonId = req.nextUrl.searchParams.get('salonId');
    const professionalProfileId = req.nextUrl.searchParams.get('professionalProfileId');
    if (!salonId && !professionalProfileId) {
      return NextResponse.json({ error: 'salonId ou professionalProfileId requis.' }, { status: 400 });
    }

    let query = getServiceSupabase()
      .from('marketplace_reviews')
      .select('id,target_type,professional_profile_id,salon_id,rating,comment,created_at')
      .eq('moderation_status', 'published')
      .order('created_at', { ascending: false })
      .limit(100);

    if (salonId) query = query.eq('salon_id', salonId);
    else query = query.eq('professional_profile_id', professionalProfileId!);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ reviews: data ?? [] });
  } catch (error) {
    console.error('[Reviews GET]', error);
    return NextResponse.json({ error: 'Impossible de charger les avis.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const principal = await getVerifiedPrincipal(req);
  if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

  try {
    const body = await req.json();
    const bookingId = typeof body?.bookingId === 'string' ? body.bookingId : '';
    const targetType = body?.targetType === 'professional' ? 'professional' : body?.targetType === 'salon' ? 'salon' : null;
    const rating = Number(body?.rating);
    const comment = typeof body?.comment === 'string' ? body.comment.slice(0, 3000) : null;

    if (!bookingId || !targetType || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Avis invalide.' }, { status: 400 });
    }

    const { data, error } = await userDb(principal.accessToken).rpc('submit_verified_review', {
      p_booking_id: bookingId,
      p_target_type: targetType,
      p_rating: rating,
      p_comment: comment,
    });

    if (error) {
      const message = error.message || '';
      if (message.includes('review_requires_completed_booking')) {
        return NextResponse.json({ error: 'Vous pourrez évaluer cette prestation une fois terminée.' }, { status: 409 });
      }
      if (message.toLowerCase().includes('duplicate')) {
        return NextResponse.json({ error: 'Vous avez déjà évalué cette prestation.' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ reviewId: data }, { status: 201 });
  } catch (error) {
    console.error('[Reviews POST]', error);
    return NextResponse.json({ error: 'Impossible de publier cet avis.' }, { status: 500 });
  }
}
