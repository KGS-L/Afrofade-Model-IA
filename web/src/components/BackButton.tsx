'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

type BackButtonProps = {
  label?: string;
  /** Destination quand il n'y a pas d'historique interne (nouvel onglet, lien externe). */
  fallbackHref?: string;
  className?: string;
};

/**
 * Bouton retour intelligent : revient à la page précédente de l'historique
 * quand la navigation vient du site (recherche, filtres et paramètres
 * conservés), sinon redirige vers fallbackHref au lieu de la landing.
 */
export default function BackButton({ label = 'Retour', fallbackHref = '/', className = '' }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (
      typeof window !== 'undefined' &&
      window.history.length > 1 &&
      document.referrer.startsWith(window.location.origin)
    ) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-ink-soft transition-colors hover:text-terracotta ${className}`}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
