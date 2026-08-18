export type PlanTier = 'PRO' | 'VIP' | 'EXTRA';
export type PaymentProvider = 'money_fusion' | 'genius_pay' | 'manual';
export type SubscriptionStatus = 'active' | 'expired' | 'pending' | 'cancelled';
export type HairstyleCategory = 'fade' | 'locks' | 'tresses' | 'afro' | 'barbe';

export interface Salon {
  id: string;
  name: string;
  phone?: string;
  country: string;
  plan: PlanTier;
  quota_limit: number;
  quota_used: number;
  storage_used_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  salon_id: string;
  provider: PaymentProvider;
  amount_fcfa: number;
  status: SubscriptionStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Hairstyle {
  id: string;
  category: HairstyleCategory;
  title: string;
  description?: string;
  thumbnail_url: string;
  mesh_3d_url?: string;
  is_premium_upsell: boolean;
  created_at: string;
}

export interface ClientHead {
  id: string;
  salon_id: string;
  client_name: string;
  photos_urls: string[];
  mesh_3d_url?: string;
  saved_hairstyle_id?: string;
  is_saved_permanently: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
}
