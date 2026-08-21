import { getServiceSupabase } from './marketplace';

export async function logAnalyticsEvent(params: {
  userId?: string;
  eventType: string;
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = getServiceSupabase();
    await supabase.from('marketplace_analytics_events').insert({
      user_id: params.userId || null,
      event_type: params.eventType,
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.error('Failed to log telemetry event:', err);
  }
}
