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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://afrofade.pro'),
  title: {
    default: 'Afrofade — Studio Virtuel de Coiffure 3D & Essayage de Coupes',
    template: '%s — Afrofade',
  },
  description:
    'Afrofade est l’application web de référence pour la coiffure afro. Elle reconstruit la tête de votre client en 3D à partir d’un scan vidéo guidé et permet d’essayer virtuellement des coupes (fades, locks, tresses, barbes) avant la tondeuse.',
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
    title: 'Afrofade — Studio Virtuel de Coiffure 3D & Essayage de Coupes',
    description:
      'Afrofade : Reconstruction 3D faciale en < 2s et essayage dynamique de coupes afro (Fades, Locks, Tresses, Barbes) avant le passage au salon.',
    url: 'https://afrofade.pro',
    siteName: 'Afrofade',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Afrofade — Studio Virtuel de Coiffure 3D',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Afrofade — Studio Virtuel de Coiffure 3D',
    description:
      'Afrofade : Reconstruction 3D en < 2s et essayage instantané de coiffures afro.',
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Afrofade',
    url: 'https://afrofade.pro',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'All',
    description:
      'Afrofade est un studio virtuel de coiffure 3D qui permet d’essayer des coupes de cheveux (fades, tresses, locks, afros) sur un modèle 3D reconstruit à partir d’un scan vidéo.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'XOF',
    },
  };

  return (
    <html
      lang="fr"
      className={`${displayFont.variable} ${bodyFont.variable} ${handFont.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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

