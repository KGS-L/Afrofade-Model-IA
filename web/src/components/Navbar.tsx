'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Scissors, UserRound, Sparkles, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { MobileDrawer } from '@/components/MobileDrawer';

const NAV_LINKS = [
  { href: '/discover', label: 'Découvrir' },
  { href: '/styles', label: 'Catalogue 3D' },
  { href: '/discover?type=professional', label: 'Professionnels' },
  { href: '/discover?type=salon', label: 'Salons' },
  { href: '/pour-les-pros', label: 'Pour les pros' },
];

function getPageBadge(pathname: string): string | null {
  if (pathname.startsWith('/account')) return 'Espace particulier';
  if (pathname.startsWith('/dashboard')) return 'Espace salon';
  if (pathname.startsWith('/admin')) return 'Espace Admin';
  return null;
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, hydrated, logout } = useAuth();

  const pageBadge = getPageBadge(pathname);

  let accountPath = '/account';
  let accountLabel = 'Mon Espace';
  if (user?.role === 'salon') {
    accountPath = '/dashboard';
    accountLabel = 'Mon Espace Salon';
  } else if (user?.role === 'admin') {
    accountPath = '/admin';
    accountLabel = 'Espace Admin';
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-8 min-h-[68px] flex items-center gap-3 sm:gap-6">
        {/* Logo & Page Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 shrink-0"
            aria-label="Afrofade — accueil"
          >
            <span className="w-10 h-10 rounded-card bg-terracotta text-white flex items-center justify-center shadow-soft">
              <Scissors className="w-5 h-5" />
            </span>
            <span className="font-display text-xl">
              Afro<span className="text-terracotta">fade</span>
            </span>
          </Link>

          {pageBadge && (
            <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-terracotta bg-terracotta-wash px-3 py-1.5 rounded-pill shrink-0">
              <UserRound className="w-3.5 h-3.5 hidden sm:inline" />
              {pageBadge}
            </span>
          )}
        </div>

        {/* Navigation Principale toujours présente au centre sur Desktop */}
        <nav className="hidden lg:flex items-center gap-1 ml-2">
          {NAV_LINKS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-[44px] inline-flex items-center px-3.5 rounded-pill text-sm font-bold transition-colors ${
                  isActive
                    ? 'text-terracotta bg-terracotta-wash/50'
                    : 'text-ink-soft hover:text-terracotta hover:bg-terracotta-wash/30'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions à droite (Auth status + CTA) */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
          {hydrated && user ? (
            <>
              <Link
                href={accountPath}
                className={`hidden sm:inline-flex min-h-[42px] items-center gap-2 px-4 rounded-pill border text-sm font-bold transition-all ${
                  pathname.startsWith(accountPath)
                    ? 'bg-ink text-white border-ink shadow-soft'
                    : 'border-ink/15 bg-card text-ink hover:bg-ink/5'
                }`}
              >
                <UserRound className="w-4 h-4 text-terracotta" />
                {accountLabel}
              </Link>

              <Link
                href="/rituel"
                className="hidden sm:inline-flex min-h-[42px] items-center gap-2 px-4 rounded-pill bg-terracotta hover:bg-terracotta-dark px-4 sm:px-5 text-sm font-bold text-white shadow-soft transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Tester un style
              </Link>

              <button
                onClick={() => void logout()}
                aria-label="Se déconnecter"
                title="Se déconnecter"
                className="hidden sm:flex w-10 h-10 rounded-pill border border-ink/15 bg-card items-center justify-center text-ink hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className="hidden sm:inline-flex min-h-[44px] items-center px-4 text-sm font-bold text-ink-soft hover:text-terracotta"
              >
                Se connecter
              </Link>

              <Link
                href="/rituel"
                className="hidden sm:inline-flex min-h-[44px] items-center rounded-pill bg-terracotta hover:bg-terracotta-dark px-4 sm:px-5 text-sm font-bold text-white shadow-soft transition-all"
              >
                Essayer une coiffure
              </Link>
            </>
          )}

          {/* Bouton Hamburger pour le Tiroir mobile */}
          <button
            className="lg:hidden w-10 h-10 rounded-pill border border-ink/15 bg-card flex items-center justify-center shadow-soft hover:bg-ink/5"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5 text-ink" />
          </button>
        </div>
      </div>

      <MobileDrawer isOpen={open} onClose={() => setOpen(false)} title="Menu principal" />
    </header>
  );
}
