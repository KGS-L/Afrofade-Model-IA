import { getServiceSupabase } from './marketplace';
import { PLANS } from '@/lib/plans';

export interface SalonQuotaStatus {
  salonId: string;
  planName: string;
  monthlyQuota: number;
  usedThisMonth: number;
  remainingQuota: number;
  canCreateNewHead: boolean;
}

const QUOTAS_BY_PLAN: Record<string, number> = {
  FREE: 5,
  PRO: 20,
  VIP: 60,
  EXTRA: 120,
};

export async function getSalonQuotaStatus(salonId: string): Promise<SalonQuotaStatus> {
  const supabase = getServiceSupabase();

  const { data: salon } = await supabase
    .from('salons')
    .select('plan_name, new_heads_used_this_month')
    .eq('id', salonId)
    .single();

  const rawPlan = salon?.plan_name || 'FREE';
  const planName = String(rawPlan);
  const monthlyQuota = QUOTAS_BY_PLAN[planName] ?? 5;
  const usedThisMonth = salon?.new_heads_used_this_month ?? 0;
  const remainingQuota = Math.max(0, monthlyQuota - usedThisMonth);

  return {
    salonId,
    planName,
    monthlyQuota,
    usedThisMonth,
    remainingQuota,
    canCreateNewHead: remainingQuota > 0,
  };
}

export async function consumeSalonQuota(salonId: string): Promise<{ success: boolean; newUsedCount: number }> {
  const quota = await getSalonQuotaStatus(salonId);
  if (!quota.canCreateNewHead) {
    throw new Error(`Salon quota exceeded (${quota.usedThisMonth}/${quota.monthlyQuota}). Please upgrade plan.`);
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('salons')
    .update({ new_heads_used_this_month: quota.usedThisMonth + 1 })
    .eq('id', salonId)
    .select('new_heads_used_this_month')
    .single();

  if (error || !data) {
    throw new Error('Failed to consume salon quota');
  }

  return { success: true, newUsedCount: data.new_heads_used_this_month };
}
