'use client';

import React, { useState } from 'react';
import { Crown, Check } from 'lucide-react';

export interface HairstyleItem {
  id: string;
  category: 'fade' | 'locks' | 'tresses' | 'afro' | 'barbe';
  title: string;
  subtitle: string;
  thumbnail: string;
  color: string;
  isPremium: boolean;
  priceTag?: string;
}

const HAIRSTYLES_DATA: HairstyleItem[] = [
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
    priceTag: '+2 000 FCFA',
  },
  {
    id: 'tresses_cornrows_lines',
    category: 'tresses',
    title: 'Cornrows Géométriques',
    subtitle: 'Tresses plaquées motifs géométriques & ligne nette',
    thumbnail: '/models/afro_cornrows.png',
    color: '#1a100a',
    isPremium: true,
    priceTag: '+3 000 FCFA',
  },
  {
    id: 'barbe_sculpted_contour',
    category: 'barbe',
    title: 'Barbe Sculptée & Contours Razoir',
    subtitle: 'Taille au millimètre, contours nets & soin huile',
    thumbnail: '/models/afro_beard_sculpted.png',
    color: '#110b07',
    isPremium: true,
    priceTag: '+2 000 FCFA (Upsell)',
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

/** Badge plan affiché sur chaque style_card (PRO / VIP / PREMIUM or) */
const PLAN_BY_ID: { [id: string]: 'PRO' | 'VIP' } = {
  fade_taper_low: 'PRO',
  afro_sponge_twists: 'PRO',
  fade_burst_mohawk: 'VIP',
};

const planBadgeClass = (item: HairstyleItem) =>
  item.isPremium
    ? 'bg-premium text-white'
    : PLAN_BY_ID[item.id] === 'VIP'
      ? 'bg-terracotta-dark text-white'
      : 'bg-ink-soft text-white';

interface HairstyleCatalogProps {
  selectedId: string | null;
  onSelect: (item: HairstyleItem) => void;
  onTriggerUpsell: (item: HairstyleItem) => void;
}

export const HairstyleCatalog: React.FC<HairstyleCatalogProps> = ({
  selectedId,
  onSelect,
  onTriggerUpsell,
}) => {
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredItems = HAIRSTYLES_DATA.filter((item) =>
    activeTab === 'all' ? true : item.category === activeTab
  );

  const tabs = [
    { id: 'all', label: 'Tous les 6 styles' },
    { id: 'fade', label: 'Fades & Dégradés' },
    { id: 'locks', label: 'Locks' },
    { id: 'tresses', label: 'Tresses' },
    { id: 'afro', label: 'Afro' },
    { id: 'barbe', label: 'Barbe & Contours' },
  ];

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

      {/* Filter Tabs */}
      <div
        role="tablist"
        aria-label="Familles de coiffures"
        className="flex items-center gap-2 overflow-x-auto pb-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[44px] px-4 rounded-pill text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-terracotta text-white shadow-soft'
                : 'bg-cream text-ink-soft border border-ink/10 hover:text-ink hover:border-ink/25'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grille de style_card — cartes blanches, badge plan, CTA Personnaliser */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => {
                onSelect(item);
                if (item.isPremium) {
                  onTriggerUpsell(item);
                }
              }}
              className={`group relative rounded-card bg-card overflow-hidden cursor-pointer transition-all duration-300 border ${
                isSelected
                  ? 'border-terracotta shadow-soft ring-2 ring-terracotta/40'
                  : 'border-ink/10 hover:border-terracotta/50 shadow-soft'
              }`}
            >
              {/* Photo Portrait Container */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-terracotta-wash">
                <img
                  src={item.thumbnail}
                  alt={`Rendu 3D — ${item.title}`}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />

                {/* Badge plan : PRO / VIP / PREMIUM (or) */}
                <span
                  className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-soft ${planBadgeClass(item)}`}
                >
                  {item.isPremium && <Crown className="w-3 h-3" />}
                  <span>
                    {item.isPremium
                      ? `Premium · ${item.priceTag || '+2 000 FCFA'}`
                      : PLAN_BY_ID[item.id]}
                  </span>
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
