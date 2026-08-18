---
title: 'Story 5.1: Intégration du Paiement Mobile Money via Money Fusion'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_commit: 8b2dd65
review_loop_iteration: 0
context:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md
  - {project-root}/_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Activer l'encaissement d'abonnements SaaS Afrofade (PRO, VIP, EXTRA) en FCFA via les réseaux Mobile Money régionaux (Wave, Orange Money, MTN, Moov) grâce à la passerelle Money Fusion.

**Approach:** 
1. Implémenter la route API `/api/v1/payments/money-fusion/checkout` générant l'URL de paiement Money Fusion avec le montant remisé en FCFA et les métadonnées du salon.
2. Créer la route Webhook / Callback `/api/v1/payments/money-fusion/callback` qui valide la signature, enregistre la transaction et active l'abonnement salon dans Supabase.
3. Fournir au coiffeur les paramètres exacts pour enregistrer l'application Afrofade sur la console Money Fusion.

## Boundaries & Constraints

**Always:** 
- Traiter tous les montants en FCFA (sans décimales).
- Vérifier le statut de la transaction côté serveur via le Webhook sécurisé avant d'activer l'abonnement.
- Rediriger vers le dashboard salon avec le statut de confirmation (`?payment=success`).

**Ask First:** 
- Modification des clés d'API Money Fusion (`MONEY_FUSION_API_KEY`, `MONEY_FUSION_URL`).

**Never:** 
- Valider un abonnement sans vérification du Webhook Money Fusion.
- Exposer la clé privée d'API Money Fusion côté client.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Inscription Forfait PRO (19 000 FCFA) | Clic sur "Souscrire via Money Fusion" | Génération du lien de paiement & redirection vers le guichet | Message d'erreur clair si l'API est temporairement indisponible |
| Notification Webhook de succès | Requête POST de Money Fusion avec `token` | Validation du statut, activation du plan dans `subscriptions` | Réponse HTTP 200 OK pour accuser réception |
| Paiement annulé par le client | Redirection vers l'URL de retour avec annulation | Affichage d'un toast d'information sur le dashboard | Annulation douce sans bloquer la réessaye |

</frozen-after-approval>

## Code Map

- `web/src/app/api/v1/payments/money-fusion/checkout/route.ts` -- Génération du guichet de paiement.
- `web/src/app/api/v1/payments/money-fusion/callback/route.ts` -- Webhook & enregistrement de la souscription.
- `web/src/lib/money-fusion.ts` -- Client SDK / Helper API Money Fusion.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/lib/money-fusion.ts` -- Implémenter le helper API Money Fusion -- Gère les appels checkout et vérification.
- [x] `web/src/app/api/v1/payments/money-fusion/checkout/route.ts` -- Créer la route d'initialisation de paiement -- Génère les sessions de paiement.
- [x] `web/src/app/api/v1/payments/money-fusion/callback/route.ts` -- Implémenter le webhook de callback -- Active automatiquement l'abonnement salon.

**Acceptance Criteria:**
- Given a salon clicking "Souscrire", when checkout triggered, then a valid Money Fusion payment URL is generated.
- Given successful payment on Money Fusion, when callback POST is received, then salon subscription is set to active.

## Design Notes

- URLs de retour : `https://<domaine>/dashboard?payment=success&provider=money_fusion`
- IP d'autorisation : Adresse IP du serveur de production.

## Verification

**Commands:**
- `npm run build` (dans `web/`) -- expected: Build Next.js réussi.
