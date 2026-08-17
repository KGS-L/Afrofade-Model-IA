'use client';

import React from 'react';
import { X, Check, ShieldCheck, Zap, PhoneCall } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planName: string, priceFcfa: number) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
}) => {
  if (!isOpen) return null;

  const plans = [
    {
      name: 'PRO',
      price: '2 200 FCFA',
      amount: 2200,
      desc: 'Pour les barbiers indépendants & petits salons',
      popular: false,
      features: [
        '20 à 30 têtes 3D générées / mois (110 FCFA / tête)',
        'Consultation pré-coupe en direct salon',
        'Catalogue complet de 15+ coupes Afro & Barbes',
        'Support technique WhatsApp',
      ],
    },
    {
      name: 'VIP',
      price: '4 900 FCFA',
      amount: 4900,
      desc: 'Idéal pour les salons à fort passage (100k+ FCFA/mois)',
      popular: true,
      features: [
        '100 têtes 3D générées / mois (49 FCFA / tête)',
        'Carnet Client 3D (1 Go de stockage Cloud)',
        'Téléchargement HD des aperçus pour le client',
        'Bouton Upsell Prestations Premium intégré',
        'Support prioritaire 7j/7',
      ],
    },
    {
      name: 'EXTRA',
      price: '7 500 FCFA',
      amount: 7500,
      desc: 'Pour les grands salons & franchises',
      popular: false,
      features: [
        'Têtes 3D illimitées',
        'Multi-postes tablette / smartphone',
        'Carnet Client 3D Illimité',
        'Branding & Logo du salon personnalisé',
        'Accès en avant-première aux nouveaux styles 3D',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 max-w-lg mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            Abonnements Salons & Barbershops
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Choisissez la formule adaptée à votre salon
          </h2>
          <p className="text-xs text-slate-400">
            Paiement sécurisé par Mobile Money (Wave, Orange Money, MTN, Moov) & Carte via GeniusPay / Money Fusion.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 flex flex-col justify-between border transition-all ${
                plan.popular
                  ? 'bg-gradient-to-b from-slate-900 via-amber-950/20 to-slate-900 border-amber-500/60 shadow-xl shadow-amber-500/10 scale-[1.02]'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-md">
                  Recommandé Salon
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-extrabold text-amber-400">{plan.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 min-h-[32px]">{plan.desc}</p>
                </div>

                <div className="border-t border-b border-slate-800/80 py-3">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-slate-400 ml-1">/mois</span>
                </div>

                {/* Features list */}
                <ul className="space-y-2 text-xs">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mobile Money Subscribe CTA */}
              <button
                onClick={() => onSelectPlan(plan.name, plan.amount)}
                className={`mt-6 w-full py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                  plan.popular
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Payer via Mobile Money</span>
              </button>
            </div>
          ))}
        </div>

        {/* Trust Footer */}
        <div className="flex items-center justify-center gap-6 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Paiement 100% Sécurisé
          </span>
          <span className="flex items-center gap-1">
            <PhoneCall className="w-4 h-4 text-amber-400" />
            Support Wave & Orange Money
          </span>
        </div>
      </div>
    </div>
  );
};
