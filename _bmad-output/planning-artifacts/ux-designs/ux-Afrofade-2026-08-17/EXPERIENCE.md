---
status: final
updated: 2026-08-17
ui_system: "Next.js App Router + Tailwind CSS + React Three Fiber (drei) — voir ARCHITECTURE-SPINE.md AD-1"
form_factor: "Web responsive, cible principale : tablette salon (10-13 pouces, tactile) ; desktop marketing ; mobile secondaire."
inspiration: thelma.pet
---

# Afrofade — Expérience

## Foundation
- Application web Next.js 14 App Router (repo `web/`) : routes `/` (landing + démo) et `/rituel` (test du Rituel).
- Référence visuelle : `DESIGN.md` (tokens cités par nom `{colors.terracotta}` etc.).
- Cœur interactif : canvas React Three Fiber pour l'essayage de coiffures 3D sur la tête reconstruite.
- Usage terrain : tablette tenue à la main dans le salon, une main possible → cibles tactiles ≥ 44px.

## Information Architecture
Landing single-page (confirmée Jonas-dev 2026-08-17) + page de test `/rituel` ajoutée 2026-08-18. Maquettes de référence : `mockups/key-landing-hero.html`, `mockups/key-studio-demo.html`, `mockups/key-styles-tarifs.html` (les spines priment sur toute maquette en cas de conflit).

**Route `/` (landing Afrodade)**
1. `navbar` — ancres : Le Rituel · Styles · Tarifs · FAQ ; CTA « Tester le Rituel » vers `/rituel` (recherche et badge plan/quota retirés sur décision Jonas-dev 2026-08-18) ; drawer devis coiffures (différé).
2. `hero` — carrousel visuels avant/après salon + titre display + double CTA (Essayer · Voir la démo).
3. `#comment-ca-marche` — 4 `step_card` : 01 Prenez 4 photos (face, profils G/D, arrière) · 02 La reconstruction 3D s'opère · 03 Explorez les coiffures · 04 Validez ensemble devant le miroir.
4. `#rituel-studio` — démo interactive : dropzone photos → état « Analyse IA » → galerie de styles générés sur la tête 3D (Rituel du Miroir).
5. `#qualite` — 4 cartes labelisées (PRÉCISION · RENDU · FLUIDITÉ · CONFIDENTIALITÉ) — équivalent savoir-faire Thelma. [NOTE FOR UX] libellés proposés, à valider par Jonas-dev.
6. `#styles` — grille de `style_card` (fade, locks, tresses, afro, barbe) avec badge plan/premium `{colors.premium_gold}` et bouton Personnaliser.
7. `#tarifs` — 3 plans Pro / VIP / Extra (grille FCFA déjà décidée en brainstorm : 2200 / 4900 / 7500 FCFA/mois).
8. `#faq` — `faq_accordion`.
9. `footer` — `night_footer`, logo blanc, tagline, réseaux, moyens de paiement Mobile Money (Wave, Orange Money, MTN, Moov).

**Route `/rituel` (test du Rituel — grammaire thelma.pet/create adaptée)**
Header minimal (logo + retour) ; titre de mission unique « Tester le Rituel du Miroir » ; grande dropzone centrée (glisser/toucher, JPG · PNG · HEIC) ; 3 exigences photo en pills (tête entière visible · photo nette, lumière naturelle · visage dégagé) ; note de confidentialité (stockage isolé par salon, suppression après génération) ; flux mock idle → « Analyse IA » → prêt + CTA « Explorer les styles » vers `/#rituel-studio`.

## Voice and Tone
- Français, vouvoiement — validé Jonas-dev 2026-08-17.
- Chaleureux, précis, jamais technique devant le client final du salon : « la magie opère » plutôt que « inférence DECA/FLAME ».
- Prix et quotas toujours en FCFA, jamais en jargon (« 20-30 têtes/mois »).

## Component Patterns
- `step_card` : comportement statique, révélée au scroll (fade-in doux).
- Démo studio : dropzone (clic + glisser, JPG/PNG/HEIC) → progression « Analyse IA » animée → grille de rendus 3D.
- `style_card` : tap « Personnaliser » applique la coiffure au mesh 3D courant en ≤ 2 s ; les styles premium déclenchent l'`UpsellBanner`.
- `drawer` : liste des coiffures essayées, CTA final « Enregistrer la carte client » (gated plan).
- `PricingModal` : ouverture depuis CTA navbar et cartes premium.

## State Patterns
- **Upload** : `idle → drag_over → uploading → analyzing → ready` ; erreurs (format, réseau, quota épuisé) en message inline sous la dropzone, jamais en alert().
- **Quota** : à l'épuisement, CTA devient « Passer au plan supérieur » + ouverture `PricingModal`.
- **3D loading** : squelette `white_card` + shimmer, jamais d'écran blanc.
- **FAQ / drawer / modal** : un seul ouvert à la fois, fermeture par Échap et clic overlay.

## Interaction Primitives
- Glisser-déposer + prise de photo directe (input capture tablette).
- Tap pour essayer une coiffure ; rotation du modèle 3D au doigt (OrbitControls contraints).
- Accordéon, carrousel hero, drawer latéral.

## Accessibility Floor
- Navigation clavier complète (ancres, drawer, modales, carrousel avec flèches).
- Contrastes conformes `DESIGN.md` (4.5:1) ; focus visible `{colors.terracotta}`.
- Alternatives texte sur tous les rendus de styles ; états « analyzing » doublés d'un texte, pas seulement une animation.

## Key Flows
**Awa, gérante d'un salon à Abidjan (vendredi 18h, salle comble)**
1. Un client hésite sur un fade nouveau ; Awa sort la tablette et ouvre Afrofade.
2. Elle photographie le client sous 4 angles — face, profils gauche/droit, arrière — depuis la dropzone (`uploading`).
3. « Analyse IA » s'affiche ; le modèle 3D de la tête apparaît en `analyzing → ready`.
4. Elle fait défiler la grille `#styles` et applique « fade mid + line-up » — le client tourne son propre visage 3D du doigt.
5. **Climax** : le client voit le résultat sous tous les angles avant même que Awa sorte ses tondeuses, et dit « on y va ».
6. Awa enregistre la carte client ; le badge premium « barbe sculptée » retient l'attention → upsell en 1 tap.
7. Fin de mois : quota à 80 %, notification douce propose le passage VIP (4 900 FCFA).

## Inspiration & Anti-patterns
- **Inspiration thelma.pet** : structure émotionnelle en 4 étapes numérotées, démo interactive cœur de page, grille de styles avec prix d'appel, FAQ unique, footer rassurant (paiements locaux).
- **À ne pas reproduire** : les contenus, visuels et éléments de marque de Thelma (copie interdite) ; l'esthétique dark slate actuelle du code (remplacée par la palette crème) ; tout texte technique (DECA, mesh, GLB) exposé au client du salon.
