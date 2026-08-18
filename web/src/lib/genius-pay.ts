import { createHmac, timingSafeEqual } from 'crypto';

export type GeniusPayPaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface GeniusPayCheckoutPayload {
  amount: number;
  currency?: 'XOF';
  description?: string;
  payment_method?: 'wave' | 'paystack' | 'orange_money' | 'mtn_money' | 'card';
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  success_url?: string;
  error_url?: string;
  metadata?: Record<string, string>;
}

export interface GeniusPayPaymentData {
  id: number | string;
  reference: string;
  amount: number;
  fees?: number;
  net_amount?: number;
  status: GeniusPayPaymentStatus;
  payment_method?: string;
  payment_url?: string;
  checkout_url?: string;
  gateway?: string;
  environment?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  metadata?: Record<string, unknown>;
  created_at?: string;
  completed_at?: string;
}

interface GeniusPayApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

function getGeniusPayBaseUrl(): string {
  const baseUrl = process.env.GENIUS_PAY_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) throw new Error('GENIUS_PAY_BASE_URL is not configured.');

  // The supplied provider documentation currently shows an HTTP URL. Never send
  // merchant secrets over cleartext HTTP in production; require the provider's
  // HTTPS endpoint before enabling GeniusPay live.
  if (process.env.NODE_ENV === 'production' && !baseUrl.startsWith('https://')) {
    throw new Error('GENIUS_PAY_BASE_URL must use HTTPS in production.');
  }

  return baseUrl;
}

function getGeniusPayHeaders(): Record<string, string> {
  const apiKey = process.env.GENIUS_PAY_API_KEY;
  const apiSecret = process.env.GENIUS_PAY_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('GeniusPay merchant credentials are not configured.');
  }

  return {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'X-API-Secret': apiSecret,
  };
}

async function parseProviderResponse<T>(response: Response): Promise<GeniusPayApiResponse<T>> {
  const raw = await response.text();
  let parsed: GeniusPayApiResponse<T> | null = null;
  try {
    parsed = JSON.parse(raw) as GeniusPayApiResponse<T>;
  } catch {
    parsed = null;
  }

  if (!response.ok || !parsed?.success) {
    const detail = parsed?.message || parsed?.error || raw.slice(0, 300) || `HTTP ${response.status}`;
    throw new Error(`GeniusPay request failed: ${detail}`);
  }

  return parsed;
}

export async function createGeniusPayPaymentSession(payload: GeniusPayCheckoutPayload): Promise<{
  reference: string;
  url: string;
  data: GeniusPayPaymentData;
}> {
  const response = await fetch(`${getGeniusPayBaseUrl()}/payments`, {
    method: 'POST',
    headers: getGeniusPayHeaders(),
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const parsed = await parseProviderResponse<GeniusPayPaymentData>(response);
  const data = parsed.data;
  if (!data?.reference) throw new Error('GeniusPay returned no payment reference.');

  // Provider documentation uses `checkout_url` in the hosted-checkout examples
  // and `payment_url` in the endpoint response example. Support both contracts.
  const url = data.checkout_url || data.payment_url;
  if (!url) throw new Error('GeniusPay returned no checkout/payment URL.');

  return { reference: data.reference, url, data };
}

export async function getGeniusPayPayment(reference: string): Promise<GeniusPayPaymentData> {
  if (!reference) throw new Error('GeniusPay payment reference is required.');

  const response = await fetch(`${getGeniusPayBaseUrl()}/payments/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: getGeniusPayHeaders(),
    cache: 'no-store',
  });

  const parsed = await parseProviderResponse<GeniusPayPaymentData>(response);
  if (!parsed.data?.reference) throw new Error('GeniusPay returned an invalid payment payload.');
  return parsed.data;
}

export function verifyGeniusPayWebhookSignature(rawPayload: string, signatureHeader: string | null): boolean {
  const secret = process.env.GENIUS_PAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const suppliedHex = signatureHeader.trim().replace(/^sha256=/i, '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(suppliedHex)) return false;

  const expectedHex = createHmac('sha256', secret).update(rawPayload, 'utf8').digest('hex');
  const supplied = Buffer.from(suppliedHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
