'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { PaymentProvider } from '@/lib/payment-providers';
import { PlanName, SalonProfileFields, TermId } from '@/lib/plans';

export interface AuthUser {
  id?: string;
  email: string;
  name: string;
  role: 'customer' | 'salon' | 'admin';
  profile: SalonProfileFields;
  subscription: {
    plan: PlanName;
    term: TermId;
    monthlyFcfa: number;
    startedAt: string;
    isFirstWithDiscount: boolean;
  } | null;
  everSubscribed: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  hydrated: boolean;
  loginWithEmail: (email: string) => Promise<boolean>;
  verifyEmailOtp: (email: string, token: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<SalonProfileFields>) => void;
  subscribe: (plan: PlanName, amount: number, term: TermId, provider?: PaymentProvider) => Promise<void>;
}

const STORAGE_KEY = 'afrofade_auth_v1';
const AuthContext = createContext<AuthContextValue | null>(null);

interface ServerSessionUser {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'salon' | 'admin';
  salonId: string | null;
}

function mergeServerUser(serverUser: ServerSessionUser, cached: AuthUser | null): AuthUser {
  return {
    id: serverUser.id,
    email: serverUser.email,
    name: serverUser.name,
    role: serverUser.role,
    profile: cached?.profile || { salonName: '', country: '', phone: '' },
    subscription: cached?.subscription || null,
    everSubscribed: cached?.everSubscribed || false,
  };
}

async function establishServerSession(accessToken: string): Promise<ServerSessionUser | null> {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.user ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const persist = useCallback((next: AuthUser | null) => {
    setUser(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    let cached: AuthUser | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      cached = raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      cached = null;
    }

    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return (data.user ?? null) as ServerSessionUser | null;
      })
      .then((serverUser) => {
        if (serverUser) persist(mergeServerUser(serverUser, cached));
        else persist(null);
      })
      .catch(() => persist(null))
      .finally(() => setHydrated(true));

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.access_token) return;
      const serverUser = await establishServerSession(session.access_token);
      if (!serverUser) return;
      setUser((previous) => mergeServerUser(serverUser, previous));
    });

    return () => authListener.subscription.unsubscribe();
  }, [persist]);

  const loginWithEmail = useCallback(async (email: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) console.warn('[Auth] Unable to send OTP:', error.message);
    return !error;
  }, []);

  const verifyEmailOtp = useCallback(
    async (email: string, token: string): Promise<boolean> => {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (error || !data.session) return false;

      const serverUser = await establishServerSession(data.session.access_token);
      if (!serverUser) return false;

      persist(mergeServerUser(serverUser, user));
      return true;
    },
    [persist, user]
  );

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await Promise.allSettled([
      supabase.auth.signOut(),
      fetch('/api/auth/session', { method: 'DELETE' }),
    ]);
    persist(null);
  }, [persist]);

  const updateProfile = useCallback((patch: Partial<SalonProfileFields>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, profile: { ...prev.profile, ...patch } };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const subscribe = useCallback(
    async (plan: PlanName, _amount: number, term: TermId, provider: PaymentProvider = 'money_fusion') => {
      const response = await fetch('/api/v1/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, purpose: 'subscription', planName: plan, termId: term }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Échec de la création du paiement.');
      if (!data.url) throw new Error('Le prestataire de paiement n’a pas retourné de lien de paiement.');

      window.location.assign(data.url);
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      hydrated,
      loginWithEmail,
      verifyEmailOtp,
      loginWithGoogle,
      logout,
      updateProfile,
      subscribe,
    }),
    [user, hydrated, loginWithEmail, verifyEmailOtp, loginWithGoogle, logout, updateProfile, subscribe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous <AuthProvider>');
  return ctx;
}
