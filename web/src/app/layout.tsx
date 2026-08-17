import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Afrofade - Coiffure Virtuelle 3D par IA',
  description: 'SaaS de coiffure virtuelle 3D par IA pensé pour le marché africain et les textures crépues.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <main className="min-h-screen bg-slate-950 text-slate-100">
          {children}
        </main>
      </body>
    </html>
  );
}
