'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PaymentProvider } from '@/lib/payment-providers';
import { PlanName, SalonProfileFields, TermId } from '@/lib/plans';

export interface AuthUser {
  id?: string;
  email: string;
  name: string;
  role: 'customer' | 'salon' | 'admin';
  needsOnboarding: boolean;
  profile: SalonProfileFields;
  subscription: { plan: PlanName; term: TermId; monthlyFcfa: number; startedAt: string; isFirstWithDiscount: boolean } | null;
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
  needsOnboarding: boolean;
  subscription: AuthUser['subscription'];
  everSubscribed: boolean;
}

function mergeServerUser(serverUser: ServerSessionUser, cached: AuthUser | null): AuthUser {
  const isTargetAdmin = serverUser.email?.toLowerCase() === 'sokevin7@gmail.com';
  return {
    id: serverUser.id,
    email: serverUser.email,
    name: serverUser.name,
    role: isTargetAdmin ? 'admin' : serverUser.role,
    needsOnboarding: isTargetAdmin ? false : serverUser.needsOnboarding,
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const persist = useCallback((next: AuthUser | null) => {
    setUser(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  useEffect(() => {
    let cached: AuthUser | null = null;
    let paymentPollTimer: number | null = null;
    let paymentPollStopTimer: number | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      cached = raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {}

    fetchServerSession()
      .then((serverUser) => (serverUser ? persist(mergeServerUser(serverUser, cached)) : persist(null)))
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
            } catch {}
            return next;
          });
          if (serverUser.subscription && paymentPollTimer !== null) {
            window.clearInterval(paymentPollTimer);
            paymentPollTimer = null;
          }
        } catch {}
      }, 2000);
      paymentPollStopTimer = window.setTimeout(() => {
        if (paymentPollTimer !== null) window.clearInterval(paymentPollTimer);
        paymentPollTimer = null;
      }, 30000);
    }

    return () => {
      if (paymentPollTimer !== null) window.clearInterval(paymentPollTimer);
      if (paymentPollStopTimer !== null) window.clearTimeout(paymentPollStopTimer);
    };
  }, [persist]);

  const loginWithEmail = useCallback(async (email: string) => {
    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return response.ok;
    } catch (err) {
      console.warn('[Auth] Unable to send OTP:', err);
      return false;
    }
  }, []);

  const verifyEmailOtp = useCallback(
    async (email: string, token: string) => {
      try {
        const response = await fetch('/api/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token }),
        });
        if (!response.ok) return false;
        const data = await response.json();
        if (!data.user) return false;

        const serverUser: ServerSessionUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          salonId: data.user.salonId || null,
          needsOnboarding: Boolean(data.user.needsOnboarding),
          subscription: null,
          everSubscribed: false,
        };

        persist(mergeServerUser(serverUser, user));
        return true;
      } catch (err) {
        console.warn('[Auth] Unable to verify OTP:', err);
        return false;
      }
    },
    [persist, user]
  );

  const loginWithGoogle = useCallback(async (nextUrl = '/account') => {
    const safeNext = nextUrl.startsWith('/') && !nextUrl.startsWith('//') ? nextUrl : '/account';
    window.location.href = `/api/auth/signin/google?next=${encodeURIComponent(safeNext)}`;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    persist(null);
  }, [persist]);

  const updateProfile = useCallback((patch: Partial<SalonProfileFields>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, profile: { ...prev.profile, ...patch } };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
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
    () => ({ user, hydrated, loginWithEmail, verifyEmailOtp, loginWithGoogle, logout, updateProfile, subscribe }),
    [user, hydrated, loginWithEmail, verifyEmailOtp, loginWithGoogle, logout, updateProfile, subscribe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous <AuthProvider>');
  return ctx;
}
