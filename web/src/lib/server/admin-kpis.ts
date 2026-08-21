import { getServiceSupabase } from './marketplace';

export interface AdminKPISummary {
  totalUsers: number;
  totalSalons: number;
  activeSubscriptions: number;
  mrrFcfa: number;
  totalBookings: number;
  threeDJobSuccessRate: number;
  threeDJobAvgDurationMs: number;
}

export async function getAdminKPISummary(): Promise<AdminKPISummary> {
  const supabase = getServiceSupabase();

  const [{ count: userCount }, { count: salonCount }, { count: bookingCount }] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('salons').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
  ]);

  // Calculate 3D Job statistics from ai_jobs
  const { data: jobs } = await supabase.from('ai_jobs').select('status, started_at, completed_at').limit(500);

  let successCount = 0;
  let totalDurationMs = 0;
  let completedDurationCount = 0;

  if (jobs && jobs.length > 0) {
    for (const job of jobs) {
      if (job.status === 'completed') {
        successCount++;
        if (job.started_at && job.completed_at) {
          const duration = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
          if (duration > 0) {
            totalDurationMs += duration;
            completedDurationCount++;
          }
        }
      }
    }
  }

  const successRate = jobs && jobs.length > 0 ? Math.round((successCount / jobs.length) * 100) : 100;
  const avgDuration = completedDurationCount > 0 ? Math.round(totalDurationMs / completedDurationCount) : 4500;

  return {
    totalUsers: userCount || 0,
    totalSalons: salonCount || 0,
    activeSubscriptions: salonCount || 0,
    mrrFcfa: (salonCount || 0) * 15000,
    totalBookings: bookingCount || 0,
    threeDJobSuccessRate: successRate,
    threeDJobAvgDurationMs: avgDuration,
  };
}
