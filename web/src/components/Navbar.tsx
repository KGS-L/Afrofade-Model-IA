'use client';

import React from 'react';
import { Scissors, Sparkles, UserCheck, Search } from 'lucide-react';

interface NavbarProps {
  onOpenPricing: () => void;
  quotaUsed: number;
  quotaLimit: number;
  currentPlan: string;
}

const NAV_LINKS = [
  { href: '#rituel-studio', label: 'Le Rituel' },
  { href: '#styles', label: 'Styles' },
  { href: '#tarifs', label: 'Tarifs' },
  { href: '#faq', label: 'FAQ' },
];

export const Navbar: React.FC<NavbarProps> = ({
  onOpenPricing,
  quotaUsed,
  quotaLimit,
  currentPlan,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-ink/10">
      <div className="max-w-container mx-auto px-6 py-3 flex items-center gap-6">
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-2.5 shrink-0" aria-label="Afrofade — retour en haut">
          <div className="w-10 h-10 rounded-card bg-terracotta flex items-center justify-center">
            <Scissors className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <span className="font-display text-xl tracking-tight text-ink">
            Afro<span className="text-terracotta">fade</span>
          </span>
        </a>

        {/* Ancres (IA §1) */}
        <nav
          aria-label="Navigation principale"
          className="hidden lg:flex items-center gap-1 ml-4"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="min-h-[44px] flex items-center px-3 rounded-pill text-sm font-medium text-ink-soft hover:text-terracotta transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Recherche catalogue (IA §1) */}
          <label className="hidden xl:flex items-center gap-2 min-h-[44px] border border-ink/15 rounded-pill bg-card px-4 w-[190px]">
            <Search className="w-4 h-4 text-ink-soft shrink-0" />
            <input
              type="search"
              placeholder="Rechercher un style…"
              aria-label="Rechercher un style"
              className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-soft focus:outline-none"
            />
          </label>

          {/* Salon Quota & Active Plan — comportement mock conservé */}
          <div
            className="hidden md:flex items-center gap-3 bg-card border border-ink/10 px-4 min-h-[44px] rounded-pill text-xs"
            aria-live="polite"
          >
            <div className="flex items-center gap-1.5 text-ink-soft">
              <UserCheck className="w-4 h-4 text-terracotta" />
              <span>
                Plan{' '}
                <strong className="text-terracotta-dark font-bold uppercase">
                  {currentPlan}
                </strong>
              </span>
            </div>
            <div className="h-4 w-px bg-ink/15" />
            <div className="text-ink-soft">
              Têtes ce mois :{' '}
              <span className="text-ink font-bold">{quotaUsed}</span> /{' '}
              {quotaLimit}
            </div>
          </div>

          {/* CTA pill terracotta */}
          <button
            onClick={onOpenPricing}
            className="min-h-[44px] inline-flex items-center gap-2 bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm px-5 rounded-pill transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Changer de plan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
