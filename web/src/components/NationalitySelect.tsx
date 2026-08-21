'use client';

import React from 'react';
import { NATIONALITIES } from '@/lib/countries';

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

export function NationalitySelect({
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  id,
  name,
  ariaLabel = 'Nationalité',
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
      className={`min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 text-sm focus:outline-none focus:border-terracotta text-ink ${className}`}
    >
      <option value="">Sélectionner une nationalité</option>
      {NATIONALITIES.map((nationality) => (
        <option key={nationality} value={nationality}>{nationality}</option>
      ))}
    </select>
  );
}
