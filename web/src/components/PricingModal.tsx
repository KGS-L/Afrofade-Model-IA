'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Check, ShieldCheck, PhoneCall, Zap, Sparkles, Building2, User } from 'lucide-react';
import { PLANS } from '@/lib/plans';
import { B2C_CREDIT_PACKS, CREDIT_COST_RULES } from '@/lib/credits';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planName: string, priceFcfa: number) => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'b2b' | 'b2c'>('b2b');

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
      ).filter((el) => !el.hasAttribute('disabled'));

    const raf = requestAnimationFrame(() => {
      (
        panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel
      )?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        data-autofocus
        tabIndex={-1}
        className="relative w-full max-w-4xl bg-cream border border-ink/10 rounded-card p-6 sm:p-8 shadow-soft space-y-6 max-h-[90vh] overflow-y-auto focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Fermer les tarifs"
          className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center text-ink-soft hover:text-ink rounded-pill bg-cream hover:bg-terracotta-wash transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with B2B / B2C Toggle */}
        <div className="text-center space-y-4 max-w-lg mx-auto pt-2">
          {/* Tabs Toggle */}
          <div className="inline-flex p-1 bg-ink/5 border border-ink/10 rounded-pill">
            <button
              onClick={() => setActiveTab('b2b')}
              className={`flex items-center gap-2 px-5 py-2 rounded-pill font-bold text-xs transition-all ${
                activeTab === 'b2b'
                  ? 'bg-terracotta text-white shadow-soft'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Pour les Salons</span>
            </button>
            <button
              onClick={() => setActiveTab('b2c')}
              className={`flex items-center gap-2 px-5 py-2 rounded-pill font-bold text-xs transition-all ${
                activeTab === 'b2c'
                  ? 'bg-terracotta text-white shadow-soft'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Pour Moi (Particuliers)</span>
            </button>
          </div>

          <div>
            <h2 id="pricing-modal-title" className="font-display text-2xl sm:text-3xl">
              {activeTab === 'b2b'
                ? 'Des abonnements pensés pour votre salon'
                : 'Pas d’abonnement. Achetez uniquement les crédits dont vous avez besoin.'}
            </h2>
            <p className="text-xs text-ink-soft mt-1">
              {activeTab === 'b2b'
                ? 'Reconstruisez la tête 3D de vos clients et essayez des coiffures en illimité.'
                : 'Visualisez votre prochaine coiffure 3D avant de passer chez le coiffeur.'}
            </p>
          </div>
        </div>

        {/* TAB B2B : SALONS DE COIFFURE */}
        {activeTab === 'b2b' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-card p-6 flex flex-col justify-between transition-all ${
                  plan.popular
                    ? 'bg-card border-2 border-terracotta shadow-soft md:scale-[1.02]'
                    : 'bg-card border-[1.5px] border-ink/10 hover:border-ink/25'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 [transform:translateX(-50%)] bg-terracotta text-white text-[10px] font-bold uppercase tracking-[0.12em] px-3 py-1 rounded-pill whitespace-nowrap shadow-soft">
                    Recommandé salon
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3
                      className={`text-lg font-extrabold ${
                        plan.popular ? 'text-terracotta-dark' : 'text-ink-soft'
                      }`}
                    >
                      {plan.name}
                    </h3>
                    <p className="text-[11px] text-ink-soft mt-1 min-h-[32px]">
                      {plan.desc}
                    </p>
                  </div>

                  <div className="border-t border-b border-ink/10 py-3">
                    <span className="font-display text-3xl text-ink">
                      {plan.price}
                    </span>
                    <span className="text-xs text-ink-soft ml-1">/mois</span>
                  </div>

                  <ul className="space-y-2 text-xs">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-ink-soft">
                        <Check className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onSelectPlan(plan.name, plan.amount)}
                  className={`mt-6 min-h-[44px] w-full rounded-pill font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                    plan.popular
                      ? 'bg-terracotta hover:bg-terracotta-dark text-white'
                      : 'bg-cream hover:bg-terracotta-wash text-ink border-[1.5px] border-ink/20'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Payer via Mobile Money</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB B2C : PARTICULIERS (PACKS DE CRÉDITS) */}
        {activeTab === 'b2c' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
              {B2C_CREDIT_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className={`relative rounded-card p-6 flex flex-col justify-between transition-all ${
                    pack.popular
                      ? 'bg-card border-2 border-terracotta shadow-soft md:scale-[1.02]'
                      : 'bg-card border-[1.5px] border-ink/10 hover:border-ink/25'
                  }`}
                >
                  {pack.badge && (
                    <span className="absolute -top-3 left-1/2 [transform:translateX(-50%)] bg-terracotta text-white text-[10px] font-bold uppercase tracking-[0.12em] px-3 py-1 rounded-pill whitespace-nowrap shadow-soft">
                      {pack.badge}
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3
                        className={`text-lg font-extrabold ${
                          pack.popular ? 'text-terracotta-dark' : 'text-ink-soft'
                        }`}
                      >
                        {pack.name}
                      </h3>
                      <p className="text-[11px] text-ink-soft mt-1 min-h-[32px]">
                        {pack.description}
                      </p>
                    </div>

                    <div className="border-t border-b border-ink/10 py-3 flex items-baseline justify-between">
                      <span className="font-display text-3xl text-ink">
                        {pack.price}
                      </span>
                      <span className="text-xs font-bold text-terracotta bg-terracotta-wash px-2.5 py-1 rounded-pill">
                        {pack.credits} crédits
                      </span>
                    </div>

                    <div className="bg-cream/60 border border-ink/5 rounded-card p-3 text-[11px] text-ink-soft space-y-1">
                      <div className="font-bold text-ink text-[10px] uppercase tracking-wider">Exemple d'utilisation :</div>
                      <div>{pack.example}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectPlan(pack.name, pack.amountFcfa)}
                    className={`mt-6 min-h-[44px] w-full rounded-pill font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                      pack.popular
                        ? 'bg-terracotta hover:bg-terracotta-dark text-white'
                        : 'bg-cream hover:bg-terracotta-wash text-ink border-[1.5px] border-ink/20'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Acheter {pack.credits} crédits</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Guide des dépenses de crédits B2C */}
            <div className="bg-cream border border-ink/10 rounded-card p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink text-center">
                Comment fonctionnent les crédits ?
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {CREDIT_COST_RULES.map((rule, idx) => (
                  <div key={idx} className="bg-card border border-ink/5 rounded-card p-2.5 flex flex-col justify-between">
                    <span className="font-semibold text-ink-soft">{rule.label}</span>
                    <span className={`text-[11px] font-bold mt-1 ${rule.costInCredits === 0 ? 'text-green-600' : 'text-terracotta'}`}>
                      {rule.costInCredits === 0 ? 'GRATUIT' : `${rule.costInCredits} crédit(s)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trust Footer */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-ink-soft pt-2 border-t border-ink/10">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-terracotta" />
            Paiement 100 % sécurisé Mobile Money
          </span>
          <span className="flex items-center gap-1.5">
            <PhoneCall className="w-4 h-4 text-terracotta" />
            Support Wave &amp; Orange Money
          </span>
        </div>
      </div>
    </div>
  );
};
