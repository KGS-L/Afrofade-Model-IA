---
title: 'Story 4.1: Wizard Rituel 4 Étapes, Avatar 3D Flouté & Déverrouillage Freemium'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_commit: d497985
review_loop_iteration: 0
context:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md
  - {project-root}/_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Créer le tunnel de conversion principal de la plateforme Afrofade ("Le Rituel du Miroir"). Le wizard en 4 étapes doit charmer l'utilisateur tout en protégeant la valeur freemium : en mode visiteur, l'avatar 3D final est flouté avec un cadenas incitant à se connecter/s'inscrire pour déverrouiller l'export HD.

**Approach:** Optimiser le wizard 4 étapes dans `web/src/app/rituel/page.tsx` et l'effet de floutage freemium dans `web/src/components/AvatarCanvas.tsx`. Intercepter le clic "Révéler ma coiffure" pour déclencher la modale d'authentification Google OAuth / Email OTP.

## Boundaries & Constraints

**Always:** 
- Structurer le parcours en 4 étapes claires : 1. Upload photos -> 2. Reconstruction 3D -> 3. Choix coiffure -> 4. Finition HD.
- Masquer l'export HD de l'avatar en mode non connecté (`locked = true`).
- Proposer une expérience fluide sans blocage de l'animation 3D.

**Ask First:** 
- Modification des champs du profil utilisateur requis pour le déverrouillage.

**Never:** 
- Laisser un utilisateur télécharger l'image HD 3D sans être authentifié.
- Perdre l'état du choix de coiffure ou du slider line-up lors de l'ouverture de la modale de connexion.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Visiteur anonyme à l'Étape 4 | `user = null` | Avatar 3D recouvert d'un calque flou `backdrop-blur-md` avec cadenas | Bouton "Déverrouiller avec Google / Email" bien visible |
| Clic "Révéler la coiffure" | Action utilisateur | Ouverture de la modale de connexion sans recharger la page | Maintien de l'avatar 3D sélectionné en arrière-plan |
| Utilisateur connecté | `user != null` | Flou levé (`locked = false`), accès immédiat au téléchargement HD | Bouton "Enregistrer HD" actif |

</frozen-after-approval>

## Code Map

- `web/src/app/rituel/page.tsx` -- Wizard principal 4 étapes avec gestion de la modale freemium.
- `web/src/components/AvatarCanvas.tsx` -- Viewer Canvas avec calque de floutage et cadenas réactif.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/app/rituel/page.tsx` -- Finaliser le wizard 4 étapes et le déverrouillage freemium -- Offre un tunnel de conversion irrésistible.
- [x] `web/src/components/AvatarCanvas.tsx` -- Ajuster l'overlay de flou et le bouton cadenas -- Garantit la protection de la valeur premium.

**Acceptance Criteria:**
- Given an unauthenticated user on step 4, when viewing the final 3D render, then it is blurred with a lock overlay.
- Given "Révéler ma coiffure" clicked, when triggered, then the login modal pops up cleanly without losing selection.
- Given user logs in, when authenticated, then blur unlocks instantly showing high-res 3D avatar export.

## Design Notes

- Superposition de flou : `backdrop-blur-md bg-card/60 backdrop-saturate-150`.
- Animation d'ouverture : transition de déverrouillage avec icône cadenas ouvert `Unlock`.

## Verification

**Commands:**
- `npm run build` (dans `web/`) -- expected: Build Next.js réussi.

## Suggested Review Order

**Wizard Rituel 4 Étapes & Modale Freemium**

- Wizard 4 étapes et déverrouillage au clic
  [`page.tsx:400`](../../web/src/app/rituel/page.tsx#L400)

**Avatar Canvas Overlay Flouté**

- Overlay cadenas et flou freemium
  [`page.tsx:80`](../../web/src/app/rituel/page.tsx#L80)
