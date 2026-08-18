'use client';

import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-night text-white mt-auto">
      <div className="max-w-container mx-auto px-6 pt-14 pb-10 grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
        <div>
          <Link href="/" className="font-display text-[26px]">
            Afro<span className="text-terracotta">fade</span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-white/65 max-w-[34ch]">
            Le miroir du futur pour les salons qui font de chaque coupe une œuvre.
          </p>
          <div className="flex flex-wrap gap-2.5 mt-4">
            {['Wave', 'Orange Money', 'MTN', 'Moov'].map((p) => (
              <span
                key={p}
                className="border border-white/25 rounded-pill px-3 py-1.5 text-xs text-white/75"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <nav aria-label="Produit">
          <h4 className="text-xs font-bold tracking-[0.18em] text-white/50 mb-4">
            PRODUIT
          </h4>
          <ul className="space-y-2.5 text-sm text-white/80">
            <li>
              <Link href="/#rituel-studio" className="hover:text-terracotta transition-colors">
                Le Rituel
              </Link>
            </li>
            <li>
              <Link href="/styles" className="hover:text-terracotta transition-colors">
                Nos styles
              </Link>
            </li>
            <li>
              <Link href="/#tarifs" className="hover:text-terracotta transition-colors">
                Tarifs
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="hover:text-terracotta transition-colors">
                FAQ
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Légal">
          <h4 className="text-xs font-bold tracking-[0.18em] text-white/50 mb-4">
            LÉGAL
          </h4>
          <ul className="space-y-2.5 text-sm text-white/80">
            <li>
              <Link href="/legal/mentions-legales" className="hover:text-terracotta transition-colors">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/legal/confidentialite" className="hover:text-terracotta transition-colors">
                Confidentialité
              </Link>
            </li>
            <li>
              <Link href="/legal/cgv" className="hover:text-terracotta transition-colors">
                CGV
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Contact & Support">
          <h4 className="text-xs font-bold tracking-[0.18em] text-white/50 mb-4">
            CONTACT & SUPPORT
          </h4>
          <ul className="space-y-2.5 text-sm text-white/80">
            <li>
              <Link href="/contact" className="hover:text-terracotta transition-colors">
                Centre de support
              </Link>
            </li>
            <li>
              <a href="https://wa.me/2250000000000" target="_blank" rel="noopener noreferrer" className="hover:text-terracotta transition-colors">
                Support WhatsApp Salon
              </a>
            </li>
            <li>
              <a href="mailto:support@afrofade.com" className="hover:text-terracotta transition-colors">
                support@afrofade.com
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="max-w-container mx-auto px-6 border-t border-white/10 pt-5 pb-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-white/45">
        <span>© {new Date().getFullYear()} Afrofade SAS — Tous droits réservés</span>
        <span>
          Fabriqué avec <span aria-hidden="true">♥</span> pour les barbiers d’Afrique
        </span>
      </div>
    </footer>
  );
};
