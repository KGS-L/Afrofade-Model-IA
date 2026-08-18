'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { PhotoUploader } from '@/components/PhotoUploader';
import { Studio3DCanvas } from '@/components/Studio3DCanvas';
import { HairstyleCatalog, HairstyleItem } from '@/components/HairstyleCatalog';
import { UpsellBanner } from '@/components/UpsellBanner';
import { PricingModal } from '@/components/PricingModal';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Layers,
  Gauge,
  Lock,
  Plus,
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

  // --- Hero carousel (§2) : visuels avant/après salon ---
  const heroSlides = [
    {
      src: '/models/afro_taper_fade.png',
      title: 'Taper fade & line-up',
      note: 'rendu 3D · rotation du doigt',
    },
    {
      src: '/models/afro_dreadlocks.png',
      title: 'Locks sculptées',
      note: 'volumes fidèles, textures crépues',
    },
    {
      src: '/models/afro_cornrows.png',
      title: 'Cornrows géométriques',
      note: 'motifs lisibles sous tous les angles',
    },
    {
      src: '/models/afro_beard_sculpted.png',
      title: 'Barbe sculptée',
      note: 'option premium, essayage en 1 tap',
    },
  ];
  const [heroSlide, setHeroSlide] = useState<number>(0);
  const heroPrev = () =>
    setHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  const heroNext = () => setHeroSlide((prev) => (prev + 1) % heroSlides.length);

  // --- FAQ accordéon (§8) : un seul panneau ouvert, fermeture Échap ---
  const faqItems = [
    {
      q: 'Combien de photos faut-il pour la reconstruction 3D ?',
      a: "Trois photos suffisent (face, profil gauche, profil droit) ; une quatrième en trois-quarts affine encore les volumes. Un visage dégagé et une lumière naturelle donnent les meilleurs résultats.",
    },
    {
      q: 'Les photos de mes clients sont-elles confidentielles ?',
      a: "Oui. Chaque salon dispose d'un espace isolé et verrouillé : vos données ne sont visibles que par vous. Les cartes clients VIP et Extra sont conservées dans un espace cloud dédié de 1 Go.",
    },
    {
      q: 'Que se passe-t-il si j’atteins mon quota mensuel ?',
      a: "Le Rituel vous propose simplement de passer au plan supérieur — aucune coupure en pleine journée de salon. Votre quota est remis à zéro le 1er de chaque mois de facturation.",
    },
    {
      q: 'Puis-je essayer avant de m’abonner ?',
      a: "Bien sûr : la démo du Rituel du Miroir sur cette page est gratuite et ne demande aucune carte. Abonnez-vous uniquement quand le miroir vous a convaincu.",
    },
    {
      q: 'Quels moyens de paiement acceptez-vous ?',
      a: "Wave, Orange Money, MTN Moov et Mobile Money : vous réglez directement depuis votre téléphone, en FCFA, sans engagement de durée.",
    },
  ];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenFaq(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // --- Grille #styles (§6) : style_card + badge plan ---
  const styleCards = [
    { title: 'Fade classique', plan: 'PRO', img: '/models/afro_taper_fade.png' },
    { title: 'Fade mid + line-up', plan: 'PRO', img: '/models/afro_taper_fade.png' },
    { title: 'Locks courtes', plan: 'VIP', img: '/models/afro_dreadlocks.png' },
    { title: 'Tresses collées', plan: 'VIP', img: '/models/afro_cornrows.png' },
    { title: 'Afro sculpté', plan: 'PRO', img: '/models/afro_dreadlocks.png' },
    { title: 'Barbe sculptée', plan: 'PREMIUM', img: '/models/afro_beard_sculpted.png' },
  ];

  const planBadgeClass: Record<string, string> = {
    PRO: 'bg-ink-soft text-white',
    VIP: 'bg-terracotta-dark text-white',
    PREMIUM: 'bg-premium text-white',
  };

  // --- #tarifs (§7) : plans FCFA ---
  const pricingPlans = [
    {
      name: 'PRO',
      price: '2 200',
      amount: 2200,
      star: false,
      features: [
        '20 à 30 têtes par mois',
        'Rituel du Miroir complet',
        'Catalogue fades, tresses, afro',
        'Support technique WhatsApp',
      ],
    },
    {
      name: 'VIP',
      price: '4 900',
      amount: 4900,
      star: true,
      features: [
        '100 têtes par mois',
        '1 Go de cartes clients cloud',
        'Téléchargement HD des rendus',
        'Styles premium à la carte',
        'Support prioritaire 7j/7',
      ],
    },
    {
      name: 'EXTRA',
      price: '7 500',
      amount: 7500,
      star: false,
      features: [
        'Têtes 3D illimitées',
        'Toutes les fonctions, sans exception',
        'Multi-postes tablette & smartphone',
        'Accès anticipé aux nouveaux styles',
      ],
    },
  ];

  // --- #qualite (§5) : 4 cartes savoir-faire ---
  const qualityCards = [
    {
      icon: Crosshair,
      label: 'PRÉCISION',
      text: "Chaque ligne d'implantation et chaque contour est reproduit au plus près : votre client voit la coupe exacte qu'il quittera le salon.",
    },
    {
      icon: Layers,
      label: 'RENDU',
      text: "Textures crépues et frisées rendues avec soin — fades à blanc, locks, tresses et barbes restent lisibles sous tous les angles.",
    },
    {
      icon: Gauge,
      label: 'FLUIDITÉ',
      text: "La tête 3D répond au doigt, sans saccade, même en plein samedi sur la tablette du salon.",
    },
    {
      icon: Lock,
      label: 'CONFIDENTIALITÉ',
      text: "Les photos de vos clients restent dans l'espace isolé de votre salon. Rien n'est partagé, rien n'est revendu.",
    },
  ];

  return (
    <div className="min-h-screen bg-cream text-ink font-body flex flex-col selection:bg-terracotta selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-card text-ink text-xs font-bold px-4 py-3 rounded-card shadow-soft flex items-center gap-2 animate-fade-in border border-ink/10">
          <CheckCircle2 className="w-4 h-4 text-terracotta shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Navbar — ancres Le Rituel · Styles · Tarifs · FAQ */}
      <Navbar
        onOpenPricing={() => setIsPricingOpen(true)}
        quotaUsed={quotaUsed}
        quotaLimit={quotaLimit}
        currentPlan={currentPlan}
      />

      {/* 2. Hero — carrousel visuels + double CTA */}
      <header className="max-w-container mx-auto px-6 pt-12 pb-16 md:pt-16 md:pb-24">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-14 items-center">
          <div>
            <p className="font-hand text-2xl md:text-[26px] text-terracotta">
              Bienvenue dans le Rituel du Miroir ✦
            </p>
            <h1 className="font-display text-[42px] leading-[1.08] sm:text-[52px] lg:text-[60px] tracking-tight mt-3">
              Voyez la coupe <em className="not-italic text-terracotta">avant</em>{' '}
              le premier coup de tondeuse.
            </h1>
            <p className="mt-5 text-base md:text-lg leading-relaxed text-ink-soft max-w-[46ch]">
              Afrofade reconstruit la tête de votre client en 3D à partir de
              3–4 photos, puis lui essaye fades, locks, tresses et barbes avant
              même le fauteuil. Il choisit en confiance, vous gagnez en
              précision.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={scrollToStudio}
                className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm md:text-base px-8 rounded-pill transition-colors"
              >
                Essayer le Rituel
              </button>
              <button
                onClick={scrollToStudio}
                className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-transparent hover:bg-ink/5 text-ink font-bold text-sm md:text-base px-8 rounded-pill border-[1.5px] border-ink/20 transition-colors"
              >
                Voir la démo
              </button>
            </div>
          </div>

          {/* Carrousel hero : flèches + points, navigation clavier */}
          <div className="relative">
            <div className="relative aspect-[4/4.4] rounded-frame overflow-hidden shadow-soft bg-terracotta-wash">
              {heroSlides.map((slide, i) => (
                <div
                  key={slide.src + slide.title}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    i === heroSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden={i !== heroSlide}
                >
                  <img
                    src={slide.src}
                    alt={`Rendu 3D démo — ${slide.title}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              <div className="absolute top-4 left-4 bg-white/90 text-ink-soft text-[10px] font-bold tracking-[0.22em] uppercase px-3 py-1.5 rounded-pill">
                Visuel démo — rendu 3D client
              </div>
              <div className="absolute bottom-16 left-1/2 [transform:translateX(-50%)] w-[86%] bg-card rounded-lg px-5 py-4 text-center shadow-soft">
                <b className="block text-sm md:text-[15px] font-bold">
                  {heroSlides[heroSlide].title}
                </b>
                <i className="not-italic text-xs text-ink-soft">
                  {heroSlides[heroSlide].note}
                </i>
              </div>
              <button
                onClick={heroPrev}
                aria-label="Visuel précédent"
                className="absolute left-3 top-1/2 [transform:translateY(-50%)] w-11 h-11 rounded-pill bg-card/90 hover:bg-card text-ink flex items-center justify-center shadow-soft transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={heroNext}
                aria-label="Visuel suivant"
                className="absolute right-3 top-1/2 [transform:translateY(-50%)] w-11 h-11 rounded-pill bg-card/90 hover:bg-card text-ink flex items-center justify-center shadow-soft transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 justify-center mt-4">
              {heroSlides.map((s, i) => (
                <button
                  key={'dot-' + i}
                  onClick={() => setHeroSlide(i)}
                  aria-label={`Aller au visuel ${i + 1} : ${s.title}`}
                  aria-current={i === heroSlide}
                  className={`w-11 h-6 flex items-center justify-center rounded-pill`}
                >
                  <span
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === heroSlide ? 'bg-terracotta' : 'bg-ink/20'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 3. #comment-ca-marche — 4 step_card 01-04 */}
      <section
        id="comment-ca-marche"
        className="max-w-container mx-auto px-6 pt-8 pb-16 md:pb-24"
      >
        <div className="text-center mb-10 md:mb-12">
          <p className="font-hand text-2xl text-terracotta">
            simple comme un miroir
          </p>
          <h2 className="font-display text-3xl md:text-[34px] mt-2">
            Comment ça marche
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              num: '01',
              title: 'Prenez 3–4 photos',
              text: "Smartphone ou tablette, sous trois ou quatre angles, visage dégagé. Aucun matériel professionnel requis.",
            },
            {
              num: '02',
              title: 'La reconstruction 3D s’opère',
              text: "En moins de deux secondes, la tête de votre client apparaît en 3D, prête pour l'essayage.",
            },
            {
              num: '03',
              title: 'Explorez les coiffures',
              text: 'Fades, locks, tresses, afro, barbe : essayez, comparez, ajustez les contours du bout du doigt.',
            },
            {
              num: '04',
              title: 'Validez ensemble',
              text: "Votre client tourne son propre visage sous tous les angles et dit « on y va » — avant la tondeuse.",
            },
          ].map((step) => (
            <FadeIn key={step.num}>
              <div className="h-full bg-card rounded-card p-6 shadow-soft">
                <div className="font-display text-[44px] leading-none text-terracotta-pale">
                  {step.num}
                </div>
                <h3 className="font-bold text-base mt-4 mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">
                  {step.text}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* 4. #rituel-studio — démo interactive : le cœur de page */}
      <section id="rituel-studio" className="max-w-container mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-10 md:mb-12">
          <p className="font-hand text-2xl text-terracotta">à vous de jouer</p>
          <h2 className="font-display text-3xl md:text-[34px] mt-2">
            Le Rituel du Miroir
          </h2>
          <p className="mt-3 text-ink-soft text-sm md:text-[15px] max-w-xl mx-auto">
            Déposez les photos de votre client et laissez la magie opérer :
            essayez les coiffures sur sa tête 3D, directement sur cette page.
          </p>
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

      {/* 5. #qualite — savoir-faire : PRÉCISION · RENDU · FLUIDITÉ · CONFIDENTIALITÉ */}
      <section id="qualite" className="bg-card py-16 md:py-24">
        <div className="max-w-container mx-auto px-6">
          <div className="text-center mb-10 md:mb-12">
            <p className="font-hand text-2xl text-terracotta">
              le sérieux d'un outil pro
            </p>
            <h2 className="font-display text-3xl md:text-[34px] mt-2">
              Conçu pour le salon, pensé pour vos clients
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {qualityCards.map((card) => (
              <FadeIn key={card.label}>
                <div className="h-full bg-cream rounded-card p-6 shadow-soft">
                  <div className="w-11 h-11 rounded-pill bg-terracotta-wash text-terracotta flex items-center justify-center">
                    <card.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-sm tracking-[0.12em] mt-4 mb-2">
                    {card.label}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    {card.text}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 6. #styles — grille de style_card avec badge plan */}
      <section id="styles" className="max-w-container mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-10 md:mb-12">
          <p className="font-hand text-2xl text-terracotta">
            trouvez le style qui parle
          </p>
          <h2 className="font-display text-3xl md:text-[34px] mt-2">
            Nos styles
          </h2>
          <p className="mt-3 text-ink-soft text-sm md:text-[15px]">
            Essayez-les sur la tête 3D de votre client, directement depuis le
            Rituel.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {styleCards.map((style) => (
            <FadeIn key={style.title}>
              <div className="bg-card rounded-card overflow-hidden shadow-soft flex flex-col h-full">
                <div className="relative aspect-[4/3] bg-terracotta-wash">
                  <img
                    src={style.img}
                    alt={`Rendu 3D — ${style.title}`}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className={`absolute top-3 right-3 text-[10px] font-bold tracking-[0.12em] px-2.5 py-1 rounded-pill ${planBadgeClass[style.plan]}`}
                  >
                    {style.plan}
                  </span>
                </div>
                <div className="p-5 flex items-center gap-3 flex-wrap">
                  <h3 className="font-bold text-base flex-1 min-w-[120px]">
                    {style.title}
                  </h3>
                  <button
                    onClick={scrollToStudio}
                    className={`min-h-[44px] text-[13px] font-bold px-4 rounded-pill text-white transition-colors ${
                      style.plan === 'PREMIUM'
                        ? 'bg-premium hover:bg-premium/90'
                        : 'bg-terracotta hover:bg-terracotta-dark'
                    }`}
                  >
                    Personnaliser
                  </button>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* 7. #tarifs — plans FCFA, VIP surligné */}
      <section id="tarifs" className="bg-card py-16 md:py-24">
        <div className="max-w-container mx-auto px-6">
          <div className="text-center mb-12 md:mb-14">
            <p className="font-hand text-2xl text-terracotta">sans engagement</p>
            <h2 className="font-display text-3xl md:text-[34px] mt-2">
              Des tarifs pensés pour votre salon
            </h2>
            <p className="mt-3 text-ink-soft text-sm md:text-[15px]">
              Paiement par Mobile Money · facturation mensuelle en FCFA ·
              résiliable à tout moment.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-card p-7 ${
                  plan.star
                    ? 'bg-card border-2 border-terracotta shadow-soft'
                    : 'bg-cream border-[1.5px] border-ink/10'
                }`}
              >
                {plan.star && (
                  <span className="absolute -top-3.5 left-1/2 [transform:translateX(-50%)] bg-terracotta text-white text-[11px] font-bold tracking-[0.12em] px-3.5 py-1 rounded-pill whitespace-nowrap">
                    LE PLUS CHOISI
                  </span>
                )}
                <h3 className="text-sm font-bold tracking-[0.14em] text-ink-soft">
                  {plan.name}
                </h3>
                <div className="font-display text-[38px] leading-tight mt-3.5">
                  {plan.price}{' '}
                  <small className="font-body text-sm font-normal text-ink-soft">
                    FCFA/mois
                  </small>
                </div>
                <ul className="mt-5 mb-6 space-y-2.5 text-sm text-ink-soft">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex gap-2">
                      <span className="text-terracotta font-bold" aria-hidden>
                        ✓
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan(plan.name, plan.amount)}
                  className={`mt-auto min-h-[44px] rounded-pill font-bold text-sm transition-colors ${
                    plan.star
                      ? 'bg-terracotta hover:bg-terracotta-dark text-white'
                      : 'bg-transparent border-[1.5px] border-ink/20 hover:bg-ink/5 text-ink'
                  }`}
                >
                  Choisir {plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. #faq — accordéon, un seul panneau ouvert, fermeture Échap */}
      <section id="faq" className="max-w-container mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-10 md:mb-12">
          <p className="font-hand text-2xl text-terracotta">on vous dit tout</p>
          <h2 className="font-display text-3xl md:text-[34px] mt-2">
            Tout ce que vous voulez savoir
          </h2>
        </div>
        <div className="max-w-[760px] mx-auto grid gap-3">
          {faqItems.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={item.q} className="bg-card rounded-card shadow-soft px-6">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full min-h-[56px] py-4 flex items-center justify-between gap-4 text-left font-semibold text-[15px] md:text-base"
                >
                  <span>{item.q}</span>
                  <Plus
                    className={`w-5 h-5 text-terracotta shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <p className="pb-5 text-sm leading-relaxed text-ink-soft animate-fade-in">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. Footer nuit — paiements Mobile Money locaux */}
      <footer className="bg-night text-white">
        <div className="max-w-container mx-auto px-6 pt-14 pb-10 grid md:grid-cols-[1.4fr_1fr_1fr] gap-10">
          <div>
            <div className="font-display text-[26px]">
              Afro<span className="text-terracotta">fade</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/65 max-w-[34ch]">
              Le miroir du futur pour les salons qui font de chaque coupe une
              œuvre.
            </p>
            <div className="flex flex-wrap gap-2.5 mt-4">
              {['Wave', 'Orange Money', 'MTN', 'Moov'].map((p) => (
                <span
                  key={p}
                  className="border border-white/25 rounded-pill px-3 py-1.5 text-xs text-white/75"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          <nav aria-label="Produit">
            <h5 className="text-xs font-bold tracking-[0.18em] text-white/50 mb-4">
              PRODUIT
            </h5>
            <ul className="space-y-2.5 text-sm text-white/80">
              <li>
                <a href="#rituel-studio" className="hover:text-terracotta transition-colors">
                  Le Rituel
                </a>
              </li>
              <li>
                <a href="#styles" className="hover:text-terracotta transition-colors">
                  Nos styles
                </a>
              </li>
              <li>
                <a href="#tarifs" className="hover:text-terracotta transition-colors">
                  Tarifs
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-terracotta transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </nav>
          <nav aria-label="Légal">
            <h5 className="text-xs font-bold tracking-[0.18em] text-white/50 mb-4">
              LÉGAL
            </h5>
            <ul className="space-y-2.5 text-sm text-white/80">
              <li>Mentions légales</li>
              <li>Confidentialité</li>
              <li>CGV</li>
            </ul>
          </nav>
        </div>
        <div className="max-w-container mx-auto px-6 border-t border-white/10 pt-5 pb-2 flex flex-col sm:flex-row justify-between gap-2 text-xs text-white/45">
          <span>© 2026 Afrofade — Tous droits réservés</span>
          <span>Fabriqué avec ♥ pour les barbiers d’Afrique</span>
        </div>
      </footer>

      {/* Pricing Modal */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        onSelectPlan={handleSelectPlan}
      />
    </div>
  );
}

/** Révélation douce au scroll (EXPERIENCE.md › step_card) */
function FadeIn({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? 'animate-fade-in' : 'opacity-0'}`}
    >
      {children}
    </div>
  );
}
