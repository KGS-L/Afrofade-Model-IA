'use client';

import React from 'react';
import { Scissors, Sparkles, CreditCard, UserCheck } from 'lucide-react';

interface NavbarProps {
  onOpenPricing: () => void;
  quotaUsed: number;
  quotaLimit: number;
  currentPlan: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenPricing,
  quotaUsed,
  quotaLimit,
  currentPlan,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Scissors className="w-5 h-5 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            Afrofade <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">3D Studio</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
            Le Rituel du Miroir • Barber Virtual Studio
          </p>
        </div>
      </div>

      {/* Salon Quota & Active Plan */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-full text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Plan <strong className="text-amber-400 uppercase font-bold">{currentPlan}</strong></span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div className="text-slate-400">
            Têtes ce mois: <span className="text-white font-bold">{quotaUsed}</span> / {quotaLimit}
          </div>
        </div>

        {/* Upgrade / Subscription Button */}
        <button
          onClick={onOpenPricing}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>Changer de Plan</span>
        </button>
      </div>
    </header>
  );
};
