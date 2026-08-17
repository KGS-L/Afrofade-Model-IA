'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { PhotoUploader } from '@/components/PhotoUploader';
import { Studio3DCanvas } from '@/components/Studio3DCanvas';
import { HairstyleCatalog, HairstyleItem } from '@/components/HairstyleCatalog';
import { UpsellBanner } from '@/components/UpsellBanner';
import { PricingModal } from '@/components/PricingModal';
import {
  Scissors,
  Sparkles,
  CheckCircle2,
  Camera,
  Layers,
  Sliders,
  DollarSign,
  ArrowDown,
  ChevronRight,
} from 'lucide-react';

export default function StudioPage() {
  const [hasModel, setHasModel] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedStyle, setSelectedStyle] = useState<HairstyleItem | null>(null);
  const [lineUpCutoff, setLineUpCutoff] = useState<number>(50);
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);

  // Quotas & Plan State
  const [currentPlan, setCurrentPlan] = useState<string>('VIP');
  const [quotaUsed, setQuotaUsed] = useState<number>(18);
  const [quotaLimit, setQuotaLimit] = useState<number>(100);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePhotosComplete = async (photos: string[]) => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setHasModel(true);
      setQuotaUsed((prev) => prev + 1);
      setSelectedStyle({
        id: 'fade_taper_low',
        category: 'fade',
        title: 'Low Taper Fade & Line-Up',
        subtitle: 'Dégradé bas progressif avec contours rectilignes nets',
        thumbnail: '/models/afro_taper_fade.png',
        color: '#1a110b',
        isPremium: false,
      });
      showToast('✨ Tête 3D reconstituée avec succès !');
    }, 1600);
  };

  const handleSelectStyle = (item: HairstyleItem) => {
    setSelectedStyle(item);
    showToast(`Style "${item.title}" appliqué sur le modèle 3D.`);
  };

  const handleTriggerUpsell = (item: HairstyleItem) => {
    if (item.isPremium) {
      showToast(`🔥 Prestation Premium activée: ${item.priceTag || '+2 000 FCFA'}`);
    }
  };

  const handleAddUpsell = (price: number, serviceName: string) => {
    showToast(`✅ ${serviceName} (+${price} FCFA) ajouté avec succès !`);
  };

  const handleSelectPlan = (planName: string, priceFcfa: number) => {
    setCurrentPlan(planName);
    if (planName === 'PRO') setQuotaLimit(30);
    if (planName === 'VIP') setQuotaLimit(100);
    if (planName === 'EXTRA') setQuotaLimit(9999);
    setIsPricingOpen(false);
    showToast(`🎉 Abonnement ${planName} activé pour votre salon !`);
  };

  const scrollToStudio = () => {
    const el = document.getElementById('rituel-studio');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-amber-500/50 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navbar Header */}
      <Navbar
        onOpenPricing={() => setIsPricingOpen(true)}
        quotaUsed={quotaUsed}
        quotaLimit={quotaLimit}
        currentPlan={currentPlan}
      />

      {/* Hero Section (Inspired by Thelma.pet style) */}
      <section className="relative pt-12 pb-16 px-6 text-center overflow-hidden border-b border-slate-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-amber-400 text-xs font-extrabold tracking-wide uppercase shadow-lg">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Le 1er Studio 3D Virtuel pour Cheveux Afro & Crépus</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Des coiffures d’exception pour des clients uniques
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Permettez à vos clients d'essayer virtuellement leur future coupe (fades, locks, tresses, barbe) sur leur tête 3D reconstituée en salon avant de couper.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={scrollToStudio}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm px-7 py-4 rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <span>Démarrer le Rituel 3D (2mn)</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>

            <button
              onClick={() => setIsPricingOpen(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm px-6 py-4 rounded-2xl border border-slate-800 transition-all"
            >
              <span>Voir les Tarifs Salons (à partir de 2 200 FCFA)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4-Step Process Section ("Comment ça marche" inspired by Thelma.pet) */}
      <section className="py-14 px-6 max-w-7xl mx-auto border-b border-slate-800/60">
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
            Processus Salon
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Comment fonctionne Le Rituel du Miroir
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl space-y-3 relative hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
              1
            </div>
            <h3 className="font-bold text-white text-base">Déposez 3 photos</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prenez 3 clichés rapides du client sous différents angles (Face, Profil G, Profil D).
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl space-y-3 relative hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
              2
            </div>
            <h3 className="font-bold text-white text-base">La magie 3D opère</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              L'IA génère le modèle 3D du visage avec texture mélanine et morphométrie faciale.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl space-y-3 relative hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
              3
            </div>
            <h3 className="font-bold text-white text-base">Explorez les styles</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Testez 6 coupes afro signées (fades, tresses, locks, barbe sculptée) à 360°.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl space-y-3 relative hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
              4
            </div>
            <h3 className="font-bold text-white text-base">Ajustez & Vendez</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ajustez la ligne de contours au millimètre et vendez des soins premium complémentaires.
            </p>
          </div>
        </div>
      </section>

      {/* Main Interactive Studio Section */}
      <section id="rituel-studio" className="py-12 px-4 sm:px-6 max-w-7xl w-full mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              Studio Virtuel 3D
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                Direct Salon
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Activez la caméra ou importez les photos du client pour démarrer l'inférence 3D.
            </p>
          </div>
        </div>

        {/* Studio Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Photo Uploader */}
          <div className="lg:col-span-4 space-y-6">
            <PhotoUploader
              onPhotosComplete={handlePhotosComplete}
              isProcessing={isProcessing}
            />

            {hasModel && selectedStyle && (
              <UpsellBanner
                activeStyleTitle={selectedStyle.title}
                onAddUpsell={handleAddUpsell}
              />
            )}
          </div>

          {/* Center/Right Column: 3D Viewport & Style Explorer */}
          <div className="lg:col-span-8 space-y-6">
            <Studio3DCanvas
              hasModel={hasModel}
              selectedHairstyle={selectedStyle}
              lineUpCutoff={lineUpCutoff}
              onLineUpChange={setLineUpCutoff}
              onSaveRender={() =>
                showToast('📸 Rendu 3D enregistré dans le Carnet Client 1Go !')
              }
            />

            <HairstyleCatalog
              selectedId={selectedStyle?.id || null}
              onSelect={handleSelectStyle}
              onTriggerUpsell={handleTriggerUpsell}
            />
          </div>
        </div>
      </section>

      {/* Pricing Modal */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        onSelectPlan={handleSelectPlan}
      />
    </div>
  );
}
