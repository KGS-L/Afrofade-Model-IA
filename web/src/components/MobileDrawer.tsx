'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Scissors, X, Sparkles, LogIn, LogOut, ArrowRight, UserRound, Gauge } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type MobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  userDisplayName?: string;
};

const DEFAULT_LINKS = [
  { href: '/discover', label: 'Découvrir la marketplace' },
  { href: '/styles', label: 'Catalogue des styles 3D' },
  { href: '/discover?type=professional', label: 'Coiffeurs professionnels' },
  { href: '/discover?type=salon', label: 'Salons partenaires' },
  { href: '/pour-les-pros', label: 'Espace Salons (Pour les pros)' },
];

export function MobileDrawer({ isOpen, onClose, title = 'Menu principal', userDisplayName }: MobileDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const { user, hydrated, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquer le scroll d'arrière-plan quand le tiroir est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  let accountPath = '/account';
  let accountLabel = 'Mon Espace Client';
  if (user?.role === 'salon') {
    accountPath = '/dashboard';
    accountLabel = 'Mon Espace Salon';
  } else if (user?.role === 'admin') {
    accountPath = '/admin';
    accountLabel = 'Espace Admin';
  }

  const nameToShow = userDisplayName || user?.name || user?.email;

  const content = (
    <div className="fixed inset-0 z-[9999] lg:hidden">
      {/* Backdrop sombre 100% opaque pour masquer le contenu de la page */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Tiroir latéral 100% OPAQUE (Fond crème solide #FAF6F1) */}
      <aside
        className="fixed inset-y-0 right-0 z-[10000] w-[85vw] max-w-xs bg-[#FAF6F1] p-6 shadow-2xl flex flex-col justify-between border-l border-ink/10 overflow-y-auto"
        style={{ backgroundColor: '#FAF6F1' }}
      >
        <div className="space-y-6">
          {/* Entête du Tiroir */}
          <div className="flex items-center justify-between pb-4 border-b border-ink/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-card bg-terracotta text-white flex items-center justify-center shadow-soft">
                <Scissors className="w-5 h-5" />
              </div>
              <span className="font-display text-lg text-ink">{title}</span>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-pill border border-ink/15 bg-card flex items-center justify-center text-ink hover:bg-ink/5"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5 text-ink" />
            </button>
          </div>

          {/* Badge utilisateur connecté */}
          {hydrated && user && (
            <div className="p-3.5 bg-terracotta-wash rounded-card border border-terracotta/20 space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-ink-soft">Connecté en tant que</p>
              <p className="text-sm font-bold text-terracotta-dark truncate">{nameToShow}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-1">
            {hydrated && user && (
              <Link
                href={accountPath}
                onClick={onClose}
                className="min-h-[48px] flex items-center justify-between px-3 rounded-input text-sm font-bold text-terracotta bg-terracotta-wash/60 hover:bg-terracotta-wash transition-colors mb-2"
              >
                <span className="flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  {accountLabel}
                </span>
                <ArrowRight className="w-4 h-4 opacity-60" />
              </Link>
            )}

            {DEFAULT_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="min-h-[46px] flex items-center justify-between px-3 rounded-input text-sm font-bold text-ink hover:bg-terracotta-wash hover:text-terracotta transition-colors"
              >
                <span>{item.label}</span>
                <ArrowRight className="w-4 h-4 opacity-30" />
              </Link>
            ))}
          </nav>
        </div>

        {/* Pied du Tiroir (Actions) */}
        <div className="space-y-3 pt-6 border-t border-ink/10 mt-6">
          {hydrated && user ? (
            <button
              onClick={() => {
                onClose();
                void logout();
              }}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-pill bg-red-50 border border-red-200 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          ) : (
            <Link
              href="/connexion"
              onClick={onClose}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-pill border border-ink/15 bg-card text-sm font-bold text-ink hover:bg-ink/5 shadow-soft"
            >
              <LogIn className="w-4 h-4 text-terracotta" />
              Se connecter
            </Link>
          )}

          <Link
            href="/rituel"
            onClick={onClose}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-pill bg-terracotta text-white text-sm font-bold shadow-soft hover:bg-terracotta-dark transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Essayer une coiffure 3D
          </Link>
        </div>
      </aside>
    </div>
  );

  return createPortal(content, document.body);
}
