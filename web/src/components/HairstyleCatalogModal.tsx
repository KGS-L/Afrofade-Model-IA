'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Search, Sparkles, ArrowRight, Check } from 'lucide-react';
import { HAIRSTYLES_DATA, HairstyleItem } from './HairstyleCatalog';
import { stylePlan, PLAN_BADGE_CLASS } from '@/lib/plans';

interface HairstyleCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HairstyleCatalogModal: React.FC<HairstyleCatalogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fermeture à la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Verrouillage du scroll quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredItems = HAIRSTYLES_DATA.filter((item) => {
    const matchesTab = activeTab === 'all' ? true : item.category === activeTab;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesTab && matchesSearch;
  });

  const categories = [
    { id: 'all', label: `Tous les styles (${HAIRSTYLES_DATA.length})` },
    { id: 'fade', label: 'Fades & Dégradés' },
    { id: 'locks', label: 'Locks' },
    { id: 'tresses', label: 'Tresses & Cornrows' },
    { id: 'afro', label: 'Afro & Twists' },
    { id: 'barbe', label: 'Barbe & Contours' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-ink/75 backdrop-blur-md animate-fade-in">
      {/* Backdrop click */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-cream rounded-card shadow-soft border border-ink/10 flex flex-col overflow-hidden z-10 animate-scale-up">
        {/* Header Modal */}
        <div className="p-6 md:p-8 bg-card border-b border-ink/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-terracotta bg-terracotta-wash px-3 py-1 rounded-pill">
              <Sparkles className="w-3.5 h-3.5" />
              Catalogue Officiel Afrofade Studio
            </div>
            <h2 className="font-display text-2xl md:text-3xl mt-2 text-ink">
              Tous nos modèles de coiffures Afro
            </h2>
            <p className="text-xs md:text-sm text-ink-soft mt-1">
              Explorez la collection complète et testez chaque coupe sur le modèle 3D de votre client.
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Fermer le catalogue"
            className="self-end md:self-auto w-10 h-10 rounded-pill bg-cream hover:bg-terracotta-wash text-ink hover:text-terracotta border border-ink/10 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre de Recherche + Onglets */}
        <div className="p-6 bg-card border-b border-ink/10 space-y-4">
          {/* Champ de recherche */}
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une coiffure (ex: Taper fade, Cornrows, Locks, Barbe...)"
              className="w-full pl-11 pr-10 py-3 rounded-pill bg-cream text-ink text-sm border border-ink/10 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20 transition-all placeholder:text-ink-soft/70"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Onglets de Catégories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`min-h-[40px] px-4 rounded-pill text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-terracotta text-white shadow-soft'
                      : 'bg-cream text-ink-soft border border-ink/10 hover:text-ink hover:border-ink/25'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grille du Catalogue (Scrollable) */}
        <div className="p-6 md:p-8 overflow-y-auto max-h-[60vh] space-y-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-base font-bold text-ink">Aucun style trouvé</p>
              <p className="text-xs text-ink-soft">
                Essayez d'autres mots-clés ou sélectionnez une autre catégorie.
              </p>
              <button
                onClick={() => {
                  setActiveTab('all');
                  setSearchQuery('');
                }}
                className="text-xs font-bold text-terracotta underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const plan = stylePlan(item);
                return (
                  <div
                    key={item.id}
                    className="group rounded-card bg-card overflow-hidden border border-ink/10 hover:border-terracotta/50 shadow-soft hover:shadow-soft-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Visual 3D Container */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-terracotta-wash">
                      <Image
                        src={`/models/hairstyles/${item.id}/model-1-face.png`}
                        alt={`Aperçu 3D — ${item.title}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Badge Plan */}
                      <span
                        className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full shadow-soft ${PLAN_BADGE_CLASS[plan]}`}
                      >
                        {plan}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
                      <div>
                        <h4 className="font-bold text-base text-ink group-hover:text-terracotta transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-ink-soft leading-relaxed mt-1">
                          {item.subtitle}
                        </p>
                      </div>

                      <Link
                        href={`/rituel?style=${item.id}`}
                        onClick={onClose}
                        className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 text-xs font-bold rounded-pill text-white bg-terracotta hover:bg-terracotta-dark transition-colors shadow-soft"
                      >
                        Tester dans le Rituel
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-4 md:p-6 bg-card border-t border-ink/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-soft">
          <span>{filteredItems.length} coiffure(s) affichée(s) sur {HAIRSTYLES_DATA.length} modèles disponibles</span>
          <button
            onClick={onClose}
            className="font-bold text-ink hover:text-terracotta transition-colors"
          >
            Fermer le catalogue
          </button>
        </div>
      </div>
    </div>
  );
};
