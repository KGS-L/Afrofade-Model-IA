import './globals.css';
import React from 'react';
import localFont from 'next/font/local';

/**
 * Identité typographique Afrofade (DESIGN.md › Typography) :
 * - display : Special Gothic Expanded One (titres h1/h2, sections)
 * - body    : Special Gothic (paragraphes, navigation, UI)
 * - hand    : Caveat (accents émotionnels courts, 1-2 par écran)
 *
 * Polices Google Fonts (OFL) auto-hébergées via next/font/local :
 * Next 14.2 ne connaît pas encore "Special Gothic" dans son registre
 * next/font/google ; les fichiers sont les woff2 officiels de Google Fonts.
 */
const displayFont = localFont({
  src: './fonts/SpecialGothicExpandedOne.woff2',
  variable: '--font-display',
  display: 'swap',
});

const bodyFont = localFont({
  src: './fonts/SpecialGothic.woff2',
  variable: '--font-body',
  display: 'swap',
});

const handFont = localFont({
  src: './fonts/Caveat.woff2',
  variable: '--font-hand',
  weight: '400 700',
  display: 'swap',
});

export const metadata = {
  title: 'Afrofade — Le Rituel du Miroir : voyez la coupe avant de couper',
  description:
    'Afrofade reconstruit la tête de votre client en 3D à partir de quelques photos et lui essaye fades, locks, tresses et barbes avant le premier coup de tondeuse. Pensé pour les salons et les textures crépues.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${displayFont.variable} ${bodyFont.variable} ${handFont.variable}`}
    >
      <body className="font-body">
        <main className="min-h-screen bg-cream text-ink">{children}</main>
      </body>
    </html>
  );
}
