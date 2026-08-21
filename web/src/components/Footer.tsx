'use client';

import Link from 'next/link';

const groups = [
  { title: 'DÉCOUVRIR', links: [['Styles','/styles'],['Professionnels','/discover?type=professional'],['Salons','/discover?type=salon'],['Près de chez moi','/discover']] },
  { title: 'AFROFADE', links: [['Try-On','/rituel'],['Comment ça marche','/#comment-ca-marche'],['Tarifs','/#offres']] },
  { title: 'PROFESSIONNELS', links: [['Pour les pros','/pour-les-pros'],['Créer mon profil pro','/pro/onboarding'],['Carrières','/careers']] },
  { title: 'AIDE', links: [['FAQ','/#faq'],['Contact','/contact'],['Confidentialité','/legal/confidentialite'],['CGV','/legal/cgv']] },
];

export function Footer() {
  return <footer className="bg-night text-white mt-auto">
    <div className="max-w-container mx-auto px-6 py-14 grid sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)] gap-9">
      <div><Link href="/" className="font-display text-[26px]">Afro<span className="text-terracotta">fade</span></Link><p className="mt-3 text-sm leading-relaxed text-white/65 max-w-[34ch]">Découvrez votre prochain style. Trouvez le talent qui saura le réaliser.</p></div>
      {groups.map(group=><nav key={group.title} aria-label={group.title}><h4 className="text-xs font-bold tracking-[.16em] text-white/45 mb-4">{group.title}</h4><ul className="space-y-2.5 text-sm text-white/80">{group.links.map(([label,href])=><li key={href}><Link href={href} className="hover:text-terracotta">{label}</Link></li>)}</ul></nav>)}
    </div>
    <div className="max-w-container mx-auto px-6 border-t border-white/10 py-5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-white/45"><span>© {new Date().getFullYear()} Afrofade — Tous droits réservés</span><span>Coiffure, barbe, talents et styles d’Afrique.</span></div>
  </footer>;
}
