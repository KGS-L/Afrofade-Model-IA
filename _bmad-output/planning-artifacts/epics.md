---
stepsCompleted:
  - "step-01-validate-prerequisites"
inputDocuments:
  - "_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-18/prd.md"
  - "_bmad-output/architecture/architecture-Afrofade-2026-08-17/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Afrofade-2026-08-17/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Afrofade-2026-08-17/EXPERIENCE.md"
---

# Afrofade - Epic & Story Breakdown

## Overview

Ce document fournit le découpage complet des Epics et User Stories pour le projet Afrofade. Il décompose les exigences du PRD, les décisions d'architecture (Next.js + FastAPI + Supabase + Money Fusion) et la charte UX/UI crème/terracotta en stories directement implémentables.

---

## Requirements Inventory

### Functional Requirements

- **FR-1**: Alignment & Morphing 3D (FastAPI DECA/FLAME, `.glb` < 2 Mo en < 2,0s, retry automatique ×3)
- **FR-2**: Normalisation des Teintes de Peau & Textures (rendu fidèle mélanine / teints foncés)
- **FR-3**: Canvas WebGL Temps Réel (R3F, OrbitControls 360°, lighting, ≥ 45 FPS, cibles tactiles ≥ 44px)
- **FR-4**: Superposition Dynamique des Coiffures Afro (Fades, Locks, Tresses, Afro, Barbe en < 500 ms)
- **FR-5**: Glissière d'Ajustement Line-Up Art (slider 0-100% contours frontaux/temporaux)
- **FR-6**: Catalogue Filtrable des Coiffures (catégories, vignettes visuels afro-africains)
- **FR-7**: Déclencheur d'Upsell Prestation (bannière soin barbe/contours +2 000 FCFA)
- **FR-8**: Authentification Simplifiée (Google OAuth + E-mail Code OTP 6 chiffres)
- **FR-9**: Jauge de Complétion & Déblocage des Remises (-10%, -25%, -40% au déblocage 100% profil)
- **FR-10**: Paliers d'Abonnement FCFA (PRO 2 200, VIP 4 900, EXTRA 7 500 FCFA/mois)
- **FR-11**: Webhook de Paiement Mobile Money (GeniusPay/Money Fusion, Wave, Orange, MTN, Moov)
- **FR-12**: Isolation Row Level Security (RLS) (`salon_id = auth.uid()`)

### NonFunctional Requirements

- **NFR-1**: Conformité Biométrique CEDEAO — Purge automatique à 30 jours des têtes temporaires + consentement préalable.
- **NFR-2**: Résilience Réseau Salon — Exponential backoff retry ×3 sur les appels FastAPI.
- **NFR-3**: Quotas & Stockage Supabase — Plafond 1 Go par salon VIP/Extra, compression Draco `.glb`.
- **NFR-4**: Performance WebGL — Fluidité ≥ 45 FPS sur tablettes salon (iPad / Android 10").

### Additional Requirements (Architecture)

- **ARCH-1**: Monorepo Hybride (Next.js 14 App Router + FastAPI Python 3.11+).
- **ARCH-2**: Shared JWT Bearer Secret entre Next.js et FastAPI.
- **ARCH-3**: Schema PostgreSQL (`salons`, `subscriptions`, `clients_heads`, `hairstyles_catalog`).
- **ARCH-4**: Presigned URLs Supabase Storage pour upload direct des photos salon.

### UX Design Requirements (UX Contracts)

- **UX-DR1**: Palette Crème (`#FAF6F1`), Terracotta (`#C7816F`), Ink (`#1F1B17`).
- **UX-DR2**: Cibles tactiles ≥ 44px (tablettes salon).
- **UX-DR3**: Wizard `/rituel` 4 étapes avec gating freemium (avatar flouté).
- **UX-DR4**: Contrôles 3D en surimpression discrète sur le canvas.
- **UX-DR5**: Conformité contrastes WCAG 2.1 AA 4.5:1.

---

## FR Coverage Map

*(Sera complété à l'étape 2)*

---

## Epic List

1. **Epic 1**: Socle Technique, Authentification Salon & RLS Data Schema
2. **Epic 2**: Moteur d'Inférence 3D FastAPI & Ingestion des Photos (DECA/FLAME)
3. **Epic 3**: Studio 3D Canvas WebGL, Coiffures & Line-Up Art (R3F)
4. **Epic 4**: Parcours Freemium `/rituel`, Gating & Complétion Profil Salon
5. **Epic 5**: Facturation Mobile Money (Money Fusion / GeniusPay) & Dashboard Admin

---

## Epic 1: Socle Technique, Authentification Salon & RLS Data Schema

**Goal**: Établir la base de données Supabase, la sécurité RLS, les schémas PostgreSQL et le flux d'authentification Google/OTP.

### Story 1.1: Schéma de Base de Données PostgreSQL & Middleware de Sécurité Next.js
As a Developer,
I want to establish the PostgreSQL database schema (`salons`, `subscriptions`, `clients_heads`, `hairstyles_catalog`) and Next.js middleware access control,
So that Next.js securely handles all salon authentication, quota checks, and data isolation.

**Acceptance Criteria:**
**Given** a PostgreSQL database (Supabase/Postgres)
**When** the migration script runs
**Then** tables `salons`, `subscriptions`, `clients_heads`, `hairstyles_catalog` are created
**And** Next.js middleware/API routes verify `salon_id` on every protected request.

### Story 1.2: Authentification Salon (Google OAuth & E-mail Code OTP)
As a Salon Manager,
I want to log in quickly using Google or E-mail + OTP code,
So that I can access my salon dashboard without remembering complex passwords.

**Acceptance Criteria:**
**Given** an unauthenticated salon user on `/connexion`
**When** they choose Google or submit their e-mail for OTP
**Then** Supabase Auth returns a valid session JWT
**And** redirects to `/dashboard` or the saved `?next=` URL.

---

## Epic 2: Moteur d'Inférence 3D FastAPI & Ingestion des Photos (DECA/FLAME)

**Goal**: Connecter l'API FastAPI Python pour transformer les 3-4 photos du client en un maillage 3D `.glb` optimisé en < 2 secondes.

### Story 2.1: Ingestion des Photos via Supabase Presigned URLs
As a Barbier,
I want to upload 3-4 client photos directly to Supabase Storage,
So that the server doesn't get overloaded with heavy image payloads.

**Acceptance Criteria:**
**Given** 3 to 4 client photos selected in the app
**When** upload is triggered
**Then** presigned URLs are requested from Next.js and uploaded directly to Supabase Storage bucket `client-photos`.

### Story 2.2: Endpoint FastAPI `/v1/reconstruct` & Export Draco `.glb`
As an ML Engineer,
I want the FastAPI service to process image URLs, fit the DECA/FLAME morphable model, and output a Draco-compressed `.glb` mesh in under 2 seconds,
So that the client 3D head is ready for instant preview.

**Acceptance Criteria:**
**Given** valid photo URLs sent to `POST /v1/reconstruct`
**When** FastAPI executes inference
**Then** a `.glb` mesh under 2 MB is returned
**And** inter-service auth is verified via Shared JWT secret.

### Story 2.3: Résilience Réseau & Purge Biométrique à 30 jours
As a Salon Manager,
I want network retries on 3D generation and automatic 30-day purge of temporary client heads,
So that internet drops don't break consultations and CEDEAO data privacy is respected.

**Acceptance Criteria:**
**Given** a network drop during 3D reconstruction
**When** Next.js receives a timeout
**Then** it retries up to 3 times with exponential backoff
**And** a scheduled cron/edge function deletes unsaved `clients_heads` older than 30 days.

---

## Epic 3: Studio 3D Canvas WebGL, Coiffures & Line-Up Art (R3F)

**Goal**: Implémenter le viewer 3D interactif avec React Three Fiber, le catalogue de coupes afro et la glissière *Line-Up Art*.

### Story 3.1: Viewer 3D React Three Fiber (R3F) & Contrôles Tactiles
As a Barbier,
I want to rotate and inspect the client's 3D head at 360° on a tablet,
So that the client can examine their prospective haircut from every angle.

**Acceptance Criteria:**
**Given** a loaded `.glb` head model in `Studio3DCanvas`
**When** touched/dragged on mobile/tablet
**Then** OrbitControls allow smooth 360° rotation and zoom maintaining ≥ 45 FPS.

### Story 3.2: Application Dynamique des Coiffures Afro (< 500 ms)
As a Barbier,
I want to tap a hairstyle in the catalog and see it snap onto the 3D head,
So that we can compare styles instantly.

**Acceptance Criteria:**
**Given** a 3D head canvas
**When** a style (Fade, Locks, Tresses, Barbe) is selected from `HairstyleCatalog`
**Then** the corresponding 3D hair asset snaps onto the head mesh within 500 ms.

### Story 3.3: Glissière d'Ajustement Line-Up Art & Suggestion Upsell
As a Barbier,
I want to adjust hairline contours with a slider and trigger upsell suggestions,
So that I can customize the haircut and increase average ticket size by +2 000 FCFA.

**Acceptance Criteria:**
**Given** an active 3D hairstyle
**When** adjusting the Line-Up slider (0-100%)
**Then** the hairline geometry updates in real-time
**And** an upsell banner "+2 000 FCFA (Soin Barbe & Contours Razoir)" is displayed.

---

## Epic 4: Parcours Freemium `/rituel`, Gating & Complétion Profil Salon

**Goal**: Implémenter le wizard d'essai en 4 étapes avec avatar flouté et incitation aux remises premier abonnement (-10%, -25%, -40%).

### Story 4.1: Wizard `/rituel` 4 Étapes & Avatar 3D Flouté (Freemium)
As a Prospect Salon,
I want to test the 4-step Ritual workflow with a blurred preview before signing up,
So that I can see the value of the tool before subscribing.

**Acceptance Criteria:**
**Given** an unauthenticated visitor on `/rituel`
**When** completing steps 1 to 4
**Then** step 2/3 displays a blurred avatar ("Avatar Verrouillé")
**And** step 4 triggers a sign-up modal to reveal HD quality.

### Story 4.2: Dashboard Salon, Jauge de Profil 100% & Calcul des Remises
As a Salon Manager,
I want to see my profile completion percentage and unlock subscription discounts,
So that I am incentivized to fill out my salon details.

**Acceptance Criteria:**
**Given** a logged-in salon on `/dashboard`
**When** salon name, country, and WhatsApp phone are filled (100% completion)
**Then** discount badges (-10% for 3 months, -25% for 6 months, -40% for 1 year) are unlocked for the first subscription.

---

## Epic 5: Facturation Mobile Money (Money Fusion / GeniusPay) & Dashboard Admin

**Goal**: Intégrer les webhooks de paiement locaux (Wave, Orange Money, MTN, Moov) et les statistiques d'administration.

### Story 5.1: Webhook GeniusPay / Money Fusion & Gestion des Quotas
As a System,
I want to process Mobile Money payment webhooks and reset monthly quotas,
So that salon subscriptions are renewed automatically without manual intervention.

**Acceptance Criteria:**
**Given** a successful Mobile Money transaction via GeniusPay/Money Fusion
**When** `POST /api/webhooks/payment` receives valid payload
**Then** `subscriptions` status is updated to `active`
**And** salon `quota_used` is reset to 0 on the 1st of the month.

### Story 5.2: Dashboard Administrateur (KPIs SaaS & MRR FCFA)
As an Admin,
I want to view total registered salons, active subscriptions, and MRR in FCFA on `/admin`,
So that I can monitor the SaaS platform growth.

**Acceptance Criteria:**
**Given** an authenticated admin user on `/admin`
**When** viewing the dashboard
**Then** KPIs for Registered Salons, Active Plans, Trial-to-Paid Conversion %, and Total MRR in FCFA are displayed.
