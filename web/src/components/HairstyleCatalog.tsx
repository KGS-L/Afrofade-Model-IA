'use client';

import React, { useState } from 'react';
import { Sparkles, Check, Crown } from 'lucide-react';

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
    title: 'Taper Fade Low',
    subtitle: 'Dégradé bas avec contours nets & line-up',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    color: '#1a110b',
    isPremium: false,
  },
  {
    id: 'locks_short_high_top',
    category: 'locks',
    title: 'Short Locks High Top',
    subtitle: 'Locks courtes avec dégradé à blanc',
    thumbnail: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    color: '#140c07',
    isPremium: true,
    priceTag: '+2 000 FCFA',
  },
  {
    id: 'tresses_cornrows_lines',
    category: 'tresses',
    title: 'Cornrows Geometric',
    subtitle: 'Tresses plaquées géométriques',
    thumbnail: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    color: '#1a100a',
    isPremium: true,
    priceTag: '+3 000 FCFA',
  },
  {
    id: 'afro_sponge_twists',
    category: 'afro',
    title: 'Afro Sponge Twists',
    subtitle: 'Afro structuré au sponge brush',
    thumbnail: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80',
    color: '#24150b',
    isPremium: false,
  },
  {
    id: 'barbe_sculpted_contour',
    category: 'barbe',
    title: 'Barbe Sculptée Premium',
    subtitle: 'Taille précise, contours au rasoir & huile',
    thumbnail: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300&auto=format&fit=crop&q=80',
    color: '#110b07',
    isPremium: true,
    priceTag: '+2 000 FCFA (Upsell)',
  },
  {
    id: 'fade_burst_mohawk',
    category: 'fade',
    title: 'Burst Fade Mohawk',
    subtitle: 'Dégradé arrondi autour des oreilles',
    thumbnail: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
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
    { id: 'all', label: 'Tous les styles' },
    { id: 'fade', label: 'Fades & Dégradés' },
    { id: 'locks', label: 'Locks' },
    { id: 'tresses', label: 'Tresses' },
    { id: 'afro', label: 'Afro Volumineux' },
    { id: 'barbe', label: 'Barbes & Soins' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            2. Catalogue des Coiffures Afro 3D
          </h2>
          <p className="text-xs text-slate-400">
            Cliquez sur un style pour l'appliquer instantanément sur le modèle 3D du client.
          </p>
        </div>
        <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-1 rounded-md border border-amber-500/20">
          Étape 2 sur 3
        </span>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of Styles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
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
              className={`group relative rounded-2xl border bg-slate-950 overflow-hidden cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/30 scale-[1.02]'
                  : 'border-slate-800 hover:border-slate-700 hover:scale-[1.01]'
              }`}
            >
              {/* Thumbnail Image */}
              <div className="relative h-28 w-full overflow-hidden bg-slate-900">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
                
                {/* Premium / Upsell Tag */}
                {item.isPremium && (
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                    <Crown className="w-3 h-3 fill-slate-950" />
                    <span>{item.priceTag || 'PREMIUM'}</span>
                  </div>
                )}

                {/* Selected Checkmark */}
                {isSelected && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 rounded-full p-1 shadow-md">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="p-3 space-y-1">
                <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  {item.title}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-1">
                  {item.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
