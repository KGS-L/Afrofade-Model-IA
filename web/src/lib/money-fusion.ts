/**
 * Server-side helper for Money Fusion checkout creation.
 * Production payment code must never silently fall back to a simulated success.
 */

export interface MoneyFusionCheckoutPayload {
  totalPrice: number;
  article: Array<{ name: string; price: number }>;
  personal_info?: Array<{ client_name?: string; client_phone?: string }>;
  return_url?: string;
  cancel_url?: string;
  custom_metadata?: Record<string, string>;
}

export interface MoneyFusionCheckoutResponse {
  statut: boolean;
  token?: string;
  url?: string;
  message?: string;
}

export async function createMoneyFusionPaymentSession(
  payload: MoneyFusionCheckoutPayload
): Promise<MoneyFusionCheckoutResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afrofade.pro';
  const moneyFusionUrl = process.env.MONEY_FUSION_URL || 'https://www.moneyfusion.net/api/v1/pay';
  const apiKey = process.env.MONEY_FUSION_API_KEY;

  if (!apiKey) throw new Error('MONEY_FUSION_API_KEY is not configured.');

  const body = {
    totalPrice: payload.totalPrice,
    article: payload.article,
    personal_info: payload.personal_info || [],
    return_url: payload.return_url || `${appUrl}/dashboard?payment=pending&provider=money_fusion`,
    cancel_url: payload.cancel_url || `${appUrl}/dashboard?payment=cancelled`,
    custom_metadata: payload.custom_metadata || {},
  };

  const res = await fetch(moneyFusionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const providerBody = await res.text().catch(() => '');
    throw new Error(`Money Fusion checkout failed (${res.status}): ${providerBody.slice(0, 300)}`);
  }

  const data = (await res.json()) as MoneyFusionCheckoutResponse;
  if (!data.statut || !data.url || !data.token) {
    throw new Error(data.message || 'Money Fusion returned an invalid checkout response.');
  }

  return data;
}
