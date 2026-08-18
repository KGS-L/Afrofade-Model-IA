import './globals.css';
import React from 'react';
import localFont from 'next/font/local';
import { Viewport, Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';

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
  weight: '400',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#FAF6F1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://afrofade.com'),
  title: {
    default: 'Afrofade — Le Rituel du Miroir : voyez la coupe 3D avant de couper',
    template: '%s — Afrofade',
  },
  description:
    'Afrofade reconstruit la tête de votre client en 3D à partir d’un scan vidéo guidé — capture automatique des angles — puis lui essaye fades, locks, tresses et barbes avant le premier coup de tondeuse. Pensé pour les salons et les textures crépues.',
  keywords: [
    'Afrofade',
    'Coiffure Afro 3D',
    'Mirror 3D Barber',
    'Fade',
    'Taper',
    'Locks',
    'Cornrows',
    'Barber SaaS',
    'Reconstruction Faciale 3D',
    'Mobile Money Salon',
  ],
  authors: [{ name: 'Afrofade Team' }],
  icons: {
    icon: '/icon.png',
    shortcut: '/logo.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Afrofade — Le Rituel du Miroir 3D pour Barbiers & Salons',
    description:
      'Reconstruction 3D faciale en < 2s et essayage dynamique de coupes afro (Fades, Locks, Tresses, Barbes) avant la tondeuse.',
    url: 'https://afrofade.com',
    siteName: 'Afrofade 3D Studio',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Afrofade 3D Haircut Mirror Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Afrofade 3D — Le Miroir du Futur pour la Coiffure Afro',
    description:
      'Reconstruction 3D en < 2s et essayage instantané de coiffures afro. Découvrez le Rituel du Miroir.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
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
        {/* Fallback no-JS : les révélations au scroll (.fade-safe) restent visibles */}
        <noscript>
          <style>{`.fade-safe{opacity:1 !important}`}</style>
        </noscript>
        <main className="min-h-screen bg-cream text-ink">
          <AuthProvider>{children}</AuthProvider>
        </main>
      </body>
    </html>
  );
}
