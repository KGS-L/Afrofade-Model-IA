---
title: "Story 12.7 — Authenticated Workspace Shell & Context Switching"
status: in-dev
epic: 12
priority: M1
---

# Story 12.7

## Goal
Provide one authenticated workspace shell that can switch between personal, independent professional, salon and admin contexts without changing auth account/session.

## Mobile rule
On small smartphone breakpoints only:
- top header + hamburger/drawer exposes full active-context navigation;
- fixed bottom tab bar contains maximum four destinations;
- consumer: `Accueil | Découvrir | Rendez-vous | Profil`;
- professional: `Accueil | Agenda | Réservations | Profil Pro`;
- salon: `Accueil | Agenda | Réservations | Équipe`;
- admin: `Overview | Marketplace | Signalements | Menu`;
- larger screens use sidebar/top navigation and no bottom bar.

## Safety
- salon contexts come only from active memberships;
- role-specific menu visibility is based on membership role, never browser-selected privilege;
- context switching changes UI/data scope, not authentication;
- mutations still require explicit server-side context authorization;
- legacy `/account`, `/dashboard`, `/admin` remain available during migration.
