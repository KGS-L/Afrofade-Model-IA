"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HAIRSTYLES_DATA } from "@/components/HairstyleCatalog";
import { PricingModal } from "@/components/PricingModal";
import { HairstylePreview3D } from "@/components/HeadModel3D";
import { RituelDemoVideo } from "@/components/RituelDemoVideo";
import { HeroDemoCard } from "@/components/HeroDemoCard";
import { PLANS, formatFcfa, stylePlan, PLAN_BADGE_CLASS } from "@/lib/plans";
import { HairstyleCatalogModal } from "@/components/HairstyleCatalogModal";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Layers,
  Gauge,
  Lock,
  Plus,
  LayoutGrid,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Données de section — scope module                                   */
/* ------------------------------------------------------------------ */

/** Étapes 01-04 (§3) */
const STEPS = [
  {
    num: "01",
    title: "Filmez le scan guidé",
    text: "Tablette ou smartphone : suivez le guidage, la caméra détecte le bon angle et capture toute seule face, profils et nuque. Rien à régler, rien à retoucher.",
  },
  {
    num: "02",
    title: "La reconstruction 3D s’opère",
    text: "En moins de deux secondes, la tête de votre client apparaît en 3D, prête pour l’essayage.",
  },
  {
    num: "03",
    title: "Explorez les coiffures",
    text: "Fades, locks, tresses, afro, barbe : essayez, comparez, ajustez les contours du bout du doigt.",
  },
  {
    num: "04",
    title: "Validez ensemble",
    text: "Votre client tourne son propre visage sous tous les angles et dit « on y va » — avant la tondeuse.",
  },
];

/** Savoir-faire (§5) : PRÉCISION · RENDU · FLUIDITÉ · CONFIDENTIALITÉ */
const QUALITY_CARDS = [
  {
    icon: Crosshair,
    label: "PRÉCISION",
    text: "Chaque ligne d’implantation et chaque contour est reproduit au plus près : votre client voit la coupe exacte qu’il quittera le salon.",
  },
  {
    icon: Layers,
    label: "RENDU",
    text: "Textures crépues et frisées rendues avec soin — fades à blanc, locks, tresses et barbes restent lisibles sous tous les angles.",
  },
  {
    icon: Gauge,
    label: "FLUIDITÉ",
    text: "La tête 3D répond au doigt, sans saccade, même en plein samedi sur la tablette du salon.",
  },
  {
    icon: Lock,
    label: "CONFIDENTIALITÉ",
    text: "Les images du scan restent dans l’espace isolé de votre salon. Rien n’est partagé, rien n’est revendu.",
  },
];

/** Grille #styles (§6) — chaque carte porte l'id de son style du catalogue ;
 *  le visuel est un aperçu du modèle 3D procédural (HeadModel3D). */
const STYLE_CARDS: { id: string; title: string }[] = [
  { id: "fade_taper_low", title: "Fade classique" },
  { id: "fade_burst_mohawk", title: "Fade mid + line-up" },
  { id: "locks_short_high_top", title: "Locks courtes" },
  { id: "tresses_cornrows_lines", title: "Tresses collées" },
  { id: "afro_sponge_twists", title: "Afro sculpté" },
  { id: "barbe_sculpted_contour", title: "Barbe sculptée" },
];

/** FAQ (§8) */
const FAQ_ITEMS = [
  {
    q: "Comment se passe le scan vidéo guidé ?",
    a: "Vous lancez le scan, le guidage s’affiche : face, profil droit, profil gauche puis nuque. La caméra suit le mouvement de la tête et capture automatiquement le bon angle — pas de photos à retoucher, pas de matériel professionnel.",
  },
  {
    q: "Les données de mes clients sont-elles confidentielles ?",
    a: "Oui. Chaque salon dispose d’un espace isolé et verrouillé : vos données ne sont visibles que par vous, et les images du scan sont supprimées une fois l’avatar 3D généré. Le plan VIP inclut un espace cloud dédié de 1 Go pour les cartes clients (stockage illimité avec le plan Extra).",
  },
  {
    q: "Que se passe-t-il si j’atteins mon quota mensuel ?",
    a: "Le Rituel vous propose simplement de passer au plan supérieur — aucune coupure en pleine journée de salon. Votre quota est remis à zéro le 1er de chaque mois de facturation.",
  },
  {
    q: "Puis-je essayer avant de m’abonner ?",
    a: "Bien sûr : la démo du Rituel du Miroir sur cette page est gratuite et ne demande aucune carte. Abonnez-vous uniquement quand le miroir vous a convaincu.",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "Wave, Orange Money, MTN et Moov : vous réglez directement depuis votre téléphone, en FCFA, sans engagement de durée.",
  },
];

export default function StudioPage() {
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);
  const [pricingTab, setPricingTab] = useState<"b2b" | "b2c">("b2b");
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // FAQ accordéon : un seul panneau ouvert à la fois
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSelectPlan = (planName: string, _priceFcfa: number) => {
    setIsPricingOpen(false);
    showToast(`🎉 Abonnement ${planName} activé pour votre salon !`);
  };

  const scrollToStudio = () => {
    const el = document.getElementById("rituel-studio");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // FAQ : Échap ferme la FAQ uniquement si un panneau est ouvert
  // et que la modale pricing est fermée (pas de double fermeture).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openFaq !== null && !isPricingOpen) {
        setOpenFaq(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

      {/* 2. Hero — double CTA + Visuel Démo 3D Client */}
      <header className="max-w-container mx-auto px-6 pt-12 pb-16 md:pt-16 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col text-left">
            <p className="font-hand text-2xl md:text-[26px] text-terracotta">
              Bienvenue dans Afrofade ✦
            </p>
            <h1 className="font-display text-[42px] leading-[1.08] sm:text-[52px] lg:text-[60px] tracking-tight mt-3">
              Voyez la coupe{" "}
              <em className="not-italic text-terracotta">avant</em> le premier
              coup de tondeuse.
            </h1>
            <p className="mt-5 text-base md:text-lg leading-relaxed text-ink-soft">
              Afrofade reconstruit la tête de votre client en 3D à partir d’un
              scan vidéo guidé — la caméra capture elle-même les meilleurs
              angles — puis lui essaye fades, locks, tresses et barbes avant
              même le fauteuil. Il choisit en confiance, vous gagnez en
              précision.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-start">
              <Link
                href="/rituel"
                className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm md:text-base px-8 rounded-pill transition-colors"
              >
                Essayer le Rituel
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={scrollToStudio}
                className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-transparent hover:bg-ink/5 text-ink font-bold text-sm md:text-base px-8 rounded-pill border-[1.5px] border-ink/20 transition-colors"
              >
                Voir la démo
              </button>
            </div>
          </div>

          <div className="w-full">
            <HeroDemoCard />
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

      {/* 4. #rituel-studio — démo vidéo auto-play : le Rituel sans rien toucher */}
      <section
        id="rituel-studio"
        className="max-w-container mx-auto px-6 py-16 md:py-24"
      >
        <div className="text-center mb-10 md:mb-12">
          <p className="font-hand text-2xl text-terracotta">
            le miroir en action
          </p>
          <h2 className="font-display text-3xl md:text-[34px] mt-2">
            Le Rituel du Miroir
          </h2>
          <p className="mt-3 text-ink-soft text-sm md:text-[15px] max-w-xl mx-auto">
            Regardez : le scan vidéo guidé capture la tête, la reconstruction 3D
            s’opère, les coiffures s’essayent — sans que vous ne touchiez à
            rien. Lancez votre propre rituel quand vous voulez.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <RituelDemoVideo />

          <div className="mt-8 text-center">
            <Link
              href="/rituel"
              className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm md:text-base px-8 rounded-pill shadow-soft transition-colors"
            >
              Tester le rituel 1mn
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="mt-3 text-xs text-ink-soft">
              Gratuit, sans carte — le rendu final se dévoile après création de
              compte.
            </p>
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
      <section
        id="styles"
        className="max-w-container mx-auto px-6 py-16 md:py-24"
      >
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
                    <HairstylePreview3D
                      item={item}
                      className="absolute inset-0"
                    />
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
                    <Link
                      href="/rituel"
                      className="min-h-[44px] inline-flex items-center text-[13px] font-bold px-4 rounded-pill text-white bg-terracotta hover:bg-terracotta-dark transition-colors"
                    >
                      Personnaliser
                    </Link>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>

        {/* Bouton "Voir tous les styles" — Redirection vers la nouvelle page dédiée /styles */}
        <div className="mt-12 text-center">
          <Link
            href="/styles"
            className="min-h-[52px] inline-flex items-center justify-center gap-3 bg-card hover:bg-terracotta-wash text-ink hover:text-terracotta border border-ink/15 hover:border-terracotta/40 font-bold text-sm md:text-base px-8 rounded-pill shadow-soft hover:shadow-soft-lg transition-all duration-300 group"
          >
            <LayoutGrid className="w-5 h-5 text-terracotta group-hover:scale-110 transition-transform" />
            <span>
              Voir tous les styles (Catalogue complet {HAIRSTYLES_DATA.length}+)
            </span>
          </Link>
          <p className="mt-3 text-xs text-ink-soft">
            Explorez les dégradés, tresses, locks, afro & barbes sur une page
            dédiée avec filtres et inspection 3D.
          </p>
        </div>
      </section>

      {/* 7. #tarifs — plans FCFA B2B / Packs Crédits B2C */}
      <section id="tarifs" className="bg-card py-16 md:py-24">
        <div className="max-w-container mx-auto px-6">
          <div className="text-center mb-10 md:mb-12">
            <p className="font-hand text-2xl text-terracotta">
              offres sur-mesure
            </p>
            <h2 className="font-display text-3xl md:text-[34px] mt-2">
              Une formule adaptée à chaque besoin
            </h2>

            {/* Toggle B2B / B2C */}
            <div className="mt-6 inline-flex p-1 bg-cream border border-ink/10 rounded-pill shadow-soft">
              <button
                onClick={() => setPricingTab("b2b")}
                className={`px-6 py-2.5 rounded-pill font-bold text-xs sm:text-sm transition-all ${
                  pricingTab === "b2b"
                    ? "bg-terracotta text-white shadow-soft"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Pour les Salons (B2B)
              </button>
              <button
                onClick={() => setPricingTab("b2c")}
                className={`px-6 py-2.5 rounded-pill font-bold text-xs sm:text-sm transition-all ${
                  pricingTab === "b2c"
                    ? "bg-terracotta text-white shadow-soft"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Pour Moi (Particuliers B2C)
              </button>
            </div>
          </div>

          {/* ONGLET B2B : SALONS DE COIFFURE */}
          {pricingTab === "b2b" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-card p-7 ${
                    plan.popular
                      ? "bg-card border-2 border-terracotta shadow-soft"
                      : "bg-cream border-[1.5px] border-ink/10"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 [transform:translateX(-50%)] bg-terracotta text-white text-[11px] font-bold tracking-[0.12em] px-3.5 py-1 rounded-pill whitespace-nowrap">
                      LE PLUS CHOISI SALON
                    </span>
                  )}
                  <h3 className="text-sm font-bold tracking-[0.14em] text-ink-soft">
                    {plan.name}
                  </h3>
                  <div className="font-display text-[38px] leading-tight mt-3.5">
                    {formatFcfa(plan.amount)}{" "}
                    <small className="font-body text-sm font-normal text-ink-soft">
                      FCFA/mois
                    </small>
                  </div>
                  <p className="text-xs text-ink-soft mt-1 min-h-[32px]">
                    {plan.desc}
                  </p>
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
                        ? "bg-terracotta hover:bg-terracotta-dark text-white"
                        : "bg-transparent border-[1.5px] border-ink/20 hover:bg-ink/5 text-ink"
                    }`}
                  >
                    Choisir{" "}
                    {plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ONGLET B2C : PARTICULIERS (SANS ABONNEMENT) */}
          {pricingTab === "b2c" && (
            <div className="space-y-12">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <p className="font-bold text-terracotta text-sm">
                  Pas d’abonnement mensuel. Achetez uniquement les crédits dont
                  vous avez besoin.
                </p>
                <h3 className="font-display text-2xl">
                  Visualisez votre prochaine coiffure avant de passer chez le
                  coiffeur
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {[
                  {
                    name: "Pack Essai",
                    price: "500 FCFA",
                    credits: "5 crédits",
                    desc: "1 Tête 3D + 3 Téléchargements HD. Idéal pour un premier essai.",
                    popular: false,
                  },
                  {
                    name: "Pack Style",
                    price: "1 000 FCFA",
                    credits: "12 crédits",
                    desc: "2 Têtes 3D + 8 Téléchargements HD. Recommandé pour comparer plusieurs styles.",
                    popular: true,
                  },
                  {
                    name: "Pack Passion",
                    price: "2 000 FCFA",
                    credits: "30 crédits",
                    desc: "5 Têtes 3D + 20 Téléchargements HD. Pour tester régulièrement de nouveaux looks.",
                    popular: false,
                  },
                ].map((pack) => (
                  <div
                    key={pack.name}
                    className={`relative flex flex-col rounded-card p-7 ${
                      pack.popular
                        ? "bg-card border-2 border-terracotta shadow-soft"
                        : "bg-cream border-[1.5px] border-ink/10"
                    }`}
                  >
                    {pack.popular && (
                      <span className="absolute -top-3.5 left-1/2 [transform:translateX(-50%)] bg-terracotta text-white text-[11px] font-bold tracking-[0.12em] px-3.5 py-1 rounded-pill whitespace-nowrap">
                        RECOMMANDÉ
                      </span>
                    )}
                    <h3 className="text-sm font-bold tracking-[0.14em] text-ink-soft">
                      {pack.name}
                    </h3>
                    <div className="font-display text-[38px] leading-tight mt-3.5">
                      {pack.price}{" "}
                      <small className="font-body text-xs font-bold text-terracotta bg-terracotta-wash px-2.5 py-1 rounded-pill ml-2">
                        {pack.credits}
                      </small>
                    </div>
                    <p className="text-xs text-ink-soft mt-3">{pack.desc}</p>

                    <div className="mt-6 pt-4 border-t border-ink/10 space-y-2 text-xs text-ink-soft">
                      <div className="flex items-center gap-2">
                        <span className="text-terracotta font-bold">✓</span>
                        <span>Création Tête 3D = 2 crédits</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>Essayage des coiffures = GRATUIT</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-terracotta font-bold">✓</span>
                        <span>Téléchargement HD = 1 crédit</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsPricingOpen(true)}
                      className={`mt-6 min-h-[44px] rounded-pill font-bold text-sm transition-colors ${
                        pack.popular
                          ? "bg-terracotta hover:bg-terracotta-dark text-white"
                          : "bg-transparent border-[1.5px] border-ink/20 hover:bg-ink/5 text-ink"
                      }`}
                    >
                      Acheter {pack.name}
                    </button>
                  </div>
                ))}
              </div>

              {/* Tunnel Marketing B2C : Photos -> Tête 3D -> Essayages -> Télécharger -> Coiffeur */}
              <div className="bg-cream border border-ink/10 rounded-card p-8 text-center space-y-6">
                <h4 className="font-display text-xl">
                  Comment ça marche pour vous ?
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
                  {[
                    {
                      step: "01",
                      title: "Prenez vos photos",
                      desc: "Face et profils sous bon éclairage.",
                    },
                    {
                      step: "02",
                      title: "Créez votre tête 3D",
                      desc: "Morphologie calculée en quelques secondes.",
                    },
                    {
                      step: "03",
                      title: "Essayez les coiffures",
                      desc: "Testez gratuitement tous les styles Afro.",
                    },
                    {
                      step: "04",
                      title: "Montrez à votre coiffeur",
                      desc: "Téléchargez le rendu HD & partagez sur WhatsApp.",
                    },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className="bg-card border border-ink/5 rounded-card p-4 space-y-1"
                    >
                      <span className="font-hand text-terracotta font-bold text-lg">
                        {s.step}
                      </span>
                      <h5 className="font-bold text-xs text-ink">{s.title}</h5>
                      <p className="text-[11px] text-ink-soft">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
              <div
                key={item.q}
                className="bg-card rounded-card shadow-soft px-6"
              >
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
                        isOpen ? "rotate-45" : ""
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
      <Footer />

      {/* Pricing Modal */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        onSelectPlan={handleSelectPlan}
      />

      {/* Catalogue complet des styles Modal */}
      <HairstyleCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
      />
    </div>
  );
}

/** Révélation douce au scroll (EXPERIENCE.md › step_card).
 *  .fade-safe + <noscript> dans layout.tsx garantit la visibilité sans JS. */
function FadeIn({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
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
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`fade-safe ${className} ${
        visible ? "animate-fade-in" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
