'use client';

import Link from 'next/link';
import { Menu, Scissors, X } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/discover', label: 'Découvrir' },
  { href: '/styles', label: 'Styles' },
  { href: '/discover?type=professional', label: 'Professionnels' },
  { href: '/discover?type=salon', label: 'Salons' },
  { href: '/pour-les-pros', label: 'Pour les pros' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur">
    <div className="max-w-container mx-auto px-4 sm:px-6 min-h-[68px] flex items-center gap-5">
      <Link href="/" onClick={()=>setOpen(false)} className="flex items-center gap-2.5 shrink-0" aria-label="Afrofade — accueil">
        <span className="w-10 h-10 rounded-card bg-terracotta text-white flex items-center justify-center"><Scissors className="w-5 h-5"/></span>
        <span className="font-display text-xl">Afro<span className="text-terracotta">fade</span></span>
      </Link>
      <nav className="hidden lg:flex items-center gap-1">{NAV_LINKS.map(item=><Link key={item.href} href={item.href} className="min-h-[44px] inline-flex items-center px-3 rounded-pill text-sm font-medium text-ink-soft hover:text-terracotta">{item.label}</Link>)}</nav>
      <div className="ml-auto flex items-center gap-2">
        <Link href="/connexion" className="hidden sm:inline-flex min-h-[44px] items-center px-3 text-sm font-medium text-ink-soft hover:text-terracotta">Se connecter</Link>
        <Link href="/rituel" className="min-h-[44px] inline-flex items-center rounded-pill bg-terracotta hover:bg-terracotta-dark px-4 sm:px-5 text-sm font-bold text-white">Essayer une coiffure</Link>
        <button className="lg:hidden w-11 h-11 rounded-pill border border-ink/15 bg-card flex items-center justify-center" onClick={()=>setOpen(v=>!v)} aria-label={open?'Fermer le menu':'Ouvrir le menu'}>{open?<X className="w-5 h-5"/>:<Menu className="w-5 h-5"/>}</button>
      </div>
    </div>
    {open&&<nav className="lg:hidden border-t border-ink/10 bg-card px-4 sm:px-6 py-3">{NAV_LINKS.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)} className="min-h-[48px] flex items-center px-3 rounded-input text-sm font-medium hover:bg-terracotta-wash">{item.label}</Link>)}<Link href="/connexion" onClick={()=>setOpen(false)} className="min-h-[48px] flex sm:hidden items-center px-3 rounded-input text-sm font-medium hover:bg-terracotta-wash">Se connecter</Link></nav>}
  </header>;
}
