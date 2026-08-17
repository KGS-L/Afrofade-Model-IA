'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { PhotoUploader } from '@/components/PhotoUploader';
import { Studio3DCanvas } from '@/components/Studio3DCanvas';
import { HairstyleCatalog, HairstyleItem } from '@/components/HairstyleCatalog';
import { UpsellBanner } from '@/components/UpsellBanner';
import { PricingModal } from '@/components/PricingModal';
import { Scissors, Sparkles, CheckCircle2 } from 'lucide-react';

export default function StudioPage() {
  // State management for Studio Studio
  const [hasModel, setHasModel] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedStyle, setSelectedStyle] = useState<HairstyleItem | null>(null);
  const [lineUpCutoff, setLineUpCutoff] = useState<number>(50);
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);

  // Quota & Subscription State
  const [currentPlan, setCurrentPlan] = useState<string>('VIP');
  const [quotaUsed, setQuotaUsed] = useState<number>(18);
  const [quotaLimit, setQuotaLimit] = useState<number>(100);

  // Toast / Upsell Alert State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePhotosComplete = async (photos: string[]) => {
    setIsProcessing(true);
    // Simulate FastAPI DECA 3D Morphable Model reconstruction call
    setTimeout(() => {
      setIsProcessing(false);
      setHasModel(true);
      setQuotaUsed((prev) => prev + 1);
      // Default initial hairstyle
      setSelectedStyle({
        id: 'fade_taper_low',
        category: 'fade',
        title: 'Taper Fade Low',
        subtitle: 'Dégradé bas avec contours nets & line-up',
        thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
        color: '#1a110b',
        isPremium: false,
      });
      showToast('✨ Modèle 3D du client généré avec succès !');
    }, 1800);
  };

  const handleSelectStyle = (item: HairstyleItem) => {
    setSelectedStyle(item);
    showToast(`Style 3D "${item.title}" appliqué sur le modèle.`);
  };

  const handleTriggerUpsell = (item: HairstyleItem) => {
    if (item.isPremium) {
      showToast(`🔥 Option Premium sélectionnée: ${item.priceTag || '+2 000 FCFA'}`);
    }
  };

  const handleAddUpsell = (price: number, serviceName: string) => {
    showToast(`✅ ${serviceName} (+${price} FCFA) ajouté à la facture client !`);
  };

  const handleSelectPlan = (planName: string, priceFcfa: number) => {
    setCurrentPlan(planName);
    if (planName === 'PRO') setQuotaLimit(30);
    if (planName === 'VIP') setQuotaLimit(100);
    if (planName === 'EXTRA') setQuotaLimit(9999);
    setIsPricingOpen(false);
    showToast(`🎉 Félicitations ! Votre salon est désormais sur le plan ${planName}.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-amber-500/50 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        onOpenPricing={() => setIsPricingOpen(true)}
        quotaUsed={quotaUsed}
        quotaLimit={quotaLimit}
        currentPlan={currentPlan}
      />

      {/* Main Studio Viewport */}
      <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Studio Le Rituel du Miroir
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                Barber Consultation 3D
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Visualisez et ajustez les coiffures crépues, tresses et barbes sur la tête 3D du client avant de couper.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>FastAPI 3D Engine: <strong className="text-emerald-400">En Ligne</strong></span>
          </div>
        </div>

        {/* Studio Grid (3 Columns on Large Screens) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Photo Uploader & Step 1 */}
          <div className="lg:col-span-4 space-y-6">
            <PhotoUploader
              onPhotosComplete={handlePhotosComplete}
              isProcessing={isProcessing}
            />

            {/* Upsell Sales Assistant */}
            {hasModel && selectedStyle && (
              <UpsellBanner
                activeStyleTitle={selectedStyle.title}
                onAddUpsell={handleAddUpsell}
              />
            )}
          </div>

          {/* Center Column: 3D Interactive Canvas */}
          <div className="lg:col-span-8 space-y-6">
            <Studio3DCanvas
              hasModel={hasModel}
              selectedHairstyle={selectedStyle}
              lineUpCutoff={lineUpCutoff}
              onLineUpChange={setLineUpCutoff}
              onSaveRender={() =>
                showToast('📸 Aperçu 3D enregistré dans le Carnet Client !')
              }
            />

            {/* Bottom Style Catalog */}
            <HairstyleCatalog
              selectedId={selectedStyle?.id || null}
              onSelect={handleSelectStyle}
              onTriggerUpsell={handleTriggerUpsell}
            />
          </div>
        </div>
      </div>

      {/* Subscription Pricing Modal */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        onSelectPlan={handleSelectPlan}
      />
    </div>
  );
}
