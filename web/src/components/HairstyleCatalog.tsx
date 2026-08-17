'use client';

import React, { useState } from 'react';
import { Sparkles, Check, Crown, ArrowUpRight } from 'lucide-react';

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
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            Étape 2 sur 3
          </span>
          <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2">
            6 Styles Signés pour Vos Clients
          </h2>
          <p className="text-xs text-slate-400">
            Sélectionnez une coupe pour la projeter instantanément sur le modèle 3D du client.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of Signed Afro Styles (Inspired by Thelma.pet Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
              className={`group relative rounded-3xl border bg-slate-950 overflow-hidden cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'border-amber-400 shadow-xl shadow-amber-500/20 ring-2 ring-amber-500/40 scale-[1.02]'
                  : 'border-slate-800/80 hover:border-slate-700 hover:scale-[1.01]'
              }`}
            >
              {/* Photo Portrait Container */}
              <div className="relative h-64 w-full overflow-hidden bg-slate-900">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                {/* Badge Premium / Upsell */}
                {item.isPremium ? (
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                    <Crown className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{item.priceTag || 'PREMIUM'}</span>
                  </div>
                ) : (
                  <div className="absolute top-3 right-3 bg-slate-900/90 text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-800 backdrop-blur-md">
                    Inclus
                  </div>
                )}

                {/* Selected Checkmark */}
                {isSelected && (
                  <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 rounded-full p-1.5 shadow-xl">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}

                {/* Bottom Overlay Info inside portrait */}
                <div className="absolute bottom-3 left-3 right-3 space-y-1">
                  <h4 className="text-base font-extrabold text-white group-hover:text-amber-400 transition-colors flex items-center justify-between">
                    <span>{item.title}</span>
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
                  </h4>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
