'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check } from 'lucide-react';
import { COUNTRY_DATA } from '@/lib/countries';

export type CountryItem = (typeof COUNTRY_DATA)[number];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: CountryItem) => void;
  mode: 'country' | 'nationality' | 'dialCode';
  selectedValue?: string;
  title?: string;
};

export function CountrySearchModal({
  isOpen,
  onClose,
  onSelect,
  mode,
  selectedValue,
  title,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setQuery('');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_DATA;
    return COUNTRY_DATA.filter(
      (item) =>
        item.country.toLowerCase().includes(q) ||
        item.nationality.toLowerCase().includes(q) ||
        item.dialCode.toLowerCase().includes(q)
    );
  }, [query]);

  if (!isOpen || !mounted) return null;

  const defaultTitle =
    mode === 'country'
      ? 'Sélectionner votre pays'
      : mode === 'nationality'
      ? 'Sélectionner votre nationalité'
      : 'Sélectionner l’indicatif pays';

  const modalTitle = title || defaultTitle;

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Arrière-plan sombre avec flou de recul */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Carte Modal Personnalisée */}
      <div
        className="relative z-[10000] w-full max-w-md bg-[#FAF6F1] rounded-card shadow-2xl border border-ink/10 flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: '#FAF6F1' }}
      >
        {/* Entête du Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-ink/10 bg-cream">
          <h2 className="font-display text-lg text-ink">{modalTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-pill border border-ink/15 bg-card flex items-center justify-center text-ink hover:bg-ink/5"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-ink" />
          </button>
        </div>

        {/* Champ de Recherche Intelligente */}
        <div className="p-4 border-b border-ink/10 bg-cream/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-ink-soft" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un pays, nationalité ou indicatif (+226...)"
              className="w-full min-h-[44px] rounded-input border border-ink/15 bg-card pl-10 pr-9 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-terracotta"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-3 text-ink-soft hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Liste Filtrée Scrollable */}
        <div className="overflow-y-auto p-2 divide-y divide-ink/5 max-h-[50vh]">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              let displayLabel = '';
              let secondaryLabel = '';

              if (mode === 'country') {
                displayLabel = item.country;
                secondaryLabel = `${item.nationality} · ${item.dialCode}`;
              } else if (mode === 'nationality') {
                displayLabel = item.nationality;
                secondaryLabel = item.country;
              } else {
                displayLabel = `${item.dialCode} (${item.country})`;
                secondaryLabel = item.nationality;
              }

              const isSelected =
                selectedValue &&
                (selectedValue === item.country ||
                  selectedValue === item.nationality ||
                  selectedValue === item.dialCode);

              return (
                <button
                  type="button"
                  key={`${item.country}-${item.dialCode}-${mode}`}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`w-full min-h-[52px] flex items-center justify-between px-4 py-2.5 rounded-input transition-colors text-left ${
                    isSelected
                      ? 'bg-terracotta-wash text-terracotta-dark font-bold'
                      : 'hover:bg-terracotta-wash/40 text-ink'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{item.flag}</span>
                    <div className="truncate">
                      <p className="text-sm font-bold truncate">{displayLabel}</p>
                      <p className="text-xs text-ink-soft truncate">{secondaryLabel}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-terracotta shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center text-ink-soft">
              <p className="text-sm">Aucun pays trouvé pour « {query} »</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
