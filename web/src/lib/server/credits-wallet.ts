import { getServiceSupabase } from './marketplace';

export interface CreditActionCost {
  action: 'CREATE_HEAD' | 'RECONSTRUCT_NEW_PHOTOS' | 'DOWNLOAD_HD' | 'TRYON_EXPLORE';
  cost: number;
}

export const CREDIT_COSTS: Record<string, number> = {
  CREATE_HEAD: 2,
  RECONSTRUCT_NEW_PHOTOS: 2,
  DOWNLOAD_HD: 1,
  TRYON_EXPLORE: 0,
};

export async function getUserCreditBalance(userId: string): Promise<number> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('credits_balance')
    .eq('user_id', userId)
    .single();

  if (error || !data) return 0;
  return data.credits_balance ?? 0;
}

export async function reserveCredits(params: {
  userId: string;
  action: 'CREATE_HEAD' | 'RECONSTRUCT_NEW_PHOTOS' | 'DOWNLOAD_HD' | 'TRYON_EXPLORE';
  idempotencyKey: string;
}): Promise<{ success: boolean; reservedAmount: number; newBalance: number }> {
  const cost = CREDIT_COSTS[params.action] ?? 0;
  if (cost === 0) {
    const currentBalance = await getUserCreditBalance(params.userId);
    return { success: true, reservedAmount: 0, newBalance: currentBalance };
  }

  const supabase = getServiceSupabase();
  const currentBalance = await getUserCreditBalance(params.userId);

  if (currentBalance < cost) {
    throw new Error(`Insufficient credit balance. Required: ${cost}, Available: ${currentBalance}`);
  }

  // Deduct credits atomically
  const { data, error } = await supabase
    .from('customer_profiles')
    .update({ credits_balance: currentBalance - cost })
    .eq('user_id', params.userId)
    .select('credits_balance')
    .single();

  if (error || !data) {
    throw new Error('Failed to reserve credits');
  }

  // Record ledger entry
  await supabase.from('customer_credits_ledger').insert({
    user_id: params.userId,
    amount: -cost,
    reason: `RESERVE_${params.action}`,
    idempotency_key: params.idempotencyKey,
  });

  return { success: true, reservedAmount: cost, newBalance: data.credits_balance };
}

export async function refundCredits(params: {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
}): Promise<{ success: boolean; newBalance: number }> {
  if (params.amount <= 0) {
    const currentBalance = await getUserCreditBalance(params.userId);
    return { success: true, newBalance: currentBalance };
  }

  const supabase = getServiceSupabase();
  const currentBalance = await getUserCreditBalance(params.userId);

  const { data, error } = await supabase
    .from('customer_profiles')
    .update({ credits_balance: currentBalance + params.amount })
    .eq('user_id', params.userId)
    .select('credits_balance')
    .single();

  if (error || !data) {
    throw new Error('Failed to refund credits');
  }

  await supabase.from('customer_credits_ledger').insert({
    user_id: params.userId,
    amount: params.amount,
    reason: `REFUND_${params.reason}`,
    idempotency_key: params.idempotencyKey,
  });

  return { success: true, newBalance: data.credits_balance };
}
