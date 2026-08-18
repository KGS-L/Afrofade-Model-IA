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
import {
  PlanName,
  SalonProfileFields,
  TermId,
  TERMS,
  isProfileComplete,
  monthlyPrice,
} from '@/lib/plans';

export interface AuthUser {
  id?: string;
  email: string;
  name: string;
  role: 'salon' | 'admin';
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
  loginAsAdmin: () => void;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<SalonProfileFields>) => void;
  subscribe: (plan: PlanName, amount: number, term: TermId) => void;
}

const STORAGE_KEY = 'afrofade_auth_v1';
const COOKIE_NAME = 'afrofade_session';

function setSessionCookie(token: string) {
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function removeSessionCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {
      /* storage unavailable */
    }
    setHydrated(true);

    // Listen to Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setSessionCookie(session.access_token);
          setUser((prev) => ({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Salon',
            role: session.user.email?.endsWith('@afrofade.app') ? 'admin' : 'salon',
            profile: prev?.profile || { salonName: '', country: '', phone: '' },
            subscription: prev?.subscription || null,
            everSubscribed: prev?.everSubscribed || false,
          }));
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const persist = useCallback((next: AuthUser | null) => {
    setUser(next);
    try {
      if (next) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSessionCookie(next.id || 'active-session');
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
        removeSessionCookie();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      console.warn('Supabase OTP fallback to demo mode:', error.message);
    }
    return !error;
  }, []);

  const verifyEmailOtp = useCallback(
    async (email: string, token: string): Promise<boolean> => {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (!error && data.session) {
        persist({
          id: data.session.user.id,
          email,
          name: email.split('@')[0] || 'Salon',
          role: email.endsWith('@afrofade.app') ? 'admin' : 'salon',
          profile: { salonName: '', country: '', phone: '' },
          subscription: null,
          everSubscribed: false,
        });
        return true;
      }

      // Demo fallback if token is 123456
      if (token === '123456') {
        persist({
          email,
          name: email.split('@')[0] || 'Salon',
          role: 'salon',
          profile: { salonName: '', country: '', phone: '' },
          subscription: null,
          everSubscribed: false,
        });
        return true;
      }

      return false;
    },
    [persist]
  );

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      console.warn('Supabase Google OAuth fallback to demo mode:', error.message);
      persist({
        email: 'salon.google@gmail.com',
        name: 'Salon Google',
        role: 'salon',
        profile: { salonName: '', country: '', phone: '' },
        subscription: null,
        everSubscribed: false,
      });
    }
  }, [persist]);

  const loginAsAdmin = useCallback(() => {
    persist({
      email: 'admin@afrofade.app',
      name: 'Admin Afrofade',
      role: 'admin',
      profile: { salonName: 'Afrofade HQ', country: 'Côte d’Ivoire', phone: '+225 00 00 00 00' },
      subscription: null,
      everSubscribed: false,
    });
  }, [persist]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    persist(null);
  }, [persist]);

  const updateProfile = useCallback(
    (patch: Partial<SalonProfileFields>) => {
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
    },
    []
  );

  const subscribe = useCallback((plan: PlanName, amount: number, term: TermId) => {
    setUser((prev) => {
      if (!prev) return prev;
      const eligible = isProfileComplete(prev.profile) && !prev.everSubscribed;
      const discount = eligible ? TERMS.find((t) => t.id === term)?.discount ?? 0 : 0;
      const next: AuthUser = {
        ...prev,
        everSubscribed: true,
        subscription: {
          plan,
          term,
          monthlyFcfa: monthlyPrice(amount, discount),
          startedAt: new Date().toISOString(),
          isFirstWithDiscount: discount > 0,
        },
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      hydrated,
      loginWithEmail,
      verifyEmailOtp,
      loginWithGoogle,
      loginAsAdmin,
      logout,
      updateProfile,
      subscribe,
    }),
    [user, hydrated, loginWithEmail, verifyEmailOtp, loginWithGoogle, loginAsAdmin, logout, updateProfile, subscribe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous <AuthProvider>');
  return ctx;
}
