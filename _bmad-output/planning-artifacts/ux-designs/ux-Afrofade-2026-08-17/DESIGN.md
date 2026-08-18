---
status: final
updated: 2026-08-18
inspiration: thelma.pet (structure et feel adaptés — identité, textes et visuels Afrofade originaux)
colors:
  terracotta:
    value: "#C7816F"
    usage: "CTA principaux, liens actifs, badges d'étape, accents. Terracotta pur, tel quel — validé Jonas-dev 2026-08-17."
  terracotta_dark:
    value: "#A9662F"
    usage: "Hover/pressed des CTA terracotta."
  cream_bg:
    value: "#FAF6F1"
    usage: "Fond de page principal, sections claires."
  ink:
    value: "#1F1B17"
    usage: "Titres et texte principal sur fond clair."
  ink_soft:
    value: "#6B6259"
    usage: "Texte secondaire, descriptions, labels."
  white_card:
    value: "#FFFFFF"
    usage: "Cartes, panneaux, drawer, FAQ."
  night_footer:
    value: "#1F1B17"
    usage: "Footer sombre, logo/typo blanc en contraste."
  scan_success:
    value: "#2E7D46"
    usage: "Vert fonctionnel réservé au scanner guidé : ovale de cadrage, anneau de stabilité, coches de capture. Jamais décoratif, jamais un second accent de marque (décision scan vidéo 2026-08-18)."
typography:
  display:
    family: "Special Gothic Expanded One (Google Fonts, licence OFL — usage commercial libre, pas de Reserved Font Name)"
    usage: "Titres h1/h2, titres de sections."
  body:
    family: "Special Gothic (Google Fonts, licence OFL)"
    usage: "Paragraphes, navigation, UI."
  handwritten_accent:
    family: "Caveat ou équivalent manuscrit"
    usage: "Accents émotionnels courts ('La magie opère' → équivalent Afrofade), flèches annotations, mots surlignés."
rounded:
  card: "16px"
  button: "999px (pill)"
  input: "12px"
  image_frame: "12px"
spacing:
  section_y: "96px desktop / 64px mobile"
  card_padding: "24px"
  grid_gap: "24px"
  container_max: "1200px"
components:
  navbar: "Sticky, fond translucide clair, logo gauche, ancres (Le Rituel, Styles, Tarifs, FAQ), recherche et CTA pill terracotta droite."
  cta_primary: "Pill plein terracotta, texte blanc, hover terracotta_dark."
  step_card: "Carte claire, numéro 01-04 en display énorme terracotta pâle, titre display, description body."
  style_card: "Carte blanche, visuel 3D rendu, titre, prix 'à partir de' → pour Afrofade: badge plan (Pro/VIP), bouton Personnaliser pill. Le visuel est un aperçu du modèle 3D (R3F), pas une photo."
  faq_accordion: "Fond blanc, +/− rotatif, un seul panneau ouvert à la fois."
  drawer: "Panneau latéral droit (devis/panier coiffures sélectionnées), overlay dim."
  scan_stage: "Cadre caméra plein largeur, coins image_frame : flux vidéo miroir, ovale de cadrage scan_success (pulsation discrète motion-safe), consigne d'angle en pill blanc sur voile ink/40, anneau de stabilité, flash blanc à la capture ; filmstrip des 4 frames validées sous le cadre. Mode démo : photos d'exemple du personnage affichées dans le viseur (flux simulé)."
  demo_video_autoplay: "Mockup vidéo auto-play (landing, Le Rituel du Miroir) : cadre coins image_frame, badge « Démo automatique — sans manipulation », séquence muette en boucle — flux caméra simulé (photos du personnage client, léger travelling) avec ovale et consignes → reconstruction → rendus 3D d'essayage du hero. Aucun avatar procédural dans la démo (jugé peu réaliste, décision Jonas-dev 2026-08-18) ; poster statique sous prefers-reduced-motion."
---

# Afrofade — Identité Visuelle

## Brand & Style
Chaleureux, artisanal et technologique à la fois : l'esthétique "studio portrait premium" de thelma.pet transposée dans l'univers du barbershop afro. Sobre, aéré, fond clair crème, un seul accent terracotta fort, accents manuscrits pour l'émotion. Le sérieux d'un outil pro (salon) enveloppé dans la douceur d'une expérience client premium.

## Colors
- Palette réduite : un accent (`terracotta`), des neutres chauds (`cream_bg`, `ink`, `ink_soft`, `white_card`), un footer `night_footer`. Le token or premium a été retiré (décision 2026-08-18 : suppression du concept premium).
- Exception fonctionnelle : `scan_success` (vert) n'existe que pour les états de validation du scanner guidé — ovale, anneau, coches. Il n'entre jamais dans la hiérarchie de marque.
- Le terracotta n'apparaît que sur les actions et les repères d'étape — jamais en aplat de fond.
- Contraste minimum 4.5:1 pour tout texte ; `ink_soft` interdit sous 16px sur `cream_bg`.

## Typography
- Titres en `display` condensé, très grands (h1 jusqu'à 72px desktop), interlignage serré.
- Corps de texte en `body`, 16-18px, interlignage généreux.
- `handwritten_accent` utilisé avec parcimonie : 1-2 occurrences par écran maximum, jamais pour de l'information fonctionnelle.

## Layout & Spacing
- Conteneur central 1200px, sections alternant `cream_bg` et `white_card`.
- Rythme vertical généreux (`section_y`), hiérarchie par taille de titre plutôt que par boîtes.
- Grilles de cartes 3 colonnes desktop / 2 tablette / 1 mobile.

## Elevation & Depth
- Ombres douces et diffuses uniquement sur cartes et drawer (`0 4px 24px rgba(31,27,23,0.08)`).
- Pas d'ombres dures ni de bordures lourdes ; séparateurs par espacement et contraste de fond.

## Shapes
- Boutons et badges entièrement pills (`rounded.button`).
- Cartes à coins `card`, images cadrées `image_frame`.
- Visuels hero légèrement arrondis, jamais cerclés de bordures.

## Components
- `navbar`, `cta_primary`, `step_card`, `style_card`, `faq_accordion`, `drawer`, `scan_stage`, `demo_video_autoplay` spécifiés en frontmatter.
- Le viewer 3D (R3F) est intégré dans une `style_card` élargie : canvas plein cadre, coins `image_frame`, contrôles discrets en surimpression. Le mockup vidéo auto-play réutilise le même viewer et la même lumière 3 points que le wizard `/rituel` pour une continuité démo ↔ produit.

## Do's and Don'ts
- **Do** : réutiliser la grammaire de layout de Thelma (étapes numérotées, grille de styles, FAQ accordéon) avec contenus et visuels Afrofade originaux.
- **Don't** : copier textes, photos, logo ou éléments de marque de thelma.pet ; leur identité est propriétaire. Afrofade garde sa propre voix et ses propres visuels.
- **Don't** : mélanger l'ancienne palette dark slate du code actuel avec la nouvelle palette crème — migration complète.
