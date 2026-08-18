export type PaymentProvider = 'money_fusion' | 'genius_pay';

const ALL_PROVIDERS: PaymentProvider[] = ['money_fusion', 'genius_pay'];

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return typeof value === 'string' && ALL_PROVIDERS.includes(value as PaymentProvider);
}

export function getEnabledPaymentProviders(): PaymentProvider[] {
  const raw = process.env.PAYMENT_ENABLED_PROVIDERS || 'money_fusion';
  const providers = raw
    .split(',')
    .map((value) => value.trim())
    .filter(isPaymentProvider);

  return providers.length ? Array.from(new Set(providers)) : ['money_fusion'];
}

export function isPaymentProviderEnabled(provider: PaymentProvider): boolean {
  return getEnabledPaymentProviders().includes(provider);
}
