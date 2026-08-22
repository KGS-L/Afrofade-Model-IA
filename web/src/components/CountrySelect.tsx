'use client';

import React, { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { COUNTRY_DATA } from '@/lib/countries';
import { CountrySearchModal } from '@/components/CountrySearchModal';

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
};

export function CountrySelect({
  value,
  onChange,
  disabled = false,
  className = '',
  id,
  ariaLabel = 'Pays',
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const matched = COUNTRY_DATA.find((item) => item.country === value);

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setModalOpen(true)}
        aria-label={ariaLabel}
        className={`w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 text-left flex items-center justify-between text-sm text-ink focus:outline-none focus:border-terracotta ${className}`}
      >
        <span className="flex items-center gap-2 truncate">
          {matched ? (
            <>
              <span className="text-lg">{matched.flag}</span>
              <span className="font-bold">{matched.country}</span>
            </>
          ) : (
            <span className="text-ink-soft/60">Sélectionner un pays</span>
          )}
        </span>
        <div className="flex items-center gap-1 text-ink-soft shrink-0 ml-2">
          <Search className="w-3.5 h-3.5 opacity-60" />
          <ChevronDown className="w-4 h-4 opacity-60" />
        </div>
      </button>

      <CountrySearchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode="country"
        selectedValue={value}
        onSelect={(item) => onChange(item.country)}
      />
    </>
  );
}
