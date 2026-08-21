/**
 * Story 17.4 — Marketplace Payment Accounting & Split Helper
 */

export interface PaymentSplitResult {
  grossAmount: number;
  platformFeeAmount: number;
  providerNetAmount: number;
  commissionRateBips: number;
}

export function calculateMarketplacePaymentSplit({
  grossAmount,
  commissionRateBips = 1000, // Default 10% platform commission
}: {
  grossAmount: number;
  commissionRateBips?: number;
}): PaymentSplitResult {
  if (grossAmount < 0) {
    throw new Error('grossAmount cannot be negative');
  }
  if (commissionRateBips < 0 || commissionRateBips > 10000) {
    throw new Error('commissionRateBips must be between 0 and 10000');
  }

  const platformFeeAmount = Math.round((grossAmount * commissionRateBips) / 10000);
  const providerNetAmount = Math.max(0, grossAmount - platformFeeAmount);

  return {
    grossAmount,
    platformFeeAmount,
    providerNetAmount,
    commissionRateBips,
  };
}
