'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  PlanName,
  SalonProfileFields,
  TermId,
  TERMS,
  isProfileComplete,
  monthlyPrice,
} from '@/lib/plans';

/**
 * Authentification mock (Google ou e-mail + OTP) en attendant Supabase
 * Auth (AD-3). Persistée en localStorage ; rôle « salon » par défaut,
 * « admin » pour le dashboard d'administration.
 */

export interface AuthUser {
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
  loginWithEmail: (email: string) => void;
  loginWithGoogle: (email?: string) => void;
  loginAsAdmin: () => void;
  logout: () => void;
  updateProfile: (patch: Partial<SalonProfileFields>) => void;
  subscribe: (plan: PlanName, amount: number, term: TermId) => void;
}

const STORAGE_KEY = 'afrofade_auth_v1';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {
      /* stockage indisponible : session anonyme */
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: AuthUser | null) => {
    setUser(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const loginWithEmail = useCallback(
    (email: string) => {
      persist({
        email,
        name: email.split('@')[0] || 'Mon salon',
        role: 'salon',
        profile: { salonName: '', country: '', phone: '' },
        subscription: null,
        everSubscribed: false,
      });
    },
    [persist]
  );

  const loginWithGoogle = useCallback(
    (email = 'salon@gmail.com') => {
      persist({
        email,
        name: 'Salon Google',
        role: 'salon',
        profile: { salonName: '', country: '', phone: '' },
        subscription: null,
        everSubscribed: false,
      });
    },
    [persist]
  );

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

  const logout = useCallback(() => persist(null), [persist]);

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
      loginWithGoogle,
      loginAsAdmin,
      logout,
      updateProfile,
      subscribe,
    }),
    [user, hydrated, loginWithEmail, loginWithGoogle, loginAsAdmin, logout, updateProfile, subscribe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous <AuthProvider>');
  return ctx;
}
