'use client';

import React from 'react';
import { COUNTRY_DATA } from '@/lib/countries';

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
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Sélecteur d'indicatif pays */}
      <select
        value={dialCode}
        onChange={(e) => onDialCodeChange(e.target.value)}
        disabled={disabled}
        aria-label="Indicatif pays"
        className="min-h-[48px] rounded-input border border-ink/15 bg-cream px-3 text-xs font-bold text-ink shrink-0 focus:outline-none focus:border-terracotta"
      >
        {COUNTRY_DATA.map((item) => (
          <option key={`${item.country}-${item.dialCode}`} value={item.dialCode}>
            {item.flag} {item.dialCode} ({item.country})
          </option>
        ))}
      </select>

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
  );
}
