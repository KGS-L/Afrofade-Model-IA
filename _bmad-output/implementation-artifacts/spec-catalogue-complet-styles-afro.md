---
status: ready-for-dev
date: 2026-08-18
spec_file: _bmad-output/implementation-artifacts/spec-catalogue-complet-styles-afro.md
---

# Spec: Catalogue Complet des Styles Afro & Bouton « Voir tous les styles »

## Summary
Enrichissement de la section « Nos styles » de la landing page avec un bouton d'action principal « Voir tous les styles » et l'ouverture d'un catalogue interactif complet (Modal/Drawer) proposant 16+ modèles emblématiques de la coiffure afro/africaine (Fades, Locks, Tresses, Afro, Barbes).

## Intent
Permettre aux coiffeurs et clients d'explorer l'ensemble des coupes afro disponibles sur le marché, de les filtrer par catégorie/recherche, et de pouvoir directement les lancer dans l'expérience 3D « Le Rituel du Miroir ».

## Acceptance Criteria
1. **Bouton d'exploration** : Un bouton « Voir tous les styles » est présent sous la grille « Nos styles » sur la landing page.
2. **Catalogue enrichi** : Le catalogue contient au moins 16 styles afro classés par catégories (`Fades & Dégradés`, `Locks`, `Tresses & Cornrows`, `Afro & Twists`, `Barbe & Contours`).
3. **Recherche & Filtrage** : Le modal/catalogue permet de filtrer par mots-clés et par onglets de catégorie en temps réel.
4. **Action directe** : Chaque carte de style comporte un bouton « Tester dans le Rituel » qui redirige vers `/rituel` avec le style sélectionné.
5. **Accessibilité & Responsive** : Modal fermable via la touche Échap, bouton de fermeture ARIA, support tactile et mobile parfait.

## Code Map
- `web/src/components/HairstyleCatalog.tsx` : Contient `HAIRSTYLES_DATA` enrichi + composant réutilisable de la grille.
- `web/src/components/HairstyleCatalogModal.tsx` : Composant modal interactif avec recherche, onglets et animation.
- `web/src/app/page.tsx` : Intégration du bouton « Voir tous les styles » et déclenchement du modal.
