---
title: 'Story 1.2: Authentification Salon (Google OAuth & E-mail Code OTP)'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_commit: 13ebf72
review_loop_iteration: 0
context:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md
  - {project-root}/_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La page de connexion `/connexion` d'Afrofade est actuellement une maquette UI statique. Les gérants de salon ne peuvent pas encore se connecter via Google OAuth ou via la réception d'un code OTP à 6 chiffres par e-mail.

**Approach:** Connecter `web/src/lib/auth.tsx` à Supabase Auth (`signInWithOAuth` pour Google, `signInWithOtp` & `verifyOtp` pour e-mail), ajouter la route de callback OAuth `/api/auth/callback/route.ts`, et mettre à jour l'interface `/connexion/page.tsx` avec gestion du compte à rebours de renvoi d'OTP, gestion des états d'erreur et redirection dynamique vers le tableau de bord.

## Boundaries & Constraints

**Always:** 
- Supporter l'authentification Google OAuth et E-mail + Code OTP à 6 chiffres.
- Poser le cookie de session `afrofade_session` et `sb-access-token` lors d'une connexion réussie.
- Rediriger l'utilisateur vers la page spécifiée dans la query variable `?next=` ou par défaut vers `/dashboard`.

**Ask First:** 
- Ajout de nouveaux fournisseurs OAuth tierce partie (ex: Facebook, Apple).

**Never:** 
- Demander ou stocker des mots de passe complexes (l'authentification se fait sans mot de passe via OTP/OAuth).
- Laisser un utilisateur bloqué sans message d'erreur clair en cas d'échec du code OTP.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Envoi OTP e-mail | Saisie e-mail valide | Code OTP envoyé par Supabase, affichage du formulaire de saisie à 6 chiffres | Message toast d'erreur si e-mail invalide |
| Validation OTP réussi | Saisie du code à 6 chiffres correct | Session Supabase créée, cookie positionné, redirection `/dashboard` | Effacement de l'état d'erreur |
| Code OTP expiré / incorrect | Saisie d'un mauvais code | Reste sur le formulaire | Message "Code invalide ou expiré" affiché en rouge |
| Connexion Google OAuth | Clic sur "Continuer avec Google" | Redirection vers le consent screen Google | Redirection vers `/connexion?error=auth_failed` en cas d'annulation |

</frozen-after-approval>

## Code Map

- `web/src/lib/auth.tsx` -- Context Provider d'authentification React avec méthodes `signInWithGoogle`, `sendOtp`, `verifyOtp`, `signOut`.
- `web/src/app/api/auth/callback/route.ts` -- Route Handler Next.js pour échanger le code OAuth Supabase contre une session active.
- `web/src/app/connexion/page.tsx` -- Composant de la page de connexion avec les formulaires Google et OTP à 6 chiffres.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/lib/auth.tsx` -- Intégrer les fonctions Supabase Auth (`signInWithOAuth`, `signInWithOtp`, `verifyOtp`) -- Gère l'état global utilisateur.
- [x] `web/src/app/api/auth/callback/route.ts` -- Implémenter le callback OAuth -- Échange le code et pose les cookies de session.
- [x] `web/src/app/connexion/page.tsx` -- Relier l'UI au Context d'Auth avec les retours visuels -- Expérience de connexion fluide.

**Acceptance Criteria:**
- Given a salon manager on `/connexion`, when entering their email, then an OTP code is dispatched and a 6-digit input is revealed.
- Given a valid 6-digit OTP code entered, when submitting, then session cookies are set and user is redirected to `/dashboard`.
- Given a click on "Continuer avec Google", when authenticated by Google, then user lands on `/dashboard` authenticated.

## Design Notes

- Charte visuelle `/connexion` : Conserver la palette Crème (`#FAF6F1`), Terracotta (`#C7816F`), et les composants arrondis `rounded-2xl`.
- Pour le champ OTP : afficher 6 cases d'input numériques avec focus automatique sur la case suivante.

## Verification

**Commands:**
- `npm run build` (dans `web/`) -- expected: Build Next.js réussi.

## Suggested Review Order

**Gestion OAuth Callback**

- Route Handler d'échange de code OAuth
  [`route.ts:1`](../../web/src/app/api/auth/callback/route.ts#L1)

**Context d'Authentification Supabase**

- Client Auth Provider Supabase & Cookie Management
  [`auth.tsx:1`](../../web/src/lib/auth.tsx#L1)

**Interface de Connexion**

- Formulaire Google & Saisie OTP à 6 chiffres avec auto-advance
  [`page.tsx:1`](../../web/src/app/connexion/page.tsx#L1)
