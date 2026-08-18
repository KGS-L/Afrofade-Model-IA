---
status: final
updated: 2026-08-18
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
3. `#comment-ca-marche` — 4 `step_card` : 01 Filmez le scan vidéo guidé (capture automatique de la face, des profils G/D et de la nuque) · 02 La reconstruction 3D s'opère · 03 Explorez les coiffures · 04 Validez ensemble devant le miroir.
4. `#rituel-studio` — démo vidéo auto-play : mockup animé du Rituel en boucle (scan guidé avec ovale → capture des 4 angles → avatar 3D → essayage de coiffures), **zéro interaction requise** (décision Jonas-dev 2026-08-18) ; CTA « Tester le rituel 1mn » vers `/rituel`.
5. `#qualite` — 4 cartes labelisées (PRÉCISION · RENDU · FLUIDITÉ · CONFIDENTIALITÉ) — équivalent savoir-faire Thelma. [NOTE FOR UX] libellés proposés, à valider par Jonas-dev.
6. `#styles` — grille de `style_card` (fade, locks, tresses, afro, barbe) dont le visuel est un aperçu du modèle 3D procédural (canvas R3F compact), avec badge plan PRO/VIP et bouton Personnaliser.
7. `#tarifs` — 3 plans Pro / VIP / Extra (grille FCFA déjà décidée en brainstorm : 2200 / 4900 / 7500 FCFA/mois).
8. `#faq` — `faq_accordion`.
9. `footer` — `night_footer`, logo blanc, tagline, réseaux, moyens de paiement Mobile Money (Wave, Orange Money, MTN, Moov).

**Route `/rituel` (test du Rituel — wizard 4 étapes, grammaire thelma.pet/create adaptée)**
CTA navbar « Tester le rituel 1mn ». Header minimal (logo + pill « Étape X sur 4 » + retour) et stepper numéroté 1-4. Parcours : **1) Scan vidéo guidé** — caméra temps réel (`getUserMedia`), ovale de cadrage, consigne à l'écran et capture automatique des 4 angles dans l'ordre du pipeline (Face 0° « Regardez la caméra » → Profil droit +90° → Profil gauche −90° → Nuque 180°), sans toucher l'écran ; filmstrip des frames validées ; mode démo sans caméra (progression simulée, visuels d'exemple) ; **2) Avatar 3D** — analyse IA (~2 s) puis aperçu de l'avatar réaliste ; **3) Coiffure** — radiogroupe de styles appliqués instantanément à l'avatar ; **4) Finition** — rendu final figé, non modifiable, téléchargeable (PNG via canvas). **Gating freemium** (décision Jonas-dev 2026-08-18) : visiteur sans compte ni abonnement actif → rendu flouté dès l'étape 2 avec mention « Avatar verrouillé » ; à la fin de l'étape 4, mur de connexion — Google ou e-mail + code OTP — puis premier abonnement (remises si profil 100 %), qui dévoile le rendu HD et active le téléchargement.

**Routes d'authentification, espace salon et administration (2026-08-18)**
- `/connexion` — Connexion/Inscription, deux méthodes uniquement (décision Jonas-dev) : Google, ou e-mail + code OTP 6 chiffres ; lien « Accès administrateur (démo) » ; redirection via `?next=`.
- `/dashboard` (rôle salon) — profil du salon (nom, pays, numéro) avec barre de complétion en % ; remises premier abonnement débloquées uniquement à 100 % + premier abonnement : −10 % (3 mois), −25 % (6 mois), −40 % (annuel), prix barrés affichés ; carte abonnement actif avec badge remise ; stats quota/rendus.
- `/admin` (rôle admin) — KPI (salons inscrits, abonnements actifs, MRR FCFA, conversion essai→payant), répartition par plan, table des derniers salons inscrits. Données mock en attendant Supabase.

## Voice and Tone
- Français, vouvoiement — validé Jonas-dev 2026-08-17.
- Chaleureux, précis, jamais technique devant le client final du salon : « la magie opère » plutôt que « inférence DECA/FLAME ».
- Prix et quotas toujours en FCFA, jamais en jargon (« 20-30 têtes/mois »).

## Component Patterns
- `step_card` : comportement statique, révélée au scroll (fade-in doux).
- `demo_video_autoplay` (landing `#rituel-studio`) : mockup vidéo auto-play en boucle, muet — séquence scan guidé → reconstruction → essayage pilotée par une timeline interne (tête 3D qui tourne aux 4 angles, flash de capture, filmstrip qui se remplit, coiffures qui défilent). Aucune interaction ; poster statique sous `prefers-reduced-motion`.
- `scan_stage` (`/rituel` étape 1) : cadre caméra plein largeur coins `{rounded.image_frame}`, ovale de cadrage `{colors.scan_success}` pulsant discrètement, consigne d'angle + angle en surimpression, anneau de progression de stabilité, flash blanc à la capture, filmstrip des 4 frames validées. Écrans secondaires : `idle` (activation caméra / mode démo), erreur permission (réessayer + mode démo), résumé `done`.
- `style_card` : tap « Personnaliser » (landing) mène au wizard `/rituel` où le style s'applique à l'avatar en ≤ 2 s. (Concept premium/upsell retiré de l'interface le 2026-08-18 sur décision Jonas-dev.)
- `drawer` : liste des coiffures essayées, CTA final « Enregistrer la carte client » (gated plan).
- `PricingModal` : ouverture depuis les boutons « Choisir » de #tarifs.

## State Patterns
- **Scan** (`/rituel` étape 1) : `idle → live → guiding(angle) → capturing → captured`, 4 angles séquentiels puis `done`. La capture se déclenche automatiquement quand la stabilité (différence de frames consécutives côté client, en attendant le tracking de pose MediaPipe du pipeline) atteint 100 %. Caméra refusée ou indisponible → bascule `mode démo` (progression simulée, visuels d'exemple). Toutes les consignes doublées en texte (`aria-live`), jamais animation seule.
- **Quota** : à l'épuisement, CTA devient « Passer au plan supérieur » + ouverture `PricingModal`.
- **3D loading** : squelette `white_card` + shimmer, jamais d'écran blanc.
- **FAQ / drawer / modal** : un seul ouvert à la fois, fermeture par Échap et clic overlay.

## Interaction Primitives
- Caméra navigateur (`getUserMedia`, tablette salon) : capture automatique sans toucher pendant le scan guidé.
- Tap pour essayer une coiffure ; rotation du modèle 3D au doigt (OrbitControls contraints).
- Accordéon, carrousel hero, drawer latéral.

## Accessibility Floor
- Navigation clavier complète (ancres, drawer, modales, carrousel avec flèches).
- Contrastes conformes `DESIGN.md` (4.5:1) ; focus visible `{colors.terracotta}`.
- Alternatives texte sur tous les rendus de styles ; états « analyzing » doublés d'un texte, pas seulement une animation.
- Le mockup vidéo auto-play est muet et se fige en poster statique sous `prefers-reduced-motion` ; les consignes du scanner sont annoncées via `aria-live`.

## Key Flows
**Awa, gérante d'un salon à Abidjan (vendredi 18h, salle comble)**
1. Un client hésite sur un fade nouveau ; Awa sort la tablette et ouvre Afrofade.
2. Elle lance le scan vidéo guidé : « Regardez la caméra » — l'ovale vert se cale sur le visage et la capture part toute seule ; puis « tournez à droite », « à gauche », « présentez la nuque ». Quatre validations, zéro manipulation.
3. « Analyse IA » s'affiche ; le modèle 3D de la tête apparaît en `analyzing → ready`.
4. Elle fait défiler la grille `#styles` et applique « fade mid + line-up » — le client tourne son propre visage 3D du doigt.
5. **Climax** : le client voit le résultat sous tous les angles avant même que Awa sorte ses tondeuses, et dit « on y va ».
6. Awa enregistre la carte client ; la barbe sculptée proposée en un tap complète le panier.
7. Fin de mois : quota à 80 %, notification douce propose le passage VIP (4 900 FCFA).

## Inspiration & Anti-patterns
- **Inspiration thelma.pet** : structure émotionnelle en 4 étapes numérotées, démo interactive cœur de page, grille de styles avec prix d'appel, FAQ unique, footer rassurant (paiements locaux).
- **À ne pas reproduire** : les contenus, visuels et éléments de marque de Thelma (copie interdite) ; l'esthétique dark slate actuelle du code (remplacée par la palette crème) ; tout texte technique (DECA, mesh, GLB) exposé au client du salon.
