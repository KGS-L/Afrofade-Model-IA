'use client';

import React from 'react';
import { Sparkles, PlusCircle } from 'lucide-react';

interface UpsellBannerProps {
  activeStyleTitle: string;
  onAddUpsell: (price: number, serviceName: string) => void;
}

export const UpsellBanner: React.FC<UpsellBannerProps> = ({
  activeStyleTitle,
  onAddUpsell,
}) => {
  return (
    <div className="bg-card border-l-4 border-premium rounded-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="bg-premium text-white text-[11px] font-bold tracking-[0.1em] rounded-pill px-3 py-1.5 whitespace-nowrap flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
          PREMIUM
        </span>
        <p className="text-sm text-ink-soft">
          Le client s'intéresse à{' '}
          <strong className="text-ink">{activeStyleTitle}</strong>. Proposez le
          soin contour &amp; barbe assorti !
        </p>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={() => onAddUpsell(2000, 'Soin Barbe & Contours Razoir')}
          className="min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-1.5 bg-premium hover:bg-premium/90 text-white font-bold text-xs px-4 rounded-pill transition-colors shadow-soft"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ajouter le soin barbe (+2 000 FCFA)</span>
        </button>
      </div>
    </div>
  );
};
