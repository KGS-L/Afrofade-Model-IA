'use client';

import React, { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { COUNTRY_DATA } from '@/lib/countries';
import { CountrySearchModal } from '@/components/CountrySearchModal';

type Props = {
  dialCode: string;
  onDialCodeChange: (code: string) => void;
  phoneNumber: string;
  onPhoneNumberChange: (number: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export function PhoneInput({
  dialCode,
  onDialCodeChange,
  phoneNumber,
  onPhoneNumberChange,
  required = false,
  disabled = false,
  className = '',
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const matched = COUNTRY_DATA.find((item) => item.dialCode === dialCode) || COUNTRY_DATA[0];

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Sélecteur d'indicatif pays personnalisable avec modal de recherche */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setModalOpen(true)}
          aria-label="Sélectionner l'indicatif pays"
          className="min-h-[48px] rounded-input border border-ink/15 bg-cream px-3 text-xs font-bold text-ink shrink-0 flex items-center gap-1.5 focus:outline-none focus:border-terracotta hover:bg-terracotta-wash/30 transition-colors"
        >
          <span className="text-base">{matched.flag}</span>
          <span>{dialCode}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
        </button>

        {/* Saisie du numéro (sans indicatif) */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange(e.target.value.replace(/[^0-9\s]/g, ''))}
          required={required}
          disabled={disabled}
          placeholder="70 12 34 56"
          aria-label="Numéro de téléphone sans indicatif"
          className="w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 text-sm focus:outline-none focus:border-terracotta text-ink placeholder:text-ink-soft/40"
        />
      </div>

      <CountrySearchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode="dialCode"
        selectedValue={dialCode}
        onSelect={(item) => onDialCodeChange(item.dialCode)}
      />
    </>
  );
}
