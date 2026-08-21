export type OperatingMode = 'independent' | 'salon_staff' | 'both';
export type JobSeekingState = 'not_seeking' | 'open_to_offers' | 'actively_looking';
export type VerificationState = 'unverified' | 'pending' | 'verified' | 'rejected';
export type ListingState = 'draft' | 'published' | 'suspended' | 'hidden';

export type ProfessionalProfile = {
  id: string;
  userId: string;
  fullName: string | null;
  headline: string | null;
  bio: string | null;
  operatingMode: OperatingMode;
  jobSeekingState: JobSeekingState;
  city: string | null;
  neighborhood: string | null;
  serviceRadiusKm: number;
  verificationState: VerificationState;
  listingState: ListingState;
  createdAt: string;
  updatedAt: string;
};

export type SalonMembershipRole = 'owner' | 'manager' | 'professional';
export type SalonMembershipState = 'pending_invite' | 'active' | 'inactive' | 'revoked';

export type SalonMembership = {
  id: string;
  userId: string;
  salonId: string;
  role: SalonMembershipRole;
  state: SalonMembershipState;
  createdAt: string;
  updatedAt: string;
};
