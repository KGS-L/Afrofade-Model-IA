import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FileText, ArrowLeft, CreditCard, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Conditions Générales de Vente (CGV) — Afrofade',
  description: 'Conditions générales de vente et d\'utilisation des abonnements Afrofade.',
};

export default function CgvPage() {
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
            <FileText className="w-5 h-5" />
          </div>
          <p className="font-hand text-xl text-terracotta">Contrat de Service</p>
        </div>

        <h1 className="font-display text-3xl md:text-4xl tracking-tight mb-8">
          Conditions Générales de Vente (CGV)
        </h1>

        <div className="space-y-8 text-sm md:text-base leading-relaxed text-ink-soft">
          {/* Section 1 */}
          <section className="bg-card rounded-card p-6 md:p-8 shadow-soft border border-ink/5">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-terracotta" />
              1. Objet du Service
            </h2>
            <p>
              Les présentes Conditions Générales de Vente régissent l'utilisation de la solution SaaS Afrofade d'essayage virtuel 3D et de simulation de coiffures afro, destinée aux salons de coiffure et barbiers professionnels.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-card rounded-card p-6 md:p-8 shadow-soft border border-ink/5">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-terracotta" />
              2. Formules d'Abonnement & Modalités de Paiement
            </h2>
            <p className="mb-3">
              Afrofade propose trois formules d'abonnement mensuel sans engagement, payables en Francs CFA (FCFA) via Mobile Money (Wave, Orange Money, MTN Mobile Money, Moov Money) :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-ink-soft mb-3">
              <li><strong>Plan PRO :</strong> 2 200 FCFA / mois (50 scans 3D / mois, catalogue complet, support standard).</li>
              <li><strong>Plan VIP :</strong> 4 900 FCFA / mois (Scans illimités, espace cloud 1 Go, support prioritaire 7j/7).</li>
              <li><strong>Plan EXTRA :</strong> 7 500 FCFA / mois (Multi-salons 3 accès, stockage illimité, marque blanche).</li>
            </ul>
            <p>
              Les abonnements sont renouvelés mensuellement à la date anniversaire du premier règlement.
            </p>
          </section>

          {/* Section 3 */}
          <section className="bg-card rounded-card p-6 md:p-8 shadow-soft border border-ink/5">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-terracotta" />
              3. Gestion des Quotas & Rechargement Mensuel
            </h2>
            <p>
              Pour la formule PRO, le quota de 50 scans 3D mensuels est réinitialisé automatiquement le 1er de chaque mois. En cas d'épuisement du quota avant la fin du mois, le salon peut passer au Plan VIP ou EXTRA pour continuer à profiter du service sans interruption.
            </p>
          </section>

          {/* Section 4 */}
          <section className="bg-card rounded-card p-6 md:p-8 shadow-soft border border-ink/5">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-terracotta" />
              4. Résiliation & Absence d'Engagement
            </h2>
            <p>
              Le salon peut interrompre son abonnement à tout moment depuis son espace salon ou en contactant le support. La résiliation prend effet à la fin de la période mensuelle en cours. Aucun remboursement prorata n'est effectué pour la période entamée.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
