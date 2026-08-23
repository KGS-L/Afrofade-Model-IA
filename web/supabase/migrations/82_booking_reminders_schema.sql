-- Afrofade Database Migration 82: Booking Automated Reminders Tracking Schema

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
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_status_scheduled ON public.booking_reminder_logs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_booking ON public.booking_reminder_logs(booking_id);

ALTER TABLE public.booking_reminder_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.booking_reminder_logs TO authenticated;
GRANT ALL ON public.booking_reminder_logs TO service_role;
