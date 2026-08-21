import { Suspense } from 'react';
import DiscoverMarketplace from '@/components/marketplace/DiscoverMarketplace';

export const metadata = {
  title: 'Découvrir — Afrofade',
  description: 'Trouvez des professionnels et salons adaptés à votre style près de chez vous.',
};

export default function DiscoverPage() {
  return <Suspense fallback={<main className="min-h-screen bg-cream"/>}><DiscoverMarketplace /></Suspense>;
}
