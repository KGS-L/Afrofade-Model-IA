'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Navbar } from '@/components/Navbar';
import { PhotoUploader } from '@/components/PhotoUploader';
import { Studio3DCanvas } from '@/components/Studio3DCanvas';
import {
  HairstyleCatalog,
  HairstyleItem,
  HAIRSTYLES_DATA,
} from '@/components/HairstyleCatalog';
import { PricingModal } from '@/components/PricingModal';
import { HairstylePreview3D } from '@/components/HeadModel3D';
import { PLANS, formatFcfa, stylePlan, PLAN_BADGE_CLASS } from '@/lib/plans';
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

/* ------------------------------------------------------------------ */
/* Données de section — scope module                                   */
/* ------------------------------------------------------------------ */

/** Carrousel hero (§2) : visuels de démonstration des rendus 3D */
const HERO_SLIDES = [
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
    note: 'contours au millimètre, en 1 tap',
  },
];

/** Étapes 01-04 (§3) */
const STEPS = [
  {
    num: '01',
    title: 'Prenez 3–4 photos',
    text: 'Smartphone ou tablette, sous trois ou quatre angles, visage dégagé. Aucun matériel professionnel requis.',
  },
  {
    num: '02',
    title: 'La reconstruction 3D s’opère',
    text: 'En moins de deux secondes, la tête de votre client apparaît en 3D, prête pour l’essayage.',
  },
  {
    num: '03',
    title: 'Explorez les coiffures',
    text: 'Fades, locks, tresses, afro, barbe : essayez, comparez, ajustez les contours du bout du doigt.',
  },
  {
    num: '04',
    title: 'Validez ensemble',
    text: 'Votre client tourne son propre visage sous tous les angles et dit « on y va » — avant la tondeuse.',
  },
];

/** Savoir-faire (§5) : PRÉCISION · RENDU · FLUIDITÉ · CONFIDENTIALITÉ */
const QUALITY_CARDS = [
  {
    icon: Crosshair,
    label: 'PRÉCISION',
    text: 'Chaque ligne d’implantation et chaque contour est reproduit au plus près : votre client voit la coupe exacte qu’il quittera le salon.',
  },
  {
    icon: Layers,
    label: 'RENDU',
    text: 'Textures crépues et frisées rendues avec soin — fades à blanc, locks, tresses et barbes restent lisibles sous tous les angles.',
  },
  {
    icon: Gauge,
    label: 'FLUIDITÉ',
    text: 'La tête 3D répond au doigt, sans saccade, même en plein samedi sur la tablette du salon.',
  },
  {
    icon: Lock,
    label: 'CONFIDENTIALITÉ',
    text: 'Les photos de vos clients restent dans l’espace isolé de votre salon. Rien n’est partagé, rien n’est revendu.',
  },
];

/** Grille #styles (§6) — chaque carte porte l'id de son style du catalogue ;
 *  le visuel est un aperçu du modèle 3D procédural (HeadModel3D). */
const STYLE_CARDS: { id: string; title: string }[] = [
  { id: 'fade_taper_low', title: 'Fade classique' },
  { id: 'fade_burst_mohawk', title: 'Fade mid + line-up' },
  { id: 'locks_short_high_top', title: 'Locks courtes' },
  { id: 'tresses_cornrows_lines', title: 'Tresses collées' },
  { id: 'afro_sponge_twists', title: 'Afro sculpté' },
  { id: 'barbe_sculpted_contour', title: 'Barbe sculptée' },
];

/** FAQ (§8) */
const FAQ_ITEMS = [
  {
    q: 'Combien de photos faut-il pour la reconstruction 3D ?',
    a: 'Quatre photos suffisent : face, profil gauche, profil droit et arrière de la tête. Un visage dégagé et une lumière naturelle donnent les meilleurs résultats.',
  },
  {
    q: 'Les photos de mes clients sont-elles confidentielles ?',
    a: 'Oui. Chaque salon dispose d’un espace isolé et verrouillé : vos données ne sont visibles que par vous. Le plan VIP inclut un espace cloud dédié de 1 Go pour les cartes clients (stockage illimité avec le plan Extra).',
  },
  {
    q: 'Que se passe-t-il si j’atteins mon quota mensuel ?',
    a: 'Le Rituel vous propose simplement de passer au plan supérieur — aucune coupure en pleine journée de salon. Votre quota est remis à zéro le 1er de chaque mois de facturation.',
  },
  {
    q: 'Puis-je essayer avant de m’abonner ?',
    a: 'Bien sûr : la démo du Rituel du Miroir sur cette page est gratuite et ne demande aucune carte. Abonnez-vous uniquement quand le miroir vous a convaincu.',
  },
  {
    q: 'Quels moyens de paiement acceptez-vous ?',
    a: 'Wave, Orange Money, MTN et Moov : vous réglez directement depuis votre téléphone, en FCFA, sans engagement de durée.',
  },
];

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

  // Carrousel hero : slide active + slides déjà chargées (lazy)
  const [heroSlide, setHeroSlide] = useState<number>(0);
  const [loadedSlides, setLoadedSlides] = useState<boolean[]>(() =>
    HERO_SLIDES.map((_, i) => i === 0)
  );

  // FAQ accordéon : un seul panneau ouvert à la fois
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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

  const scrollToStyles = () => {
    const el = document.getElementById('styles');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  /** Bouton « Personnaliser » de la grille #styles : applique le style
   *  puis ramène au studio. */
  const personalizeStyle = (item: HairstyleItem) => {
    handleSelectStyle(item);
    scrollToStudio();
  };

  // Carrousel hero : navigation + chargement différé des slides non actives
  const goToSlide = (index: number) => {
    const safe = (index + HERO_SLIDES.length) % HERO_SLIDES.length;
    setHeroSlide(safe);
    setLoadedSlides((prev) =>
      prev[safe] ? prev : prev.map((v, k) => (k === safe ? true : v))
    );
  };
  const heroPrev = () => goToSlide(heroSlide - 1);
  const heroNext = () => goToSlide(heroSlide + 1);
  const touchStartX = useRef<number | null>(null);

  // FAQ : Échap ferme la FAQ uniquement si un panneau est ouvert
  // et que la modale pricing est fermée (pas de double fermeture).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openFaq !== null && !isPricingOpen) {
        setOpenFaq(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openFaq, isPricingOpen]);

  return (
    <div className="min-h-screen bg-cream text-ink font-body flex flex-col selection:bg-terracotta selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-card text-ink text-xs font-bold px-4 py-3 rounded-card shadow-soft flex items-center gap-2 animate-fade-in border border-ink/10">
          <CheckCircle2 className="w-4 h-4 text-terracotta shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Navbar — ancres Le Rituel · Styles · Tarifs · FAQ + CTA /rituel */}
      <Navbar />

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
                onClick={scrollToStyles}
                className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-transparent hover:bg-ink/5 text-ink font-bold text-sm md:text-base px-8 rounded-pill border-[1.5px] border-ink/20 transition-colors"
              >
                Voir la démo
              </button>
            </div>
          </div>

          {/* Carrousel hero : région ARIA, flèches clavier, swipe tactile */}
          <div
            role="region"
            aria-roledescription="carrousel"
            aria-label="Rendus 3D de démonstration Afrofade"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                heroPrev();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                heroNext();
              }
            }}
            className="relative focus:outline-none"
          >
            <div
              className="relative aspect-[4/4.4] rounded-frame overflow-hidden shadow-soft bg-terracotta-wash"
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                if (Math.abs(dx) > 40) {
                  if (dx < 0) heroNext();
                  else heroPrev();
                }
                touchStartX.current = null;
              }}
            >
              {HERO_SLIDES.map((slide, i) => (
                <div
                  key={slide.src + slide.title}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    i === heroSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden={i !== heroSlide}
                >
                  {(loadedSlides[i] || i === heroSlide) && (
                    <Image
                      src={slide.src}
                      alt={`Rendu 3D démo — ${slide.title}`}
                      fill
                      priority={i === 0}
                      loading={i === 0 ? undefined : 'lazy'}
                      sizes="(max-width: 1024px) 100vw, 480px"
                      className="object-cover"
                    />
                  )}
                </div>
              ))}
              <div className="absolute top-4 left-4 bg-white/90 text-ink-soft text-[10px] font-bold tracking-[0.22em] uppercase px-3 py-1.5 rounded-pill">
                Visuel démo — rendu 3D client
              </div>
              <div className="absolute bottom-16 left-1/2 [transform:translateX(-50%)] w-[86%] bg-card rounded-lg px-5 py-4 text-center shadow-soft">
                <b className="block text-sm md:text-[15px] font-bold">
                  {HERO_SLIDES[heroSlide].title}
                </b>
                <i className="not-italic text-xs text-ink-soft">
                  {HERO_SLIDES[heroSlide].note}
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
              {HERO_SLIDES.map((s, i) => (
                <button
                  key={'dot-' + i}
                  onClick={() => goToSlide(i)}
                  aria-label={`Aller au visuel ${i + 1} : ${s.title}`}
                  aria-current={i === heroSlide}
                  className="w-11 h-6 flex items-center justify-center rounded-pill"
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
          {STEPS.map((step) => (
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
            />
          </div>
        </div>
      </section>

      {/* 5. #qualite — savoir-faire : PRÉCISION · RENDU · FLUIDITÉ · CONFIDENTIALITÉ */}
      <section id="qualite" className="bg-card py-16 md:py-24">
        <div className="max-w-container mx-auto px-6">
          <div className="text-center mb-10 md:mb-12">
            <p className="font-hand text-2xl text-terracotta">
              le sérieux d’un outil pro
            </p>
            <h2 className="font-display text-3xl md:text-[34px] mt-2">
              Conçu pour le salon, pensé pour vos clients
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {QUALITY_CARDS.map((card) => (
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
          {STYLE_CARDS.map((card) => {
            const item = HAIRSTYLES_DATA.find((h) => h.id === card.id);
            if (!item) return null;
            const plan = stylePlan(item);
            return (
              <FadeIn key={card.id}>
                <div className="bg-card rounded-card overflow-hidden shadow-soft flex flex-col h-full">
                  <div className="relative aspect-[4/3] bg-[radial-gradient(120%_120%_at_30%_20%,#EFE0D6_0%,#DDBFAE_60%,#C7816F_140%)]">
                    <HairstylePreview3D item={item} className="absolute inset-0" />
                    <span
                      className={`absolute top-3 right-3 text-[10px] font-bold tracking-[0.12em] px-2.5 py-1 rounded-pill ${PLAN_BADGE_CLASS[plan]}`}
                    >
                      {plan}
                    </span>
                  </div>
                  <div className="p-5 flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-base flex-1 min-w-[120px]">
                      {card.title}
                    </h3>
                    <button
                      onClick={() => personalizeStyle(item)}
                      className="min-h-[44px] text-[13px] font-bold px-4 rounded-pill text-white bg-terracotta hover:bg-terracotta-dark transition-colors"
                    >
                      Personnaliser
                    </button>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* 7. #tarifs — plans FCFA, VIP surligné (source unique lib/plans.ts) */}
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
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-card p-7 ${
                  plan.popular
                    ? 'bg-card border-2 border-terracotta shadow-soft'
                    : 'bg-cream border-[1.5px] border-ink/10'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 [transform:translateX(-50%)] bg-terracotta text-white text-[11px] font-bold tracking-[0.12em] px-3.5 py-1 rounded-pill whitespace-nowrap">
                    LE PLUS CHOISI
                  </span>
                )}
                <h3 className="text-sm font-bold tracking-[0.14em] text-ink-soft">
                  {plan.name}
                </h3>
                <div className="font-display text-[38px] leading-tight mt-3.5">
                  {formatFcfa(plan.amount)}{' '}
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
                  onClick={() => setIsPricingOpen(true)}
                  aria-label={`Voir le détail et choisir le plan ${plan.name}`}
                  className={`mt-auto min-h-[44px] rounded-pill font-bold text-sm transition-colors ${
                    plan.popular
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
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={item.q} className="bg-card rounded-card shadow-soft px-6">
                <h3>
                  <button
                    id={`faq-q-${i}`}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
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
                </h3>
                {isOpen && (
                  <p
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-q-${i}`}
                    className="pb-5 text-sm leading-relaxed text-ink-soft animate-fade-in"
                  >
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
            <h4 className="text-xs font-bold tracking-[0.18em] text-white/50 mb-4">
              PRODUIT
            </h4>
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
            <h4 className="text-xs font-bold tracking-[0.18em] text-white/50 mb-4">
              LÉGAL
            </h4>
            <ul className="space-y-2.5 text-sm text-white/80">
              <li>Mentions légales</li>
              <li>Confidentialité</li>
              <li>CGV</li>
            </ul>
          </nav>
        </div>
        <div className="max-w-container mx-auto px-6 border-t border-white/10 pt-5 pb-2 flex flex-col sm:flex-row justify-between gap-2 text-xs text-white/45">
          <span>© {new Date().getFullYear()} Afrofade — Tous droits réservés</span>
          <span>
            Fabriqué avec <span aria-hidden="true">♥</span> pour les barbiers
            d’Afrique
          </span>
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

/** Révélation douce au scroll (EXPERIENCE.md › step_card).
 *  .fade-safe + <noscript> dans layout.tsx garantit la visibilité sans JS. */
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
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
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
      className={`fade-safe ${className} ${
        visible ? 'animate-fade-in' : 'opacity-0'
      }`}
    >
      {children}
    </div>
  );
}
