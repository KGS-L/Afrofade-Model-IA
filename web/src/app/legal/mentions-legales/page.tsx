import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ShieldCheck, ArrowLeft, Building, Server, Lock } from 'lucide-react';

export const metadata = {
  title: 'Mentions Légales — Afrofade',
  description: 'Informations légales, éditeur de la plateforme Afrofade et hébergement cloud.',
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-cream text-ink font-body flex flex-col">
      <main className="max-w-[840px] mx-auto px-6 py-12 md:py-16 flex-1">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta hover:underline mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-card bg-terracotta-wash text-terracotta flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <p className="font-hand text-xl text-terracotta">Informations Légales</p>
        </div>

        <h1 className="font-display text-3xl md:text-4xl tracking-tight mb-8">
          Mentions Légales
        </h1>

        <div className="space-y-8 text-sm md:text-base leading-relaxed text-ink-soft">
          {/* Section 1 */}
          <section className="bg-card rounded-card p-6 md:p-8 shadow-soft border border-ink/5">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <Building className="w-5 h-5 text-terracotta" />
              1. Éditeur de la Plateforme
            </h2>
            <p className="mb-2">
              Le site et la plateforme SaaS <strong>Afrofade</strong> sont édités par la société <strong>KGS Lab / Afrofade SAS</strong>.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-ink-soft">
              <li><strong>Siège social :</strong> Abidjan, Côte d'Ivoire</li>
              <li><strong>E-mail de contact :</strong> <a href="mailto:contact@afrofade.com" className="text-terracotta hover:underline">contact@afrofade.com</a></li>
              <li><strong>Directeur de la publication :</strong> Équipe Afrofade AI & Engineering</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="bg-card rounded-card p-6 md:p-8 shadow-soft border border-ink/5">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-terracotta" />
              2. Hébergement & Infrastructure Cloud
            </h2>
            <p className="mb-2">
              L'infrastructure web et les services de traitement 3D sont hébergés sur des serveurs sécurisés :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-ink-soft">
              <li><strong>Hébergement Base de Données & Auth :</strong> Supabase Inc. (San Francisco, CA, USA / Data Centers UE & West Africa)</li>
              <li><strong>Calcul d'Inférence 3D (FastAPI / DECA) :</strong> Hetzner Online GmbH & Infrastructure VPS Cloud dédiée</li>
              <li><strong>Stockage d'Assets :</strong> Supabase Storage avec URLs pré-signées et chiffrées</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-card rounded-card p-6 md:p-8 shadow-soft border border-ink/5">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-terracotta" />
              3. Propriété Intellectuelle
            </h2>
            <p>
              L'ensemble des contenus (éléments graphiques, logos, moteurs de reconstruction 3D, visuels de coiffures, textes, structure et code source) est la propriété exclusive d'Afrofade SAS. Toute reproduction, distribution ou exploitation sans autorisation préalable écrite est strictement interdite.
            </p>
          </section>

          {/* Section 4 */}
          <section className="bg-card rounded-card p-6 md:p-8 shadow-soft border border-ink/5">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-terracotta" />
              4. Données Biométriques & Protection de la Vie Privée
            </h2>
            <p>
              Conformément à la réglementation sur la protection des données à caractère personnel (CEDEAO / RGPD), l'analyse faciale effectuée par le scan vidéo du Rituel sert <strong>uniquement et exclusivement</strong> à la génération de la tête 3D temporaire du client. Les clichés sources sont purgés automatiquement sous 30 jours et ne sont jamais revendus ni partagés avec des tiers.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
