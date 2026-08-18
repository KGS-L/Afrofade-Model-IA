import type { Config } from 'tailwindcss';

/**
 * Afrofade — tokens DESIGN.md (ux-Afrofade-2026-08-17)
 * Palette crème/terracotta, migration complète depuis dark slate.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terracotta: {
          DEFAULT: '#C7816F', // CTA, liens actifs, badges d'étape, accents
          dark: '#A9662F', // hover/pressed des CTA terracotta
          pale: '#E5C3B5', // numéros d'étape géants
          wash: '#F6E7DF', // pastilles d'icône, fonds d'accent doux
        },
        cream: '#FAF6F1', // fond de page principal
        ink: {
          DEFAULT: '#1F1B17', // titres et texte principal
          soft: '#6B6259', // texte secondaire, descriptions, labels
        },
        card: '#FFFFFF', // cartes, panneaux, drawer, FAQ
        night: '#1F1B17', // footer sombre
        // DESIGN.md › scan_success : vert fonctionnel réservé au scanner guidé
        'scan-success': {
          DEFAULT: '#2E7D46',
          soft: '#3FA35F',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Arial Black', 'sans-serif'],
        body: [
          'var(--font-body)',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        hand: ['var(--font-hand)', 'Segoe Script', 'cursive'],
      },
      borderRadius: {
        card: '16px',
        pill: '999px',
        input: '12px',
        frame: '12px',
      },
      boxShadow: {
        soft: '0 4px 24px rgba(31, 27, 23, 0.08)',
      },
      // RituelDemoVideo : barre de progression du scan, flash de capture
      // et léger travelling sur les visuels (effet flux caméra)
      keyframes: {
        'demo-progress': {
          from: { width: '0%' },
          to: { width: '100%' },
        },
        'demo-flash': {
          '0%': { opacity: '0.85' },
          '100%': { opacity: '0' },
        },
        'demo-kenburns': {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(1.07)' },
        },
      },
      animation: {
        'demo-progress': 'demo-progress 2600ms linear forwards',
        'demo-flash': 'demo-flash 380ms ease-out forwards',
        'demo-kenburns': 'demo-kenburns 2600ms ease-out forwards',
      },
      maxWidth: {
        container: '1200px',
      },
    },
  },
  plugins: [],
};

export default config;
