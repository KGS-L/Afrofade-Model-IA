---
title: 'Landing UX crème/terracotta conforme aux spines ux-Afrofade-2026-08-17'
type: 'feature'
created: '2026-08-17'
status: 'done'
review_loop_iteration: 0
baseline_commit: 8e2106a2a4ad9f9d1789433b8b1ce16225da9297
context:
  - {project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Afrofade-2026-08-17/DESIGN.md
  - {project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Afrofade-2026-08-17/EXPERIENCE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La landing actuelle (`web/src/app/page.tsx`, 4 sections, palette dark slate, aucune police de marque, et Tailwind non compilé faute de configs) ne respecte ni les tokens ni l'IA des spines UX finalisés ; le DESIGN.md interdit tout mélange slate/crème.

**Approach:** Réécrire la route `/` en 9 sections conformes à l'IA de l'EXPERIENCE.md, migrer intégralement la palette vers crème/terracotta via un `tailwind.config` à créer, charger Special Gothic (regular + Expanded One) et Caveat via `next/font`, et restyler les 6 composants existants sans toucher à leur logique mock (upload simulé, quota, plans FCFA, toasts).

## Boundaries & Constraints

**Always:** Respecter les tokens DESIGN.md (terracotta `#C7816F`, hover `#A9662F`, crème `#FAF6F1`, ink `#1F1B17`, ink-soft `#6B6259`, or premium `#C99B3F` ; radius carte 16px, pill 999px ; container 1200px ; section 96/64px). Conserver tous les comportements mock existants (handlers, état, quota 18/100, plan VIP). Textes français vouvoyés, originaux, issus de la voix de l'EXPERIENCE.md. Cibles tactiles ≥ 44px. Icônes lucide-react.

**Ask First:** Supprimer ou remplacer un composant fonctionnel existant ; ajouter une dépendance ; modifier `next.config.js` ou le Dockerfile.

**Never:** Copier contenus, visuels ou éléments de marque de thelma.pet. Conserver la moindre classe `slate-` ou gradient amber/orange dans `web/src`. Brancher le vrai backend FastAPI. Créer d'autres routes que `/` (single-page).

</frozen-after-approval>

## Code Map

- `web/tailwind.config.ts` + `web/postcss.config.js` -- À CRÉER : inexistants, Tailwind n'est pas compilé (CSS build de 1127 o sans classes). Y définir colors/fonts/rounded depuis DESIGN.md.
- `web/src/app/globals.css` -- 17 l. : vars `--background:#0f172a`/`--foreground` à remplacer par tokens crème ; ajouter `@keyframes fade-in` (utilisée par PricingModal:64, non définie).
- `web/src/app/layout.tsx` -- 23 l., server component : ajouter `next/font` (Special Gothic, Special Gothic Expanded One, Caveat) + variables CSS ; metadata FR ; `main` slate-950 à migrer.
- `web/src/app/page.tsx` -- 260 l., `'use client'`, état mock l.23-34 à préserver tel quel. 4 sections actuelles → 9 cibles (IA §1-9) : navbar ancres Le Rituel/Styles/Tarifs/FAQ ; hero carrousel ; #comment-ca-marche (4 step_card 01-04) ; #rituel-studio (PhotoUploader+UpsellBanner / Studio3DCanvas+HairstyleCatalog) ; #qualite (4 cartes PRÉCISION·RENDU·FLUIDITÉ·CONFIDENTIALITÉ) ; #styles ; #tarifs (plans FCFA 2200/4900/7500, VIP surligné) ; #faq accordéon ; footer nuit Wave/Orange Money/MTN/Moov.
- `web/src/components/Navbar.tsx` -- 60 l. : sticky clair translucide, ancres, CTA pill terracotta ; badge plan/quota conservé.
- `web/src/components/PhotoUploader.tsx` -- 129 l. : dropzone blanche bordure dashed terracotta, 3 slots conservés.
- `web/src/components/HairstyleCatalog.tsx` -- 200 l. : exporte `HairstyleItem` (utilisé par page.tsx) — NE PAS renommer ; data 6 coiffures conservée ; cartes blanches, badges plan (PRO/VIP/PREMIUM or).
- `web/src/components/Studio3DCanvas.tsx` -- 258 l. : canvas R3F procédural conservé ; fill light `#60a5fa` (l.200) → lumière chaude ; wrapper/contrôles slate → clair.
- `web/src/components/UpsellBanner.tsx` -- 43 l. : bordure gauche or premium, badge PREMIUM.
- `web/src/components/PricingModal.tsx` -- 156 l. : cartes crème/blanches, VIP bordé terracotta, overlay encre.
- `web/public/models/*.png` -- 4 portraits (afro_beard_sculpted, afro_cornrows, afro_dreadlocks, afro_taper_fade) : thumbnails réutilisables pour la grille #styles.
- `mockups/key-landing-hero.html`, `key-studio-demo.html`, `key-styles-tarifs.html` (dans le dossier UX) -- Référence visuelle 1:1 des grammaires de section ; les spines priment en cas de conflit.

## Tasks & Acceptance

**Execution:**
- [x] `web/tailwind.config.ts` + `web/postcss.config.js` -- créer avec tokens DESIGN.md (colors.terracotta/cream/ink/premium, fontFamily display/body/hand, borderRadius) -- débloquer la compilation Tailwind.
- [x] `web/src/app/layout.tsx` -- charger les 3 polices Google via next/font avec variables CSS, relier dans `<html>`, migrer `main` vers crème -- identité typographique from scratch.
- [x] `web/src/app/globals.css` -- remplacer vars dark par tokens crème/encre, ajouter keyframes `fade-in` -- cohérence et fix de l'animation manquante.
- [x] `web/src/app/page.tsx` -- reconstruire en 9 sections IA avec textes vouvoyés originaux (hero « Voyez la coupe avant le premier coup de tondeuse », étapes 01-04, qualité, styles, tarifs, FAQ, footer), en réutilisant l'état mock et les composants existants -- conformité EXPERIENCE.md.
- [x] `web/src/components/Navbar.tsx` -- restyler clair + ancres -- navigation IA.
- [x] `web/src/components/PhotoUploader.tsx` -- restyler dropzone -- grammaire studio crème.
- [x] `web/src/components/HairstyleCatalog.tsx` -- restyler cartes + badges plan -- grille #styles DESIGN.md.
- [x] `web/src/components/Studio3DCanvas.tsx` -- cadre clair + lumières chaudes (remplacer `#60a5fa`) -- immersion cohérente.
- [x] `web/src/components/UpsellBanner.tsx` -- variant premium or -- upsell visible sans crier.
- [x] `web/src/components/PricingModal.tsx` -- restyler plans FCFA -- tarifs crédibles fond clair.

**Acceptance Criteria:**
- Given le code compilé, when `npm run build` dans `web/`, then succès sans erreur TS et le CSS émis contient les classes Tailwind générées.
- Given `web/src` inspecté, when `grep -rn "slate-" web/src`, then zéro occurrence (migration complète, pas de mélange).
- Given la page sur tablette, when navigation par ancres, then Le Rituel/Styles/Tarifs/FAQ atteignent leurs sections et les cibles tactiles font ≥ 44px.
- Given le quota mock (18/100), when affichage navbar, then badge plan/quota toujours fonctionnel (comportement préservé).
- Given un style premium sélectionné dans le catalogue, when UpsellBanner s'affiche, then badge PREMIUM or et logique d'ajout (+2 000 FCFA) intacts.
- Given la FAQ, when un panneau ouvert puis un second cliqué, then un seul ouvert à la fois et fermeture possible via Échap.

## Spec Change Log

- **2026-08-17 (revue step-04, route patch)** : les 3 couches de revue (blind/edge-case/verification-gap) ont relevé des sous-spécifications des tâches non gelées, corrigées en patch sans loopback : câblage des boutons « Personnaliser » de #styles à handleSelectStyle/handleTriggerUpsell (comportement style_card de l'EXPERIENCE.md), CTA navbar renommé « Essayer le Rituel », recherche navbar fonctionnelle (filtre catalogue), unification des données plans FCFA dans un module partagé, durcissement a11y (reduced-motion, focus trap modale, ARIA tablist/FAQ/carrousel, garde IntersectionObserver, noscript), next/image, menu mobile, poids Caveat fixé à 400. KEEP : grammaire 9 sections, tokens DESIGN.md, logique mock préservée, zéro slate — tout cela a survolé la revue sans constat.

## Design Notes

Grammaires de section reprises des maquettes : step_card (numéro 01-04 en display géant terracotta pâle), style_card (visuel + badge plan + bouton Personnaliser pill), faq_accordion (chevron +/× rotatif), footer nuit (logo blanc, terracotta en accent). Accents Caveat limités à 1-2 par écran, jamais pour l'information fonctionnelle. Le terracotta n'apparaît que sur actions et repères d'étape, jamais en aplat de fond. Ombres douces uniques : `0 4px 24px rgba(31,27,23,.08)`.

## Verification

**Commands:**
- `cd web && npm run build` -- expected: build Next.js standalone réussi, 0 erreur.
- `grep -rn "slate-" web/src | wc -l` -- expected: `0`.
- `grep -c "C7816F\|c7816f" web/tailwind.config.ts` -- expected: ≥ 1 (token présent).

**Manual checks (if no CLI):**
- `npm run dev` puis comparer visuellement chaque section aux 3 maquettes `mockups/*.html` (ordre, espacement, typographies).
- Vérifier le contraste des textes ink/ink-soft sur crème (≥ 4.5:1).

## Suggested Review Order

**Socle visuel — tokens & polices (point d'entrée)**

- Toute l'identité DESIGN.md en un fichier : couleurs, typos display/body/hand, radius, ombres.
  [`tailwind.config.ts:12`](../../web/tailwind.config.ts#L12)

- Les 3 Google Fonts OFL chargées via next/font/local (registre Next 14.2 ignorant Special Gothic).
  [`layout.tsx:15`](../../web/src/app/layout.tsx#L15)

- Caveat figé en poids 400 (fichier statique mono-poids) + fallback noscript.
  [`layout.tsx:30`](../../web/src/app/layout.tsx#L30)

- Tokens crème/encre globaux, scroll-padding navbar sticky, keyframes fade-in.
  [`globals.css:14`](../../web/src/app/globals.css#L14)

- Respect prefers-reduced-motion : scroll auto, animations coupées.
  [`globals.css:54`](../../web/src/app/globals.css#L54)

**Structure 9 sections de l'IA**

- #rituel-studio : cœur interactif préservé (uploader + canvas + catalogue).
  [`page.tsx:480`](../../web/src/app/page.tsx#L480)

- #qualite puis #styles : cartes FadeIn, placeholders dégradés pour cartes sans photo.
  [`page.tsx:532`](../../web/src/app/page.tsx#L532)

- #tarifs : plans FCFA consommant la source unique, VIP surligné.
  [`page.tsx:632`](../../web/src/app/page.tsx#L632)

**Logique mock préservée & câblage style_card**

- Handlers mock intacts (quota, upsell, toast) — contrat de préservation de la spec.
  [`page.tsx:229`](../../web/src/app/page.tsx#L229)

- « Personnaliser » de #styles : applique le style, déclenche l'upsell premium, scrolle.
  [`page.tsx:266`](../../web/src/app/page.tsx#L266)

- Source unique des plans (noms exacts attendus par handleSelectPlan, montants, features).
  [`plans.ts:18`](../../web/src/lib/plans.ts#L18)

**Accessibilité & navigation**

- Dialog a11y complète : role/aria-modal, piège Tab, focus restauré, scroll verrouillé.
  [`PricingModal.tsx:84`](../../web/src/components/PricingModal.tsx#L84)

- Recherche navbar fonctionnelle filtrant le catalogue (query prop).
  [`HairstyleCatalog.tsx:98`](../../web/src/components/HairstyleCatalog.tsx#L98)

- Navbar : ancres, CTA « Essayer le Rituel », recherche, badge plan/quota cliquable.
  [`Navbar.tsx:16`](../../web/src/components/Navbar.tsx#L16)

