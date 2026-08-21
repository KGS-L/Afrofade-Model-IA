import type { Metadata } from 'next';
import PublicProviderProfile from '@/components/marketplace/PublicProviderProfile';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const readable = slug.split('-').map((part) => part ? part[0].toUpperCase()+part.slice(1) : '').join(' ');
  return { title: `${readable} — Professionnel Afrofade`, description: 'Découvrez ses prestations et réservez sur Afrofade.' };
}

export default async function ProfessionalPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicProviderProfile type="professional" slug={slug}/>;
}
