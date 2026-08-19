export const COUNTRIES = [
  'Afrique du Sud', 'Algérie', 'Allemagne', 'Angola', 'Belgique', 'Bénin', 'Botswana',
  'Burkina Faso', 'Burundi', 'Cameroun', 'Canada', 'Cap-Vert', 'Centrafrique', 'Comores',
  'Congo-Brazzaville', 'Congo-Kinshasa', 'Côte d’Ivoire', 'Djibouti', 'Égypte', 'Érythrée',
  'Espagne', 'Eswatini', 'États-Unis', 'Éthiopie', 'France', 'Gabon', 'Gambie', 'Ghana',
  'Guinée', 'Guinée-Bissau', 'Guinée équatoriale', 'Italie', 'Kenya', 'Lesotho', 'Liberia',
  'Libye', 'Madagascar', 'Malawi', 'Mali', 'Maroc', 'Maurice', 'Mauritanie', 'Mozambique',
  'Namibie', 'Niger', 'Nigeria', 'Ouganda', 'Pays-Bas', 'Royaume-Uni', 'Rwanda',
  'Sao Tomé-et-Principe', 'Sénégal', 'Seychelles', 'Sierra Leone', 'Somalie', 'Soudan',
  'Soudan du Sud', 'Suisse', 'Tanzanie', 'Tchad', 'Togo', 'Tunisie', 'Émirats arabes unis',
  'Zambie', 'Zimbabwe',
] as const;

export type Country = (typeof COUNTRIES)[number];

export function isSupportedCountry(value: unknown): value is Country {
  return typeof value === 'string' && (COUNTRIES as readonly string[]).includes(value);
}
