'use client';

import React, { useState } from 'react';
import { Scissors, Sparkles, UserCheck, Search, Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenPricing: () => void;
  onTryRituel: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
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
  onTryRituel,
  searchQuery,
  onSearchChange,
  quotaUsed,
  quotaLimit,
  currentPlan,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-ink/10">
      <div className="max-w-container mx-auto px-6 py-3 flex items-center gap-6">
        {/* Brand Logo */}
        <a
          href="#"
          className="flex items-center gap-2.5 shrink-0"
          aria-label="Afrofade — retour en haut de page"
          onClick={() => setMenuOpen(false)}
        >
          <div className="w-10 h-10 rounded-card bg-terracotta flex items-center justify-center">
            <Scissors className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <span className="font-display text-xl tracking-tight text-ink">
            Afro<span className="text-terracotta">fade</span>
          </span>
        </a>

        {/* Ancres desktop (IA §1) */}
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
          {/* Recherche catalogue — filtre le catalogue du Rituel */}
          <label className="hidden lg:flex items-center gap-2 min-h-[44px] border border-ink/15 rounded-pill bg-card px-4 w-[190px]">
            <Search className="w-4 h-4 text-ink-soft shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher un style…"
              aria-label="Rechercher un style dans le catalogue"
              className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-soft focus:outline-none"
            />
          </label>

          {/* Salon Quota & Active Plan — cliquable, ouvre le pricing */}
          <button
            onClick={onOpenPricing}
            aria-label={`Plan ${currentPlan}, ${quotaUsed} têtes sur ${quotaLimit} ce mois — voir les plans`}
            className="hidden md:flex items-center gap-3 bg-card border border-ink/10 px-4 min-h-[44px] rounded-pill text-xs hover:border-terracotta/40 transition-colors"
          >
            <span className="flex items-center gap-1.5 text-ink-soft">
              <UserCheck className="w-4 h-4 text-terracotta" />
              <span>
                Plan{' '}
                <strong className="text-terracotta-dark font-bold uppercase">
                  {currentPlan}
                </strong>
              </span>
            </span>
            <span className="h-4 w-px bg-ink/15" />
            <span className="text-ink-soft">
              Têtes ce mois :{' '}
              <span className="text-ink font-bold">{quotaUsed}</span> /{' '}
              {quotaLimit}
            </span>
          </button>

          {/* CTA pill terracotta */}
          <button
            onClick={onTryRituel}
            className="min-h-[44px] inline-flex items-center gap-2 bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm px-5 rounded-pill transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Essayer le Rituel</span>
            <span className="sm:hidden">Essayer</span>
          </button>

          {/* Hamburger mobile (< lg) */}
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-controls="navbar-mobile-menu"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="lg:hidden w-11 h-11 rounded-pill bg-card border border-ink/15 text-ink flex items-center justify-center"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Panneau mobile : 4 ancres + CTA, cibles ≥ 44px */}
      {menuOpen && (
        <nav
          id="navbar-mobile-menu"
          aria-label="Navigation mobile"
          className="lg:hidden bg-card border-t border-ink/10 px-6 py-4 space-y-1 animate-fade-in"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="min-h-[48px] flex items-center px-3 rounded-pill text-sm font-medium text-ink hover:bg-terracotta-wash transition-colors"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => {
              setMenuOpen(false);
              onTryRituel();
            }}
            className="w-full min-h-[48px] mt-2 inline-flex items-center justify-center gap-2 bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm px-5 rounded-pill transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Essayer le Rituel
          </button>
        </nav>
      )}
    </header>
  );
};
