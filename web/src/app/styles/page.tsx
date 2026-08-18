'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft, Sparkles, SlidersHorizontal, Scissors } from 'lucide-react';
import { HairstyleCatalog, HairstyleItem } from '@/components/HairstyleCatalog';

export default function HairstyleCatalogPage() {
  const router = RouterHook();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<HairstyleItem | null>(null);

  function RouterHook() {
    return useRouter();
  }

  const handleSelectStyle = (item: HairstyleItem) => {
    setSelectedStyle(item);
    router.push(`/rituel?style=${item.id}`);
  };

  return (
    <main className="min-h-screen bg-cream text-ink flex flex-col font-sans selection:bg-terracotta selection:text-white">
      {/* Header Navigation */}
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-ink/10 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-ink hover:text-terracotta transition-colors text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-terracotta text-white flex items-center justify-center font-display text-sm font-bold">
              A
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              Afrofade Studio
            </span>
          </div>

          <Link
            href="/rituel"
            className="hidden sm:inline-flex min-h-[40px] items-center px-4 rounded-pill bg-terracotta text-white text-xs font-bold hover:bg-terracotta-dark transition-colors shadow-soft"
          >
            Commencer le Rituel
          </Link>
        </div>
      </header>

      {/* Hero Section Catalogue */}
      <section className="relative py-12 px-6 bg-card border-b border-ink/10">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-terracotta-wash text-terracotta text-xs font-bold tracking-wider uppercase">
            <Scissors className="w-3.5 h-3.5" />
            Catalogue Officiel Afrofade
          </span>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink">
            Explorez Tous Nos Styles de Coiffures Afro
          </h1>

          <p className="text-sm md:text-base text-ink-soft max-w-2xl mx-auto">
            Découvrez nos modèles emblématiques (Fades, Locks, Cornrows, Twists, Barbes & Contours). Inspectez chaque coupe en 3D 360° et appliquez-la directement sur la morphologie de votre client.
          </p>

          {/* Barre de Recherche Globale */}
          <div className="pt-4 max-w-xl mx-auto relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-ink-soft pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par style (ex: Taper fade, Fulani braids, Locks, Barbe...)"
                className="w-full pl-12 pr-4 py-3.5 bg-cream border border-ink/15 rounded-pill text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 shadow-soft transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Catalogue interactif */}
      <section className="max-w-7xl mx-auto px-6 py-12 w-full flex-grow">
        <HairstyleCatalog
          selectedId={selectedStyle?.id || null}
          onSelect={handleSelectStyle}
          query={searchQuery}
        />
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-ink/10 py-8 px-6 text-center text-xs text-ink-soft">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Afrofade Studio 3D — Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-ink transition-colors">Accueil</Link>
            <Link href="/rituel" className="hover:text-ink transition-colors">Rituel 3D</Link>
            <Link href="/connexion" className="hover:text-ink transition-colors">Espace Coiffeur</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
