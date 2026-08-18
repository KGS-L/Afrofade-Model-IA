'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { stylePlan, PLAN_BADGE_CLASS } from '@/lib/plans';

export interface HairstyleItem {
  id: string;
  category: 'fade' | 'locks' | 'tresses' | 'afro' | 'barbe';
  title: string;
  subtitle: string;
  thumbnail: string;
  color: string;
  isPremium: boolean;
}

export const HAIRSTYLES_DATA: HairstyleItem[] = [
  {
    id: 'fade_taper_low',
    category: 'fade',
    title: 'Low Taper Fade & Line-Up',
    subtitle: 'Dégradé bas progressif avec contours rectilignes nets',
    thumbnail: '/models/afro_taper_fade.png',
    color: '#1a110b',
    isPremium: false,
  },
  {
    id: 'locks_short_high_top',
    category: 'locks',
    title: 'Short Locks High Top',
    subtitle: 'Locks courtes sculptées avec dégradé à blanc sur les tempes',
    thumbnail: '/models/afro_dreadlocks.png',
    color: '#140c07',
    isPremium: true,
  },
  {
    id: 'tresses_cornrows_lines',
    category: 'tresses',
    title: 'Cornrows Géométriques',
    subtitle: 'Tresses plaquées motifs géométriques & ligne nette',
    thumbnail: '/models/afro_cornrows.png',
    color: '#1a100a',
    isPremium: true,
  },
  {
    id: 'barbe_sculpted_contour',
    category: 'barbe',
    title: 'Barbe Sculptée & Contours Rasoir',
    subtitle: 'Taille au millimètre, contours nets & soin huile',
    thumbnail: '/models/afro_beard_sculpted.png',
    color: '#110b07',
    isPremium: true,
  },
  {
    id: 'afro_sponge_twists',
    category: 'afro',
    title: 'Afro Sponge Twists & Taper',
    subtitle: 'Texture torsadée au sponge brush avec contours fins',
    thumbnail: '/models/afro_taper_fade.png',
    color: '#24150b',
    isPremium: false,
  },
  {
    id: 'fade_burst_mohawk',
    category: 'fade',
    title: 'Burst Fade Mohawk Afro',
    subtitle: 'Dégradé arrondi autour des oreilles & crête naturelle',
    thumbnail: '/models/afro_dreadlocks.png',
    color: '#1c120c',
    isPremium: false,
  },
];

interface HairstyleCatalogProps {
  selectedId: string | null;
  onSelect: (item: HairstyleItem) => void;
  /** Filtre plein texte sur le titre, insensible à la casse */
  query?: string;
}

export const HairstyleCatalog: React.FC<HairstyleCatalogProps> = ({
  selectedId,
  onSelect,
  query = '',
}) => {
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredItems = HAIRSTYLES_DATA.filter(
    (item) =>
      (activeTab === 'all' ? true : item.category === activeTab) &&
      item.title.toLowerCase().includes(query.trim().toLowerCase())
  );

  const tabs = [
    { id: 'all', label: 'Tous les 6 styles' },
    { id: 'fade', label: 'Fades & Dégradés' },
    { id: 'locks', label: 'Locks' },
    { id: 'tresses', label: 'Tresses' },
    { id: 'afro', label: 'Afro' },
    { id: 'barbe', label: 'Barbe & Contours' },
  ];

  const PANEL_ID = 'catalog-styles-panel';

  const onTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (idx + dir + tabs.length) % tabs.length;
    setActiveTab(tabs[next].id);
    document.getElementById(`catalog-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <div className="bg-card rounded-card p-6 space-y-6 shadow-soft">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/10 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-terracotta bg-terracotta-wash px-2.5 py-1 rounded-pill">
            Étape 2 sur 3
          </span>
          <h2 className="font-display text-xl mt-2">
            6 styles signés pour vos clients
          </h2>
          <p className="text-xs text-ink-soft mt-1">
            Touchez une coupe pour la projeter instantanément sur le modèle 3D
            du client.
          </p>
        </div>
      </div>

      {/* Filter Tabs — tablist ARIA, navigation flèches gauche/droite */}
      <div
        role="tablist"
        aria-label="Familles de coiffures"
        className="flex items-center gap-2 overflow-x-auto pb-1"
      >
        {tabs.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`catalog-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={PANEL_ID}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(e) => onTabKeyDown(e, idx)}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] px-4 rounded-pill text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-terracotta text-white shadow-soft'
                  : 'bg-cream text-ink-soft border border-ink/10 hover:text-ink hover:border-ink/25'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Grille de style_card — panneau piloté par les onglets */}
      <div
        role="tabpanel"
        id={PANEL_ID}
        aria-labelledby={`catalog-tab-${activeTab}`}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredItems.length === 0 && (
          <p className="text-sm text-ink-soft" role="status">
            Aucun style ne correspond à votre recherche.
          </p>
        )}
        {filteredItems.map((item) => {
          const isSelected = selectedId === item.id;
          const plan = stylePlan(item);
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className={`group relative rounded-card bg-card overflow-hidden cursor-pointer transition-all duration-300 border ${
                isSelected
                  ? 'border-terracotta shadow-soft ring-2 ring-terracotta/40'
                  : 'border-ink/10 hover:border-terracotta/50 shadow-soft'
              }`}
            >
              {/* Photo Portrait Container */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-terracotta-wash">
                <Image
                  src={item.thumbnail}
                  alt={`Rendu 3D — ${item.title}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />

                {/* Badge plan : PRO / VIP */}
                <span
                  className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full shadow-soft ${PLAN_BADGE_CLASS[plan]}`}
                >
                  {plan}
                </span>

                {/* Selected Checkmark */}
                {isSelected && (
                  <div className="absolute top-3 left-3 bg-terracotta text-white rounded-full p-1.5 shadow-soft">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Corps de la style_card */}
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="font-bold text-[15px] text-ink">
                    {item.title}
                  </h4>
                  <p className="text-xs text-ink-soft leading-relaxed mt-1 line-clamp-2">
                    {item.subtitle}
                  </p>
                </div>
                <span className="inline-flex min-h-[40px] items-center text-[13px] font-bold px-4 rounded-pill bg-terracotta text-white group-hover:bg-terracotta-dark transition-colors pointer-events-none select-none">
                  Personnaliser
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
