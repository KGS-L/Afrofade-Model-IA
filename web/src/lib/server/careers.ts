import { getServiceSupabase } from './marketplace';

export interface JobPostingItem {
  id: string;
  salonId: string;
  title: string;
  description: string;
  city?: string;
  workMode: 'full_time' | 'part_time' | 'chair_rental' | 'freelance';
  compensationRange?: string;
  status: 'draft' | 'active' | 'closed' | 'suspended';
  createdAt: string;
}

export async function listActiveJobs(city?: string): Promise<JobPostingItem[]> {
  const supabase = getServiceSupabase();
  let query = supabase.from('job_postings').select('*').eq('status', 'active');

  if (city) {
    query = query.eq('city', city);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error || !data) return [];

  return data.map((j: any) => ({
    id: j.id,
    salonId: j.salon_id,
    title: j.title,
    description: j.description,
    city: j.city,
    workMode: j.work_mode,
    compensationRange: j.compensation_range,
    status: j.status,
    createdAt: j.created_at,
  }));
}

export async function createJobPosting(
  userId: string,
  posting: Omit<JobPostingItem, 'id' | 'status' | 'createdAt'>
) {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('job_postings')
    .insert({
      salon_id: posting.salonId,
      title: posting.title,
      description: posting.description,
      city: posting.city || null,
      work_mode: posting.workMode,
      compensation_range: posting.compensationRange || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create job posting: ${error.message}`);
  }
  return data;
}

export async function submitJobApplication(params: {
  jobId: string;
  applicantUserId: string;
  coverNote?: string;
}) {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('job_applications')
    .insert({
      job_id: params.jobId,
      applicant_user_id: params.applicantUserId,
      cover_note: params.coverNote || null,
      status: 'submitted',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit job application: ${error.message}`);
  }
  return data;
}

export async function updateApplicationStatus(params: {
  applicationId: string;
  actorId: string;
  newStatus: 'submitted' | 'shortlisted' | 'interviewing' | 'hired' | 'rejected';
}) {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('job_applications')
    .update({ status: params.newStatus, updated_at: new Date().toISOString() })
    .eq('id', params.applicationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update job application status: ${error.message}`);
  }

  // If hired, automatically trigger membership handoff (Epic 16.5)
  if (params.newStatus === 'hired') {
    const { data: job } = await supabase
      .from('job_postings')
      .select('salon_id')
      .eq('id', data.job_id)
      .single();

    if (job?.salon_id) {
      await supabase.from('salon_memberships').upsert({
        user_id: data.applicant_user_id,
        salon_id: job.salon_id,
        role: 'professional',
        state: 'active',
      }, { onConflict: 'user_id,salon_id' });
    }
  }

  return data;
}
