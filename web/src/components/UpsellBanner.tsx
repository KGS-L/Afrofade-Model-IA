'use client';

import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { HairstyleItem } from './HairstyleCatalog';

interface UpsellBannerProps {
  selectedHairstyle: HairstyleItem | null;
  onUpgradeClick: () => void;
  onClose?: () => void;
}

export const UpsellBanner: React.FC<UpsellBannerProps> = ({
  selectedHairstyle,
  onUpgradeClick,
  onClose,
}) => {
  if (!selectedHairstyle) return null;

  const isPremium = selectedHairstyle.isPremium;

  return (
    <div className="relative rounded-card bg-gradient-to-r from-terracotta/10 via-cream to-terracotta-wash border border-terracotta/30 p-4 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-ink-soft hover:text-ink transition-colors p-1"
          title="Fermer la suggestion"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center shrink-0 shadow-soft">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-terracotta-dark text-white px-2 py-0.5 rounded-full">
              {isPremium ? 'Formule VIP Salon' : 'Suggestion Coiffeur'}
            </span>
            <span className="text-xs font-bold text-ink">
              {selectedHairstyle.title}
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            {isPremium
              ? 'Style haute précision réservé aux salons VIP. Proposez le soin barbe assorti (+2 500 FCFA).'
              : 'Associez cette coupe à des contours rasoir haute précision pour un rendu photo 3D parfait.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
        <div className="hidden md:flex items-center gap-1 text-[11px] text-ink-soft">
          <ShieldCheck className="w-3.5 h-3.5 text-terracotta" />
          <span>Inclus dans le pack VIP</span>
        </div>

        <button
          onClick={onUpgradeClick}
          className="min-h-[44px] px-4 rounded-pill bg-terracotta hover:bg-terracotta-dark text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-soft"
        >
          <span>Ajouter la formule VIP</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
