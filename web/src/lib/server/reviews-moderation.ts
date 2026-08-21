import { getServiceSupabase } from './marketplace';

export async function createVerifiedReview(params: {
  bookingId: string;
  customerId: string;
  rating: number;
  comment?: string;
}) {
  const supabase = getServiceSupabase();

  // Verify booking belongs to customer and is completed
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, customer_id, status, salon_id, professional_profile_id')
    .eq('id', params.bookingId)
    .single();

  if (bookingErr || !booking) {
    throw new Error('Booking not found');
  }
  if (booking.customer_id !== params.customerId) {
    throw new Error('Unauthorized review submission');
  }
  if (booking.status !== 'completed' && booking.status !== 'confirmed') {
    throw new Error('Only completed or confirmed bookings can be reviewed');
  }

  const { data, error } = await supabase
    .from('verified_reviews')
    .insert({
      booking_id: params.bookingId,
      customer_id: params.customerId,
      salon_id: booking.salon_id,
      professional_profile_id: booking.professional_profile_id,
      rating: params.rating,
      comment: params.comment || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit verified review: ${error.message}`);
  }
  return data;
}

export async function getProviderReviews(params: { salonId?: string; professionalProfileId?: string }) {
  const supabase = getServiceSupabase();
  let query = supabase.from('verified_reviews').select('*').eq('is_hidden', false);

  if (params.salonId) {
    query = query.eq('salon_id', params.salonId);
  } else if (params.professionalProfileId) {
    query = query.eq('professional_profile_id', params.professionalProfileId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function submitContentReport(params: {
  reporterId: string;
  targetType: 'review' | 'portfolio_item' | 'job_posting' | 'professional_profile';
  targetId: string;
  reason: string;
}) {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('content_reports')
    .insert({
      reporter_id: params.reporterId,
      target_type: params.targetType,
      target_id: params.targetId,
      reason: params.reason,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit content report: ${error.message}`);
  }
  return data;
}
