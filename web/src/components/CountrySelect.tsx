'use client';

import React from 'react';
import { COUNTRIES } from '@/lib/countries';

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
  required = false,
  disabled = false,
  className = '',
  id,
  name,
  ariaLabel = 'Pays',
}: Props) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 ${className}`}
    >
      <option value="">Sélectionner un pays</option>
      {COUNTRIES.map((country) => (
        <option key={country} value={country}>{country}</option>
      ))}
    </select>
  );
}
