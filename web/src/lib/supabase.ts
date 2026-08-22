import { createClient } from '@supabase/supabase-js';

const rawPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const publicUrl = rawPublicUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(publicUrl, supabaseAnonKey);

/**
 * URL de la couche données vue côté serveur. SUPABASE_URL permet de servir
 * les données depuis une couche locale (dev : gateway PostgREST) tandis que
 * le navigateur continue d'utiliser NEXT_PUBLIC_SUPABASE_URL (cloud) pour
 * l'authentification GoTrue.
 */
function serverDataUrl(): string {
  const raw = process.env.SUPABASE_URL || rawPublicUrl;
  return raw.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

/**
 * Server-only Supabase client for privileged operations.
 * Privileged code must fail closed when the service role key is missing.
 */
export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Supabase server credentials are not configured.');
  }

  return createClient(serverDataUrl(), serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Client données scopé sur l'utilisateur (Bearer accessToken).
 * Factory partagée par les routes marketplace/careers/workspace.
 */
export function getUserScopedClient(accessToken: string) {
  const url = serverDataUrl();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anon) throw new Error('Supabase public credentials missing');

  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
