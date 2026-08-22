'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Sparkles, Store, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function BottomNav() {
  const pathname = usePathname();
  const { user, hydrated } = useAuth();

  // Resolve target route for profile tab based on auth state & role
  let accountPath = '/connexion';
  let accountLabel = 'Connexion';

  if (hydrated && user) {
    if (user.role === 'salon') {
      accountPath = '/dashboard';
      accountLabel = 'Mon Salon';
    } else if (user.role === 'admin') {
      accountPath = '/admin';
      accountLabel = 'Admin';
    } else {
      accountPath = '/account';
      accountLabel = 'Mon Espace';
    }
  }

  const tabs = [
    {
      href: '/discover',
      label: 'Découvrir',
      icon: Compass,
      active: pathname === '/discover' || pathname === '/',
    },
    {
      href: '/discover?type=salon',
      label: 'Salons',
      icon: Store,
      active: pathname.includes('type=salon'),
    },
    {
      href: '/rituel',
      label: 'Essayer 3D',
      icon: Sparkles,
      active: pathname.startsWith('/rituel'),
      highlight: true,
    },
    {
      href: accountPath,
      label: accountLabel,
      icon: UserRound,
      active:
        pathname.startsWith('/account') ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/connexion'),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-cream/95 backdrop-blur-md border-t border-ink/10 px-2 py-1.5 shadow-soft transition-all duration-200"
      aria-label="Navigation mobile du bas"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          if (tab.highlight) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center gap-1 group -mt-4"
              >
                <div
                  className={`w-12 h-12 rounded-pill flex items-center justify-center shadow-lg transition-transform duration-200 group-active:scale-95 ${
                    tab.active
                      ? 'bg-terracotta-dark text-white ring-4 ring-terracotta-wash'
                      : 'bg-terracotta text-white hover:bg-terracotta-dark'
                  }`}
                >
                  <Icon className="w-5 h-5 animate-pulse" />
                </div>
                <span className="text-[10px] font-bold text-terracotta-dark">
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-card transition-colors duration-150 ${
                tab.active
                  ? 'text-terracotta font-bold'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  tab.active ? 'stroke-[2.5px]' : 'stroke-[1.75px]'
                }`}
              />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
