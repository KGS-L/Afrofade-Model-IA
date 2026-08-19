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
  loginWithGoogle: (nextUrl?: string) => Promise<void>;
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
  subscription: AuthUser['subscription'];
  everSubscribed: boolean;
}

function mergeServerUser(serverUser: ServerSessionUser, cached: AuthUser | null): AuthUser {
  return {
    id: serverUser.id,
    email: serverUser.email,
    name: serverUser.name,
    role: serverUser.role,
    profile: cached?.profile || { salonName: '', country: '', phone: '' },
    subscription: serverUser.subscription,
    everSubscribed: serverUser.everSubscribed,
  };
}

async function fetchServerSession(): Promise<ServerSessionUser | null> {
  const response = await fetch('/api/auth/session', { cache: 'no-store' });
  if (!response.ok) return null;
  const data = await response.json();
  return (data.user ?? null) as ServerSessionUser | null;
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
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    let cached: AuthUser | null = null;
    let paymentPollTimer: number | null = null;
    let paymentPollStopTimer: number | null = null;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      cached = raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      cached = null;
    }

    fetchServerSession()
      .then((serverUser) => {
        if (serverUser) persist(mergeServerUser(serverUser, cached));
        else persist(null);
      })
      .catch(() => persist(null))
      .finally(() => setHydrated(true));

    const paymentPending = new URLSearchParams(window.location.search).get('payment') === 'pending';
    if (paymentPending) {
      paymentPollTimer = window.setInterval(async () => {
        try {
          const serverUser = await fetchServerSession();
          if (!serverUser) return;
          setUser((previous) => {
            const next = mergeServerUser(serverUser, previous);
            try {
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {
              // ignore
            }
            return next;
          });
          if (serverUser.subscription && paymentPollTimer !== null) {
            window.clearInterval(paymentPollTimer);
            paymentPollTimer = null;
          }
        } catch {
          // transient provider/webhook lag
        }
      }, 2000);

      paymentPollStopTimer = window.setTimeout(() => {
        if (paymentPollTimer !== null) {
          window.clearInterval(paymentPollTimer);
          paymentPollTimer = null;
        }
      }, 30000);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.access_token) return;
      const serverUser = await establishServerSession(session.access_token);
      if (!serverUser) return;
      setUser((previous) => mergeServerUser(serverUser, previous));
    });

    return () => {
      authListener.subscription.unsubscribe();
      if (paymentPollTimer !== null) window.clearInterval(paymentPollTimer);
      if (paymentPollStopTimer !== null) window.clearTimeout(paymentPollStopTimer);
    };
  }, [persist]);

  const loginWithEmail = useCallback(async (email: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
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

  const loginWithGoogle = useCallback(async (nextUrl = '/dashboard') => {
    const safeNext = nextUrl.startsWith('/') && !nextUrl.startsWith('//') ? nextUrl : '/dashboard';
    const callbackUrl = new URL('/connexion', window.location.origin);
    callbackUrl.searchParams.set('next', safeNext);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl.toString() },
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

  // Kept for compatibility with legacy UI; operational dashboards persist
  // profile changes through authenticated server routes instead of this cache.
  const updateProfile = useCallback((patch: Partial<SalonProfileFields>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, profile: { ...prev.profile, ...patch } };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
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
