---
title: "PRD — Afrofade (Coiffure Virtuelle 3D par IA pour Salons Afro)"
status: draft
created: 2026-08-18
updated: 2026-08-18
---

# PRD: Afrofade — SaaS B2B2C de Coiffure Virtuelle 3D

## 0. Document Purpose
Ce document constitue le Product Requirement Document (PRD) canonique d'**Afrofade**, la plateforme SaaS de consultation et de projection 3D pré-coupe dédiée aux salons de coiffure et barbershops du marché africain (salons réalisant un chiffre d'affaires minimum de 100 000 FCFA/mois).

Il s'adresse à l'équipe produit, aux architectes logiciels, aux développeurs frontend/backend et aux designers UX/UI. Il est ancré dans le vocabulaire défini au Glossaire (§3) et s'appuie sur la vision d'innovation du *Rituel du Miroir*, l'architecture système hybride (`ARCHITECTURE-SPINE.md`), et l'identité visuelle naturelle/chaleureuse (`DESIGN.md` & `EXPERIENCE.md`).

---

## 1. Vision
Afrofade transforme la consultation pré-coupe traditionnelle en salon en une expérience immersive baptisée **Le Rituel du Miroir**. Grâce à un modèle d'IA 3D morphable couplé à un moteur de rendu temps réel WebGL (React Three Fiber), les barbiers et coiffeurs permettent à leurs clients de visualiser à 360° le rendu exact de leur future coupe (fades, tresses, locks, barbe sculptée) sur leur propre visage modélisé en 3D avant le premier coup de tondeuse.

L'objectif business est d'offrir aux salons africains un outil de différenciation haut de gamme leur permettant de :
1. **Éliminer la déception client** liée au manque de projection visuelle.
2. **Augmenter le panier moyen du salon** via des suggestions de prestations premium complémentaires (soin de barbe, contours au rasoir, line-up art).
3. **Fidéliser la clientèle** grâce au Carnet Client 3D cloud.

---

## 2. Target User

### 2.1 Jobs To Be Done (JTBD)
- **Gérant / Barbier de Salon (Utilisateur Principal B2B)** :
  - *Fonctionnel* : Montrer de façon indiscutable le rendu final d'une coupe complexe (ex: Taper fade mid avec line-up) sur la morphologie spécifique du client.
  - *Économique* : Proposer et faire accepter des prestations complémentaires (upsell soin/barbe +2 000 FCFA) pour augmenter le panier moyen.
  - *Social* : Positionner son salon comme un établissement moderne, technologique et premium.
- **Client du Salon (Utilisateur Final B2C)** :
  - *Émotionnel & Confiance* : Lever la crainte de "manquer sa coupe" ou d'avoir une ligne de contours inadaptée à la forme de son crâne.
  - *Interactif* : Valider et ajuster au millimètre la hauteur des contours et la forme de sa barbe sur un miroir virtuel 3D.

### 2.2 Non-Users (v1)
- Salons bas de gamme à très faible volume (moins de 100 000 FCFA/mois de chiffre d'affaires).
- Clients finaux cherchant une application de retouche photo grand public sans visite en salon.

### 2.3 Key User Journeys (UJ)

#### UJ-1. Découverte Freemium & Essai du Rituel 3D
- **Persona & Contexte** : Awa, gérante d'un salon moderne à Abidjan, découvre Afrofade via la landing page sur son smartphone ou sa tablette.
- **État d'entrée** : Visiteur non authentifié, sur la route `/` ou `/rituel`.
- **Parcours** :
  1. Awa clique sur « Tester le rituel 1mn » dans la navbar ou le hero.
  2. Elle est redirigée vers le wizard 4 étapes (`/rituel`). Elle charge 3 photos d'essai.
  3. Le système effectue l'analyse IA (~2s). L'avatar 3D apparaît flouté avec la mention « Avatar verrouillé (Essai) ».
  4. Elle sélectionne une coupe Afro ("Short Locks High Top"). Le rendu s'applique sur l'avatar flouté.
  5. À l'étape 4 (Finition), un mur de connexion lui propose de s'inscrire (Google ou E-mail + Code OTP).
- **Climax** : Après inscription et complétion du profil salon (100%), Awa débloque une remise de −10% sur son 1er abonnement et découvre le rendu 3D HD déverrouillé.
- **Résolution** : Awa souscrit au Plan VIP (4 900 FCFA/mois) via Wave/Orange Money et accède à son Dashboard Salon.

#### UJ-2. Consultation "Le Rituel du Miroir" en Salon
- **Persona & Contexte** : Moussa, barbier chez Afrofade Barbershop à Dakar, reçoit un client indécis un vendredi soir à forte affluence.
- **État d'entrée** : Authentifié sur la tablette du salon, Plan VIP actif (quota 18/100 têtes utilisées).
- **Parcours** :
  1. Moussa ouvre le Studio 3D et prend 3 photos du client (Face, Profil G, Profil D).
  2. Il clique sur « Générer le Modèle 3D ». L'inférence FastAPI DECA/FLAME produit le maillage `.glb` personnalisé en < 2 secondes.
  3. La tête 3D interactive s'affiche sur la tablette. Le client fait tourner le modèle à 360° au doigt.
  4. Moussa sélectionne « Low Taper Fade » puis utilise la glissière « Line-Up Art » pour ajuster la hauteur des contours avec le client.
  5. Une suggestion d'upsell automatique apparaît : « Proposer Soin Barbe & Contours Razoir (+2 000 FCFA) ». Le client valide l'option.
- **Climax** : Le client valide la coupe en toute confiance avant le premier coup de ciseaux/tondeuse.
- **Résolution** : Moussa enregistre la fiche 3D dans le Carnet Client cloud du salon (Supabase Storage). Le compteur de quota passe à 19/100 têtes.

#### UJ-3. Gestion de l'Abonnement et Renouvellement Mobile Money
- **Persona & Contexte** : Awa arrive en fin de mois de souscription salon.
- **État d'entrée** : Authentifiée sur `/dashboard`, statut abonnement "Échéance imminente".
- **Parcours** :
  1. Awa reçoit une notification inline dans son dashboard indiquant que son plan expire dans 3 jours.
  2. Elle clique sur « Renouveler via Mobile Money ». La modale de paiement GeniusPay / Money Fusion s'affiche.
  3. Elle sélectionne son opérateur (Wave, Orange Money, MTN ou Moov) et saisit son numéro de téléphone.
  4. Elle valide la transaction Push USSD / OTP sur son téléphone portable.
- **Climax** : Le webhook `/api/webhooks/payment` confirme instantanément le paiement en arrière-plan.
- **Résolution** : Le quota mensuel de têtes est réinitialisé à 100/100 et la date d'échéance est prolongée de 30 jours.

---

## 3. Glossary

- **Le Rituel du Miroir** — L'expérience globale de consultation pré-coupe interactive en salon combinant modélisation 3D, choix de coiffure et ajustement des contours au miroir virtuel.
- **Tête 3D (Mesh Client)** — Fichier maillage 3D au format `.glb` optimisé (Draco/Meshopt), généré par l'IA à partir des 3-4 photos du client.
- **Line-Up Art** — Ajustement précis de la ligne de contours frontale et temporale sur le modèle 3D via une glissière numérique (0 à 100%).
- **Carnet Client 3D** — Espace de stockage cloud (Supabase Storage 1Go) permettant au salon d'enregistrer l'historique des têtes 3D et coupes préférées de ses clients.
- **Quota Mensuel** — Nombre maximal de reconstructions 3D autorisées par mois selon le plan souscrit (Pro: 30, VIP: 100, Extra: Illimité).
- **Upsell Prestation** — Recommandation visuelle intégrée à l'interface permettant au barbier de proposer un soin ou une taille de barbe complémentaire (+2 000 FCFA).
- **Mobile Money** — Moyens de paiement régionaux supportés pour les abonnements FCFA (Wave, Orange Money, MTN Mobile Money, Moov Money).

---

## 4. Features

### 4.1 Inférence & Reconstruction 3D (FastAPI ML Microservice)
**Description:** Service d'IA backend qui reçoit les URLs des photos du client et reconstruit le maillage 3D morphable personnalisé. Realizes UJ-1, UJ-2.

#### FR-1: Alignment & Morphing 3D
Le microservice FastAPI doit recevoir 3 à 4 URLs de photos, exécuter l'alignement des repères faciaux (landmarks) via le pipeline DECA/FLAME, et générer un fichier `.glb` compressé en moins de 2,0 secondes. Realizes UJ-2.
**Consequences (testable):**
- Le fichier `.glb` produit doit peser moins de 2,0 Mo.
- En cas de timeout ou d'erreur réseau, le client Next.js doit exécuter jusqu'à 3 retries automatiques sans planter l'interface salon.

#### FR-2: Normalisation des Teintes de Peau & Textures
Le modèle 3D doit restituer fidèlement les carnations et teints riches en mélanine (teintes foncées et chocolat) sans altération de couleur sous l'éclairage studio WebGL. Realizes UJ-2.

---

### 4.2 Studio 3D Canvas & Contrôles Tactiles (Next.js & R3F)
**Description:** Composant frontend interactif basé sur React Three Fiber permettant de manipuler la tête 3D et d'essayer les coiffures afro. Realizes UJ-1, UJ-2.

#### FR-3: Canvas WebGL Temps Réel
L'interface doit afficher le maillage 3D du client avec des contrôles tactiles fluides (OrbitControls) : rotation 360° au doigt, zoom pincé, et bascule d'éclairage (Salon, Studio, Chaleureux). Realizes UJ-2.
**Consequences (testable):**
- Le taux de rafraîchissement doit maintenir au minimum 45 FPS sur tablette (iPad / Android 10 pouces).
- Les cibles tactiles (boutons de contrôle) doivent respecter une dimension minimale de 44×44px.

#### FR-4: Superposition Dynamique des Coiffures Afro
Le barbier doit pouvoir cliquer sur n'importe quel style du catalogue (Fades, Short Locks, Cornrows, Afro Sponge, Barbe Sculptée) et voir la coiffure s'appliquer sur la tête 3D en moins de 500 ms. Realizes UJ-2.

#### FR-5: Glissière d'Ajustement Line-Up Art
L'interface doit proposer un slider réactif (0 à 100%) permettant de modifier en direct la hauteur et la netteté de la ligne d'implantation des cheveux sur le modèle 3D. Realizes UJ-2.

---

### 4.3 Catalogue de Coiffures Afro & Assistant Upsell
**Description:** Module de présentation des coupes et de maximisation du chiffre d'affaires du salon. Realizes UJ-2.

#### FR-6: Catalogue Filtrable des Coiffures
Le catalogue doit catégoriser les coiffures (Tous, Fades, Locks, Tresses, Afro, Barbe) avec des vignettes visuelles 100% fidèles aux modèles afro-africains. Realizes UJ-2.

#### FR-7: Déclencheur d'Upsell Prestation
Lorsqu'un style comprenant une barbe ou un travail de contours précis est sélectionné, l'application doit afficher une bannière suggérant au barbier d'ajouter l'option "Soin Barbe & Contours Razoir (+2 000 FCFA)" au ticket client. Realizes UJ-2.

---

### 4.4 Inscription, Profil Salon & Remises
**Description:** Parcours d'authentification et de complétion de profil avec système d'incitation financière. Realizes UJ-1.

#### FR-8: Authentification Simplifiée
Le salon doit pouvoir s'authentifier exclusivement via deux méthodes : Google OAuth, ou E-mail + Code OTP à 6 chiffres. Realizes UJ-1.

#### FR-9: Jauge de Complétion & Déblocage des Remises
Le Dashboard Salon doit afficher une barre de progression du profil (Nom du salon, Pays, Téléphone WhatsApp). Lorsque le profil atteint 100%, le salon débloque automatiquement les remises sur son 1er abonnement (-10% sur 3 mois, -25% sur 6 mois, -40% sur l'annuel). Realizes UJ-1.

---

### 4.5 Gestion des Quotas & Abonnements Mobile Money
**Description:** Moteur de facturation récurrente et de contrôle des accès RLS. Realizes UJ-1, UJ-3.

#### FR-10: Paliers d'Abonnement FCFA
Le système doit supporter 3 plans tarifaires :
- **PRO** : 2 200 FCFA/mois (Quota: 30 têtes/mois).
- **VIP** : 4 900 FCFA/mois (Quota: 100 têtes/mois + Carnet Client 1Go cloud + Téléchargement HD).
- **EXTRA** : 7 500 FCFA/mois (Quota illimité + Multi-postes + Branding personnalisé).

#### FR-11: Webhook de Paiement Mobile Money
Les paiements effectués via GeniusPay / Money Fusion (Wave, Orange Money, MTN, Moov) doivent déclencher le webhook `/api/webhooks/payment` pour mettre à jour instantanément le plan du salon et réinitialiser le quota le 1er de chaque mois. Realizes UJ-3.

#### FR-12: Isolation Row Level Security (RLS)
Chaque requête de base de données PostgreSQL/Supabase doit être strictement isolée par RLS pour garantir qu'un salon ne peut accéder qu'à ses propres fiches clients et statistiques (`salon_id = auth.uid()`).

---

## 5. Non-Goals (Explicit)

- **Pas d'application mobile native (iOS/Android store) en V1** : Afrofade est une PWA/Web App responsive optimisée pour les navigateurs des tablettes et smartphones salon.
- **Pas de module de réservation de rendez-vous en ligne en V1** : Afrofade se concentre exclusivement sur le Rituel du Miroir (consultation 3D et vente en salon).
- **Pas de comparaison "IA vs Réalité" post-coupe en V1** : Seule la phase de consultation pré-coupe interactive est couverte.
- **Pas de génération de texture par texte (Stable Diffusion Inpainting)** : Seules les coiffures 3D validées du catalogue officiel sont applicables.

---

## 6. MVP Scope

### 6.1 In Scope for MVP
- Landing page d'acquisition conforme au design crème/terracotta (`/`).
- Wizard d'essai freemium en 4 étapes avec gating d'authentification (`/rituel`).
- Microservice FastAPI d'inférence 3D (< 2s) avec retry automatique.
- Studio 3D Canvas WebGL avec contrôles 360°, lighting et slider Line-Up Art.
- Catalogue de 6 styles afro signés avec visuels de modèles noirs africains.
- Module d'Upsell (+2 000 FCFA) pour le barbier.
- Authentification Google + OTP E-mail.
- Dashboard Salon avec jauge de complétion du profil et calcul des remises.
- Paiement par Mobile Money (Wave, Orange Money, MTN, Moov) via Money Fusion / GeniusPay.
- Rétention des données non sauvegardées limitée à 30 jours.

### 6.2 Out of Scope for MVP (V2+)
- Mode 100% Offline (PWA Service Worker caching des assets GLB).
- Personnalisation complète des teintes de cheveux et teintures fantaisies.
- Export PDF co-brandé imprimable pour le client.
- Module de gestion des stocks de produits de soins du salon.

---

## 7. Success Metrics

### Primary
- **SM-1 (Taux de Conversion Essai → Payant)** : Atteindre ≥ 15% de conversion entre l'essai freemium du wizard `/rituel` et la souscription à un plan payant (Pro/VIP/Extra). Validates FR-8, FR-9, FR-11.
- **SM-2 (Vitesse d'Inférence 3D)** : Maintaining un temps moyen de génération de la tête 3D < 2,0 secondes sur le microservice FastAPI. Validates FR-1.

### Secondary
- **SM-3 (Adoption de l'Upsell Salon)** : ≥ 30% des sessions 3D en salon incluent au moins un clic d'ajout d'option upsell (+2 000 FCFA). Validates FR-7.
- **SM-4 (Satisfaction Fluidité 3D)** : Taux d'affichage temps réel ≥ 45 FPS sur les tablettes salons cibles. Validates FR-3.

### Counter-metrics (Do not optimize)
- **SM-C1 (Taux d'Échec Réseau au Retry)** : Ne pas sacrifier la qualité des maillages 3D pour réduire le temps de calcul en dessous de 1 seconde si cela dégrade la résolution faciale.

---

## 8. Conformité, Sécurité & Stockage (Adapt-In)

### 8.1 Données Biométriques & Conformité CEDEAO
Conformément à l'Acte Additionnel révisé de la CEDEAO sur la protection des données personnelles (et lois nationales type ARTCI / CDP) :
- Les photos de visages et maillages 3D sont classées données sensibles.
- Une bannière de consentement préalable doit être validée avant la prise de photo en salon.
- **Règle de rétention** : Toute tête 3D non enregistrée explicitement dans le Carnet Client permanent par le barbier est **automatiquement purgée au bout de 30 jours**.

### 8.2 Résilience Réseau Salon
En cas d'instabilité de la connexion internet du salon lors de l'envoi des photos à FastAPI :
- Le client Next.js exécute jusqu'à 3 tentatives automatiques (retry exponential backoff).
- Un message d'état clair et rassurant est affiché sur l'écran du salon ("Optimisation du signal réseau en cours...").

### 8.3 Stockage Supabase Cloud
- Le volume de stockage par salon est plafonné à 1 Go pour les plans VIP et Extra.
- Les fichiers `.glb` doivent obligatoirement être compressés via Draco avant stockage.

---

## 9. Open Questions

1. **Purge Supabase automatisée** : Faut-il configurer une Supabase Edge Function nocturne pour exécuter la suppression des fichiers temporaires âgés de plus de 30 jours ? *(Attribué à l'Architecte Winston)*.
2. **Support des tablettes très anciennes** : Faut-il prévoir un fallback de rendu 2D statique pour les tablettes Android sans support WebGL2 ? *(Attribué à Dev Amelia)*.

---

## 10. Assumptions Index

- `[ASSUMPTION: UEMOA-1]` Le paiement par Wave et Orange Money via GeniusPay/Money Fusion couvre plus de 90% des usages de paiement marchand dans les salons cibles en Afrique de l'Ouest.
- `[ASSUMPTION: PERF-1]` Un maillage 3D d'environ 1.5 Mo compressé en Draco suffit à garantir un rendu fluide sans saccade sur un iPad 9ème génération ou équivalent Android.
- `[ASSUMPTION: B2B-1]` Les gérants de salon sont prêts à payer 4 900 FCFA/mois s'ils constatent que l'outil leur permet de vendre au moins 2 ou 3 soins barbes upsell (+2 000 FCFA) par mois.
