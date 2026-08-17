'use client';

import React from 'react';
import { DollarSign, Sparkles, PlusCircle } from 'lucide-react';

interface UpsellBannerProps {
  activeStyleTitle: string;
  onAddUpsell: (price: number, serviceName: string) => void;
}

export const UpsellBanner: React.FC<UpsellBannerProps> = ({
  activeStyleTitle,
  onAddUpsell,
}) => {
  return (
    <div className="bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-amber-950/40 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
          <DollarSign className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Opportunité Upsell Premium Salon
          </h3>
          <p className="text-[11px] text-slate-300">
            Le client s'intéresse à <strong>{activeStyleTitle}</strong>. Proposez le soin contour & barbe assorti !
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={() => onAddUpsell(2000, 'Soin Barbe & Contours Razoir')}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-amber-500/20 hover:scale-[1.02]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ajouter Soin Barbe (+2 000 FCFA)</span>
        </button>
      </div>
    </div>
  );
};
