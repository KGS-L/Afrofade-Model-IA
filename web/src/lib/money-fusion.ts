/**
 * Server-side Money Fusion Web API integration.
 *
 * Money Fusion's merchant dashboard provides the payment API URL directly.
 * The webhook is not trusted as proof of payment: completed payments are
 * re-fetched from the provider status endpoint before commerce finalization.
 */

export type MoneyFusionPaymentStatus = 'pending' | 'failure' | 'no paid' | 'paid';

export interface MoneyFusionCheckoutPayload {
  totalPrice: number;
  article: Array<Record<string, number>>;
  personal_Info?: Array<Record<string, string | number>>;
  numeroSend: string;
  nomclient: string;
  return_url?: string;
  webhook_url?: string;
}

export interface MoneyFusionCheckoutResponse {
  statut: boolean;
  token?: string;
  message?: string;
  url?: string;
}

export interface MoneyFusionPaymentDetails {
  _id: string;
  tokenPay: string;
  numeroSend?: string;
  nomclient?: string;
  personal_Info?: Array<Record<string, unknown>>;
  numeroTransaction?: string;
  Montant: number;
  frais?: number;
  statut: MoneyFusionPaymentStatus;
  moyen?: string;
  return_url?: string;
  createdAt?: string;
}

export interface MoneyFusionStatusResponse {
  statut: boolean;
  data?: MoneyFusionPaymentDetails;
  message?: string;
}

function getMoneyFusionApiUrl(): string {
  // Keep MONEY_FUSION_URL as a temporary compatibility alias for existing VPS envs.
  const apiUrl = process.env.MONEY_FUSION_API_URL || process.env.MONEY_FUSION_URL;
  if (!apiUrl) throw new Error('MONEY_FUSION_API_URL is not configured.');
  return apiUrl;
}

function getMoneyFusionStatusBaseUrl(): string {
  return (process.env.MONEY_FUSION_STATUS_URL || 'https://www.pay.moneyfusion.net/paiementNotif').replace(/\/$/, '');
}

export async function createMoneyFusionPaymentSession(
  payload: MoneyFusionCheckoutPayload
): Promise<MoneyFusionCheckoutResponse> {
  const response = await fetch(getMoneyFusionApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const providerBody = await response.text().catch(() => '');
    throw new Error(`Money Fusion checkout failed (${response.status}): ${providerBody.slice(0, 300)}`);
  }

  const data = (await response.json()) as MoneyFusionCheckoutResponse;
  if (!data.statut || !data.url || !data.token) {
    throw new Error(data.message || 'Money Fusion returned an invalid checkout response.');
  }

  return data;
}

export async function getMoneyFusionPaymentStatus(token: string): Promise<MoneyFusionPaymentDetails> {
  if (!token) throw new Error('Money Fusion payment token is required.');

  const response = await fetch(`${getMoneyFusionStatusBaseUrl()}/${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    const providerBody = await response.text().catch(() => '');
    throw new Error(`Money Fusion status check failed (${response.status}): ${providerBody.slice(0, 300)}`);
  }

  const payload = (await response.json()) as MoneyFusionStatusResponse;
  if (!payload.statut || !payload.data?.tokenPay) {
    throw new Error(payload.message || 'Money Fusion returned an invalid payment status payload.');
  }

  return payload.data;
}
