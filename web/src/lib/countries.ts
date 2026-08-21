export const COUNTRY_DATA = [
  { country: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫', nationality: 'Burkinabè' },
  { country: 'Côte d’Ivoire', dialCode: '+225', flag: '🇨🇮', nationality: 'Ivoirienne' },
  { country: 'Sénégal', dialCode: '+221', flag: '🇸🇳', nationality: 'Sénégalaise' },
  { country: 'Cameroun', dialCode: '+237', flag: '🇨🇲', nationality: 'Camerounaise' },
  { country: 'Mali', dialCode: '+223', flag: '🇲🇱', nationality: 'Malienne' },
  { country: 'Bénin', dialCode: '+229', flag: '🇧🇯', nationality: 'Béninoise' },
  { country: 'Togo', dialCode: '+228', flag: '🇹🇬', nationality: 'Togolaise' },
  { country: 'Niger', dialCode: '+227', flag: '🇳🇪', nationality: 'Nigérienne' },
  { country: 'Guinée', dialCode: '+224', flag: '🇬🇳', nationality: 'Guinéenne' },
  { country: 'Congo-Kinshasa', dialCode: '+243', flag: '🇨🇩', nationality: 'Congolaise (RDC)' },
  { country: 'Congo-Brazzaville', dialCode: '+242', flag: '🇨🇬', nationality: 'Congolaise' },
  { country: 'Gabon', dialCode: '+241', flag: '🇬🇦', nationality: 'Gabonaise' },
  { country: 'Tchad', dialCode: '+235', flag: '🇹🇩', nationality: 'Tchadienne' },
  { country: 'Centrafrique', dialCode: '+236', flag: '🇨🇫', nationality: 'Centrafricaine' },
  { country: 'France', dialCode: '+33', flag: '🇫🇷', nationality: 'Française' },
  { country: 'Belgique', dialCode: '+32', flag: '🇧🇪', nationality: 'Belge' },
  { country: 'Suisse', dialCode: '+41', flag: '🇨🇭', nationality: 'Suisse' },
  { country: 'Canada', dialCode: '+1', flag: '🇨🇦', nationality: 'Canadienne' },
  { country: 'États-Unis', dialCode: '+1', flag: '🇺🇸', nationality: 'Américaine' },
  { country: 'Nigeria', dialCode: '+234', flag: '🇳🇬', nationality: 'Nigériane' },
  { country: 'Ghana', dialCode: '+233', flag: '🇬🇭', nationality: 'Ghanéenne' },
  { country: 'Maroc', dialCode: '+212', flag: '🇲🇦', nationality: 'Marocaine' },
  { country: 'Algérie', dialCode: '+213', flag: '🇩🇿', nationality: 'Algérienne' },
  { country: 'Tunisie', dialCode: '+216', flag: '🇹🇳', nationality: 'Tunisienne' },
  { country: 'Égypte', dialCode: '+20', flag: '🇪🇬', nationality: 'Égyptienne' },
  { country: 'Émirats arabes unis', dialCode: '+971', flag: '🇦🇪', nationality: 'Émiratie' },
] as const;

export const COUNTRIES = COUNTRY_DATA.map((item) => item.country);
export type Country = (typeof COUNTRIES)[number];

export const NATIONALITIES = COUNTRY_DATA.map((item) => item.nationality).sort();

export function isSupportedCountry(value: unknown): value is Country {
  return typeof value === 'string' && (COUNTRIES as readonly string[]).includes(value);
}

export function getDialCodeForCountry(countryName: string): string {
  const match = COUNTRY_DATA.find((item) => item.country === countryName);
  return match ? match.dialCode : '+226';
}

export function getNationalityForCountry(countryName: string): string {
  const match = COUNTRY_DATA.find((item) => item.country === countryName);
  return match ? match.nationality : 'Burkinabè';
}

export function parsePhone(phoneWithDial: string): { dialCode: string; numberOnly: string } {
  if (!phoneWithDial) return { dialCode: '+226', numberOnly: '' };
  const cleaned = phoneWithDial.trim();
  const sortedCodes = [...COUNTRY_DATA].map(c => c.dialCode).sort((a, b) => b.length - a.length);
  for (const code of sortedCodes) {
    if (cleaned.startsWith(code)) {
      return {
        dialCode: code,
        numberOnly: cleaned.slice(code.length).replace(/[\s()-]/g, ''),
      };
    }
  }
  if (cleaned.startsWith('+')) {
    const spaceIdx = cleaned.indexOf(' ');
    if (spaceIdx > 0) {
      return {
        dialCode: cleaned.slice(0, spaceIdx),
        numberOnly: cleaned.slice(spaceIdx + 1).replace(/[\s()-]/g, ''),
      };
    }
  }
  return { dialCode: '+226', numberOnly: cleaned.replace(/[\s()-]/g, '') };
}
