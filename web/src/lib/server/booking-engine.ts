import { getServiceSupabase } from './marketplace';

export interface CreateBookingParams {
  idempotencyKey: string;
  customerId: string;
  providerType: 'salon' | 'independent_professional';
  salonId?: string;
  professionalProfileId?: string;
  serviceId: string;
  startTime: string;
  tryonHeadId?: string;
}

export async function createBookingWithRpc(params: CreateBookingParams) {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase.rpc('create_booking_transaction', {
    p_idempotency_key: params.idempotencyKey,
    p_customer_id: params.customerId,
    p_provider_type: params.providerType,
    p_salon_id: params.salonId || null,
    p_professional_profile_id: params.professionalProfileId || null,
    p_service_id: params.serviceId,
    p_start_time: params.startTime,
    p_tryon_head_id: params.tryonHeadId || null,
  });

  if (error) {
    throw new Error(`Booking creation failed: ${error.message}`);
  }
  return data;
}

export async function getUserBookings(customerId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('bookings')
    .select('*, bookable_services(name, price_fcfa, duration_minutes)')
    .eq('customer_id', customerId)
    .order('start_time', { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function getProviderBookings(params: { salonId?: string; professionalProfileId?: string }) {
  const supabase = getServiceSupabase();
  let query = supabase.from('bookings').select('*, bookable_services(name, price_fcfa, duration_minutes)');

  if (params.salonId) {
    query = query.eq('salon_id', params.salonId);
  } else if (params.professionalProfileId) {
    query = query.eq('professional_profile_id', params.professionalProfileId);
  }

  const { data, error } = await query.order('start_time', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function updateBookingStatus(
  bookingId: string,
  actorId: string,
  newStatus: 'confirmed' | 'completed' | 'cancelled' | 'no_show',
  note?: string
) {
  const supabase = getServiceSupabase();

  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .single();

  if (fetchErr || !booking) {
    throw new Error('Booking not found');
  }

  const previousStatus = booking.status;

  const { error: updateErr } = await supabase
    .from('bookings')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', bookingId);

  if (updateErr) {
    throw new Error(`Failed to update booking status: ${updateErr.message}`);
  }

  await supabase.from('booking_events').insert({
    booking_id: bookingId,
    actor_id: actorId,
    previous_status: previousStatus,
    new_status: newStatus,
    note: note || null,
  });

  return { success: true, bookingId, newStatus };
}
