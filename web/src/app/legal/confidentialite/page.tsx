import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ShieldCheck, ArrowLeft, Lock, Trash2, Database, Eye } from 'lucide-react';

export const metadata = {
  title: 'Politique de Confidentialité — Afrofade',
  description: 'Politique de confidentialité et protection des données biométriques sur la plateforme Afrofade.',
};

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-cream text-ink font-body flex flex-col">
      <Navbar />

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
            <Lock className="w-5 h-5" />
          </div>
          <p className="font-hand text-xl text-terracotta">Protection des Données</p>
        </div>

        <h1 className="font-display text-3xl md:text-4xl tracking-tight mb-8">
          Politique de Confidentialité
        </h1>

        <div className="space-y-8 text-sm md:text-base leading-relaxed text-ink-soft">
          {/* Section 1 */}
          <section className="bg-card rounded-card p-6 md:p-8 shadow-soft border border-ink/5">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-terracotta" />
              1. Engagement d'Afrofade
            </h2>
            <p>
              La protection de la vie privée et de l'image de vos clients est notre priorité absolue. Afrofade est conçu pour offrir une expérience d'essayage 3D en salon sans compromettre la sécurité des données biométriques.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-card rounded-card p-6 md:p-8 shadow-soft border border-ink/5">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-terracotta" />
              2. Données Collectées & Usage
            </h2>
            <p className="mb-3">
              Nous collectons uniquement les informations nécessaires au bon fonctionnement de notre service SaaS :
            </p>
            <ul className="list-disc pl-5 space-y-2 text-ink-soft">
              <li><strong>Données Salon :</strong> Nom du salon, adresse e-mail de connexion, numéro WhatsApp et identifiant de compte salon.</li>
              <li><strong>Scans Vidéo & Photos Clients :</strong> Utilisés exclusivement par le moteur d'inférence 3D pour morpher le maillage faciale et générer l'avatar `.glb`.</li>
              <li><strong>Données de Facturation :</strong> Traitées de manière entièrement chiffrée via nos partenaires de paiement Mobile Money (GeniusPay / Money Fusion). Nous ne stockons aucun identifiant bancaire ni code secret.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-card rounded-card p-6 md:p-8 shadow-soft border border-ink/5">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-terracotta" />
              3. Purge Automatique des Clichés à 30 Jours (Normes CEDEAO)
            </h2>
            <p>
              Les images et vidéos de scan fournies pour créer l'avatar 3D sont conservées temporairement dans des buckets privés isolés par salon (Row Level Security). Conformément à notre politique de sobriété biométrique, un processus automatisé procède à la <strong>purge irréversible sous 30 jours</strong> de toutes les têtes temporaires non archivées par le salon.
            </p>
          </section>

          {/* Section 4 */}
          <section className="bg-card rounded-card p-6 md:p-8 shadow-soft border border-ink/5">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-terracotta" />
              4. Droits des Salons & Suppression de Compte
            </h2>
            <p>
              Chaque salon partenaire dispose d’un droit d’accès, de rectification et de suppression totale de ses données et des fiches clients associées. Pour exercer ce droit ou demander la suppression définitive de votre compte salon, envoyez un e-mail à <a href="mailto:privacy@afrofade.com" className="text-terracotta hover:underline font-semibold">privacy@afrofade.com</a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
