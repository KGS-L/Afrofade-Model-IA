'use client';

export type MarketplaceEvent =
  | 'search' | 'style_view' | 'tryon_start' | 'tryon_complete'
  | 'provider_view' | 'provider_click' | 'booking_started' | 'booking_created'
  | 'booking_completed' | 'review_submitted' | 'job_view' | 'job_application'
  | 'subscription_checkout_started' | 'subscription_activated';

type TelemetryInput = {
  event: MarketplaceEvent;
  providerType?: 'professional' | 'salon';
  providerId?: string;
  styleSlug?: string;
  source?: string;
  properties?: Record<string, string | number | boolean>;
};

const SESSION_KEY = 'afrofade_marketplace_session_v1';

function anonymousSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replaceAll('-', '_')
      : `af_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`;
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return undefined;
  }
}

export function trackMarketplaceEvent(input: TelemetryInput): void {
  if (typeof window === 'undefined') return;
  const payload = { ...input, sessionId: anonymousSessionId() };
  void fetch('/api/telemetry/marketplace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}
