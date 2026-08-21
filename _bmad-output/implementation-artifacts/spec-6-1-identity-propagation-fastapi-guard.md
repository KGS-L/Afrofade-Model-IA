---
title: 'Story 6.1 — User Identity Propagation & FastAPI Authorization Guard'
type: 'feature'
created: '2026-08-21'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'bfac8b35fa1b9f228059db80fddca4f2dc6e0fda'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les routes API 3D de FastAPI (`reconstruct`, `generate`, `export`) doivent garantir que chaque appel provient d'un utilisateur authentifié sur NextAuth.js avec un rôle valide, tout en bloquant les robots et les accès anonymes sans impacter la vitesse des lectures.

**Approach:** Implémenter le middleware/dépendance FastAPI `get_current_user` qui valide la signature du jeton `Authorization: Bearer <JWT>` NextAuth avec `NEXTAUTH_SECRET`. Rejeter avec un code `401 Unauthorized` toute requête non authentifiée sur les routes d'ingestion 3D, tout en maintenant un contournement sécurisé par secret HMAC (`API_INTERNAL_SECRET`) pour les webhooks système.

## Boundaries & Constraints

**Always:** Valider les jetons JWT NextAuth avec `NEXTAUTH_SECRET`; retourner un statut `401 Unauthorized` pour les jetons manquants, corrompus ou expirés; transmettre l'objet `AuthenticatedUser(user_id, email, role)` aux handlers FastAPI.

**Ask First:** Ajouter une dépendance vers un serveur OAuth distant ou une clé publique externe non configurable.

**Never:** Exposer les routes de génération 3D sans garde d'authentification ou secret HMAC valide.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ingestion 3D authentifiée | Request avec `Authorization: Bearer <valid_jwt>` | Identité décodée & accès autorisé au handler | Proceed to handler |
| Jeton absent ou vide | Request sans header Authorization | Rejet strict HTTP 401 | `401 Unauthorized` |
| Jeton invalide ou altéré | Request avec jeton corrompu | Rejet strict HTTP 401 | `401 Unauthorized` |
| Webhook interne | Request avec `X-Internal-Secret: <API_INTERNAL_SECRET>` | Accès autorisé pour le webhook système | `403 Forbidden` if secret invalid |

</frozen-after-approval>

## Code Map

- `api/services/auth/jwt_verifier.py` — Valideur et décodeur de jetons JWT NextAuth.js.
- `api/middleware/auth_guard.py` — Dépendance et middleware FastAPI `get_current_user` pour la protection des routes.
- `api/routes/` — Application du guard d'authentification sur les routes 3D.
- `api/scripts/validate_identity_propagation.py` — Harness de validation offline pour la propagation d'identité et le rejet strict 401.

## Tasks & Acceptance

**Execution:**
- [ ] `api/middleware/auth_guard.py` -- Créer le middleware/dépendance `get_current_user` qui décode les jetons JWT NextAuth et applique le rejet 401/403.
- [ ] `api/services/auth/jwt_verifier.py` -- Enrichir le vérificateur JWT avec l'extraction d'identité complète et la validation d'expiration.
- [ ] `api/routes/` -- Déployer `get_current_user` comme dépendance sur les routes d'ingestion/génération 3D.
- [ ] `api/scripts/validate_identity_propagation.py` -- Créer le script de test offline validant l'accès autorisé avec JWT et les rejets 401/403.

**Acceptance Criteria:**
- Given une requête avec un jeton NextAuth valide, when l'utilisateur appelle l'API 3D, then FastAPI décode l'identité et autorise l'exécution.
- Given une requête sans jeton ou avec un jeton invalide, when l'API 3D est appelée, then FastAPI retourne un statut `401 Unauthorized` immédiat.

## Verification

**Commands:**
- `python3 api/scripts/validate_identity_propagation.py` -- Harness de validation de la propagation d'identité et de la sécurité FastAPI.

## Suggested Review Order

**FastAPI Auth Guard & Identity Dependency**
- Implementation of get_current_user dependency and 401/403 HTTP Exception handling
  [`auth_guard.py:1`](../../api/middleware/auth_guard.py#L1)

**NextAuth JWT Verifier Engine**
- Decodes and verifies NextAuth JWT payload against shared secret
  [`jwt_verifier.py:1`](../../api/services/auth/jwt_verifier.py#L1)

**Offline Verification Suite**
- Validation test harness covering valid JWT, 401 Unauthorized rejection, and X-Internal-Secret system bypass
  [`validate_identity_propagation.py:1`](../../api/scripts/validate_identity_propagation.py#L1)

