export type PaymentProvider = 'money_fusion' | 'genius_pay';

export type PaymentProviderState = {
  provider: PaymentProvider;
  displayName: string;
  enabled: boolean;
  configured: boolean;
  effectiveEnabled: boolean;
};

export const PAYMENT_PROVIDER_META: Record<PaymentProvider, { displayName: string }> = {
  money_fusion: { displayName: 'Money Fusion' },
  genius_pay: { displayName: 'GeniusPay' },
};

const ALL_PROVIDERS: PaymentProvider[] = ['money_fusion', 'genius_pay'];

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return typeof value === 'string' && ALL_PROVIDERS.includes(value as PaymentProvider);
}

export function getConfiguredPaymentProviders(): PaymentProvider[] {
  const raw = process.env.PAYMENT_ENABLED_PROVIDERS || 'money_fusion';
  const providers = raw
    .split(',')
    .map((value) => value.trim())
    .filter(isPaymentProvider);
  return Array.from(new Set(providers));
}

// Compatibility: this is the hard server configuration allow-list only.
export function isPaymentProviderEnabled(provider: PaymentProvider): boolean {
  return getConfiguredPaymentProviders().includes(provider);
}

export async function getPaymentProviderStates(supabaseAdmin: any): Promise<PaymentProviderState[]> {
  const configured = new Set(getConfiguredPaymentProviders());
  let rows: Array<{ provider: string; display_name: string; enabled: boolean }> = [];

  try {
    const { data, error } = await supabaseAdmin
      .from('payment_provider_settings')
      .select('provider, display_name, enabled, sort_order')
      .order('sort_order', { ascending: true });
    if (!error && Array.isArray(data)) rows = data;
  } catch {
    // Migration may not have been applied yet. Fall back to fail-closed defaults.
  }

  return ALL_PROVIDERS.map((provider) => {
    const row = rows.find((item) => item.provider === provider);
    const enabled = row?.enabled ?? provider === 'money_fusion';
    const isConfigured = configured.has(provider);
    return {
      provider,
      displayName: row?.display_name || PAYMENT_PROVIDER_META[provider].displayName,
      enabled,
      configured: isConfigured,
      effectiveEnabled: enabled && isConfigured,
    };
  });
}

export async function getOperationalPaymentProviders(supabaseAdmin: any): Promise<PaymentProvider[]> {
  const states = await getPaymentProviderStates(supabaseAdmin);
  return states.filter((state) => state.effectiveEnabled).map((state) => state.provider);
}
