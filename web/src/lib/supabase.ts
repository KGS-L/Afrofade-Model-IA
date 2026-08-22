import { createClient } from '@supabase/supabase-js';

function resolveLocalUrl(): string {
  const envUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (envUrl && !envUrl.includes('supabase.co') && !envUrl.includes('placeholder')) {
    return envUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

const localUrl = resolveLocalUrl();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'local-dev-anon-key';

export const supabase = createClient(localUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'local-dev-service-key';
  return createClient(resolveLocalUrl(), serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getUserScopedClient(accessToken: string) {
  const url = resolveLocalUrl();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'local-dev-anon-key';

  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
