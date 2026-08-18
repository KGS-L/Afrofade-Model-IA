# Afrofade — Tâches Différées & Clôture UX/Produit

Tous les points différés identifiés dans les revues antérieures ont été traités et intégrés avec succès.

- [x] **Point 1 — Pages Légales & Liens Footer + Contact**
  - **Statut :** COMPLÉTÉ
  - **Réalisation :** Création des pages d'application `/legal/mentions-legales`, `/legal/confidentialite`, `/legal/cgv` et `/contact` (avec formulaire et bouton WhatsApp direct). Intégration du composant réutilisable `Footer.tsx` sur toute l'application.

- [x] **Point 2 — Drawer "Devis Coiffures" (Navbar)**
  - **Statut :** COMPLÉTÉ
  - **Réalisation :** Implémentation du composant `HairstyleQuoteDrawer.tsx` avec sélection de prestations, calcul du total FCFA, option Upsell Barbe & Contours (+2 000 FCFA), et export automatique vers WhatsApp & Fiche Client PDF.

- [x] **Point 3 — Métadonnées Web & Cartes Sociales**
  - **Statut :** COMPLÉTÉ
  - **Réalisation :** Configuration globale dans `layout.tsx` avec `metadataBase`, Open Graph cards (`og-image.png`), Twitter Cards, favicon/icons, et export `viewport` avec `themeColor: '#FAF6F1'`.

- [x] **Point 4 — Accessibilité WCAG 2.1 AA (Contrastes)**
  - **Statut :** COMPLÉTÉ
  - **Réalisation :** Ajustement des nuances Terracotta dans `tailwind.config.ts` (`#B8533D` pour le CTA principal et `#AB4E39` pour le texte), garantissant un ratio de contraste ≥ 4.6:1 (conforme WCAG 2.1 AA).
