- source_spec: `_bmad-output/implementation-artifacts/spec-landing-ux-cream-terracotta.md`
  summary: Pass design sur les contrastes CTA (blanc/terracotta ≈ 3.1:1) et accents terracotta sur crème (≈ 2.9:1) pour atteindre 4.5:1 sans casser l'identité validée.
  evidence: DESIGN.md impose 4.5:1 pour tout texte mais mandate aussi btn-primary blanc sur terracotta (repris des maquettes validées par Jonas-dev) — tension à trancher côté design.
- source_spec: `_bmad-output/implementation-artifacts/spec-landing-ux-cream-terracotta.md`
  summary: Compléter les métadonnées : favicon/app icon, Open Graph/Twitter cards, metadataBase, export viewport/themeColor crème.
  evidence: public/ ne contient que models/*.png ; aucun favicon n'existait avant ce changement (gap préexistant surfacé par la revue).
- source_spec: `_bmad-output/implementation-artifacts/spec-landing-ux-cream-terracotta.md`
  summary: Créer les pages/contact légaux (Mentions légales, Confidentialité, CGV) + un canal de contact (téléphone/e-mail/WhatsApp) — liens footer actuellement inertes.
  evidence: SaaS payant stockant des photos clients sans mentions légales ni contact ; les maquettes elles-mêmes laissaient ces liens morts (gap produit, pas code).
- source_spec: `_bmad-output/implementation-artifacts/spec-landing-ux-cream-terracotta.md`
  summary: Implémenter le drawer devis coiffures de la navbar (IA §1 EXPERIENCE.md).
  evidence: Feature à part entière (état panier d'essayages, CTA carte client) absente des tâches de la spec ; la recherche navbar est câblée au catalogue dans le patch, le drawer reste à construire.
