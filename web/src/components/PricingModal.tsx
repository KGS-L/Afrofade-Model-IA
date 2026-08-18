'use client';

import React, { useEffect, useRef } from 'react';
import { X, Check, ShieldCheck, PhoneCall, Zap } from 'lucide-react';
import { PLANS } from '@/lib/plans';

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

  // onClose en ref : l'effet ne se réabonne pas à chaque rendu du parent
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Fermeture Échap · piège Tab · focus initial/restauré · verrou scroll body
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
      ).filter((el) => !el.hasAttribute('disabled'));

    // Focus initial sur la carte (après paint)
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

        {/* Header */}
        <div className="text-center space-y-2 max-w-lg mx-auto pt-2">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-terracotta bg-terracotta-wash border border-terracotta/20 px-3 py-1 rounded-pill">
            Abonnements salons &amp; barbershops
          </span>
          <h2 id="pricing-modal-title" className="font-display text-2xl sm:text-3xl">
            Choisissez la formule adaptée à votre salon
          </h2>
          <p className="text-xs text-ink-soft">
            Paiement sécurisé par Mobile Money (Wave, Orange Money, MTN, Moov)
            &amp; carte bancaire.
          </p>
        </div>

        {/* Plans Grid — source unique src/lib/plans.ts */}
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

                {/* Features list */}
                <ul className="space-y-2 text-xs">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-ink-soft">
                      <Check className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mobile Money Subscribe CTA */}
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

        {/* Trust Footer */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-ink-soft pt-2 border-t border-ink/10">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-terracotta" />
            Paiement 100 % sécurisé
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
