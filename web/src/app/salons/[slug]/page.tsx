import type { Metadata } from 'next';
import PublicProviderProfile from '@/components/marketplace/PublicProviderProfile';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const readable = slug.split('-').map((part) => part ? part[0].toUpperCase()+part.slice(1) : '').join(' ');
  return { title: `${readable} — Salon Afrofade`, description: 'Découvrez ce salon, ses prestations et son équipe sur Afrofade.' };
}

export default async function SalonPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicProviderProfile type="salon" slug={slug}/>;
}
