'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3, BriefcaseBusiness, Building2, CalendarDays, ChevronDown, Compass, CreditCard,
  Flag, Home, Images, ListChecks, Menu, Scissors, Search, Settings, ShieldCheck, Star, UserRound,
  Users, WalletCards, X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';

type Context =
  | { key: 'personal'; type: 'personal'; id: null; label: string; role: 'customer' }
  | { key: string; type: 'professional'; id: string; label: string; role: 'professional'; verificationStatus: string; listingStatus: string }
  | { key: string; type: 'salon'; id: string; label: string; role: 'owner' | 'manager' | 'professional'; city: string | null; neighborhood: string | null }
  | { key: 'admin'; type: 'admin'; id: null; label: string; role: 'admin' };

type NavItem = { id: string; label: string; icon: typeof Home; href?: string };
const STORE_KEY = 'afrofade_workspace_context_v1';

const personalNav: NavItem[] = [
  { id: 'home', label: 'Accueil', icon: Home }, { id: 'discover', label: 'Découvrir', icon: Compass, href: '/discover' },
  { id: 'bookings', label: 'Rendez-vous', icon: CalendarDays }, { id: 'looks', label: 'Mes looks', icon: Images },
  { id: 'credits', label: 'Crédits', icon: WalletCards, href: '/account' }, { id: 'reviews', label: 'Mes avis', icon: Star },
  { id: 'profile', label: 'Profil', icon: UserRound, href: '/account' },
];
const proNav: NavItem[] = [
  { id: 'home', label: 'Accueil', icon: Home }, { id: 'calendar', label: 'Agenda', icon: CalendarDays },
  { id: 'bookings', label: 'Réservations', icon: ListChecks }, { id: 'profile', label: 'Profil public', icon: UserRound, href: '/pro/onboarding' },
  { id: 'portfolio', label: 'Portfolio', icon: Images }, { id: 'services', label: 'Prestations', icon: Scissors },
  { id: 'reviews', label: 'Avis', icon: Star }, { id: 'careers', label: 'Carrière', icon: BriefcaseBusiness },
  { id: 'analytics', label: 'Statistiques', icon: BarChart3 }, { id: 'subscription', label: 'Abonnement', icon: CreditCard },
];
const adminNav: NavItem[] = [
  { id: 'home', label: 'Overview', icon: Home, href: '/admin' }, { id: 'marketplace', label: 'Marketplace', icon: Compass },
  { id: 'reports', label: 'Signalements', icon: Flag }, { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'professionals', label: 'Professionnels', icon: Scissors }, { id: 'salons', label: 'Salons', icon: Building2 },
  { id: 'bookings', label: 'Réservations', icon: CalendarDays }, { id: 'careers', label: 'Careers', icon: BriefcaseBusiness },
  { id: 'finance', label: 'Finance', icon: CreditCard }, { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

function salonNav(role: Context extends { type: 'salon' } ? never : never): NavItem[] { return []; }
function getSalonNav(role: 'owner' | 'manager' | 'professional'): NavItem[] {
  const base: NavItem[] = [
    { id: 'home', label: 'Vue d’ensemble', icon: Home }, { id: 'calendar', label: 'Agenda', icon: CalendarDays },
    { id: 'bookings', label: 'Réservations', icon: ListChecks }, { id: 'team', label: 'Équipe', icon: Users },
    { id: 'services', label: 'Prestations', icon: Scissors }, { id: 'portfolio', label: 'Portfolio', icon: Images },
  ];
  if (role !== 'professional') base.push(
    { id: 'clients', label: 'Clients', icon: UserRound }, { id: 'reviews', label: 'Avis', icon: Star },
    { id: 'recruitment', label: 'Recrutement', icon: BriefcaseBusiness }, { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'billing', label: 'Facturation', icon: CreditCard }, { id: 'settings', label: 'Paramètres', icon: Settings },
  );
  return base;
}

function navFor(context: Context): NavItem[] {
  if (context.type === 'personal') return personalNav;
  if (context.type === 'professional') return proNav;
  if (context.type === 'salon') return getSalonNav(context.role);
  return adminNav;
}
function bottomFor(context: Context): NavItem[] {
  if (context.type === 'personal') return [personalNav[0], personalNav[1], personalNav[2], personalNav[6]];
  if (context.type === 'professional') return [proNav[0], proNav[1], proNav[2], proNav[3]];
  if (context.type === 'salon') {
    const nav = getSalonNav(context.role);
    return [nav.find(x=>x.id==='home')!, nav.find(x=>x.id==='calendar')!, nav.find(x=>x.id==='bookings')!, nav.find(x=>x.id==='team')!];
  }
  return [adminNav[0], adminNav[1], adminNav[2], { id: 'menu', label: 'Menu', icon: Menu }];
}

function SectionBody({ context, section }: { context: Context; section: string }) {
  const title = navFor(context).find((item) => item.id === section)?.label || 'Accueil';
  const description = context.type === 'personal'
    ? 'Votre espace personnel Afrofade : rendez-vous, looks, crédits et découvertes.'
    : context.type === 'professional'
      ? 'Votre activité indépendante, votre savoir-faire et vos réservations.'
      : context.type === 'salon'
        ? `Contexte ${context.label} · accès ${context.role}.`
        : 'Centre de contrôle de la marketplace Afrofade.';
  return <div className="space-y-6"><div><p className="text-xs uppercase tracking-[.14em] font-bold text-terracotta">{context.label}</p><h1 className="font-display text-3xl sm:text-4xl mt-1">{title}</h1><p className="text-ink-soft mt-2 max-w-2xl">{description}</p></div><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{['Aujourd’hui','À suivre','Activité'].map((label,index)=><div key={label} className="bg-card border border-ink/10 rounded-card p-5 shadow-soft"><p className="text-xs font-bold uppercase tracking-[.12em] text-ink-soft">{label}</p><p className="font-display text-2xl mt-3">{index===0?'Bienvenue 👋':'Bientôt connecté'}</p><p className="text-sm text-ink-soft mt-2">Les données fonctionnelles de cette section seront branchées par les stories dédiées sans changer ce shell.</p></div>)}</div></div>;
}

export default function WorkspaceShell() {
  const router = useRouter();
  const search = useSearchParams();
  const { user, hydrated } = useAuth();
  const [contexts, setContexts] = useState<Context[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const requestedKey = search.get('context');
  const section = search.get('section') || 'home';

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.replace('/connexion?next=/workspace'); return; }
    fetch('/api/workspace/contexts', { cache: 'no-store' }).then(async r => {
      if (!r.ok) throw new Error('contexts_failed');
      return r.json();
    }).then(data => setContexts(data.contexts || [])).catch(()=>setContexts([])).finally(()=>setLoading(false));
  }, [hydrated,user,router]);

  const active = useMemo(() => {
    if (!contexts.length) return null;
    if (requestedKey) {
      const match = contexts.find(c=>c.key===requestedKey);
      if (match) return match;
    }
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORE_KEY);
      const match = contexts.find(c=>c.key===stored);
      if (match) return match;
    }
    return contexts.find(c=>c.key==='personal') || contexts[0];
  }, [contexts,requestedKey]);

  useEffect(()=>{
    if (!active) return;
    try { window.localStorage.setItem(STORE_KEY,active.key); } catch {}
    if (!requestedKey) router.replace(`/workspace?context=${encodeURIComponent(active.key)}&section=${encodeURIComponent(section)}`);
  },[active,requestedKey,router,section]);

  if (!hydrated || !user || loading || !active) return <DashboardSkeleton />;
  const nav = navFor(active);
  const bottom = bottomFor(active);

  const go = (item: NavItem) => {
    if (item.id === 'menu') { setDrawer(true); return; }
    setDrawer(false);
    if (item.href) { router.push(item.href); return; }
    router.push(`/workspace?context=${encodeURIComponent(active.key)}&section=${encodeURIComponent(item.id)}`);
  };
  const switchContext = (key: string) => {
    setDrawer(false);
    router.push(`/workspace?context=${encodeURIComponent(key)}&section=home`);
  };

  return <div className="min-h-screen bg-cream text-ink sm:flex">
    <aside className="hidden sm:flex w-64 lg:w-72 shrink-0 min-h-screen border-r border-ink/10 bg-card p-4 lg:p-5 flex-col sticky top-0 h-screen">
      <div className="flex items-center gap-2 font-display text-2xl"><span className="w-9 h-9 rounded-full bg-terracotta text-white flex items-center justify-center"><Scissors className="w-4 h-4"/></span>Afrofade</div>
      <div className="relative mt-6"><select aria-label="Changer d’espace" value={active.key} onChange={(e)=>switchContext(e.target.value)} className="w-full appearance-none rounded-input border border-ink/10 bg-cream py-3 pl-3 pr-9 text-sm font-bold">{contexts.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 w-4 h-4 text-ink-soft"/></div>
      <nav className="mt-5 space-y-1 overflow-y-auto pb-4">{nav.map(item=><button key={item.id} onClick={()=>go(item)} className={`w-full min-h-[44px] rounded-input px-3 flex items-center gap-3 text-sm text-left ${section===item.id&&!item.href?'bg-terracotta-wash text-terracotta font-bold':'hover:bg-cream'}`}><item.icon className="w-4 h-4 shrink-0"/>{item.label}</button>)}</nav>
    </aside>

    <div className="flex-1 min-w-0 pb-24 sm:pb-0">
      <header className="sm:hidden sticky top-0 z-30 bg-cream/95 backdrop-blur border-b border-ink/10 px-4 min-h-[58px] flex items-center justify-between gap-3"><button onClick={()=>setDrawer(true)} aria-label="Ouvrir le menu" className="w-11 h-11 rounded-full flex items-center justify-center"><Menu className="w-5 h-5"/></button><div className="min-w-0 text-center"><p className="text-[10px] uppercase tracking-[.12em] text-terracotta font-bold">Espace actuel</p><p className="text-sm font-bold truncate">{active.label}</p></div><span className="w-11 h-11 rounded-full bg-terracotta-wash text-terracotta flex items-center justify-center"><Scissors className="w-4 h-4"/></span></header>
      <main className="px-4 sm:px-7 lg:px-10 py-7 sm:py-10 max-w-7xl mx-auto"><SectionBody context={active} section={section}/></main>
    </div>

    <nav aria-label="Raccourcis de l’espace" className="sm:hidden fixed z-40 bottom-0 left-0 right-0 bg-card border-t border-ink/10 px-2 pt-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] grid grid-cols-4">{bottom.slice(0,4).map(item=><button key={item.id} onClick={()=>go(item)} className={`min-h-[54px] rounded-input flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${section===item.id&&!item.href?'text-terracotta':'text-ink-soft'}`}><item.icon className="w-5 h-5"/><span className="truncate max-w-[72px]">{item.label}</span></button>)}</nav>

    {drawer&&<div className="sm:hidden fixed inset-0 z-50 bg-ink/35" onClick={()=>setDrawer(false)}><div className="h-full w-[88%] max-w-sm bg-card p-4 overflow-y-auto" onClick={(e)=>e.stopPropagation()}><div className="flex items-center justify-between"><div className="font-display text-2xl">Afrofade</div><button onClick={()=>setDrawer(false)} className="w-11 h-11 rounded-full flex items-center justify-center"><X className="w-5 h-5"/></button></div><div className="mt-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-ink-soft mb-2">Changer d’espace</p><div className="space-y-2">{contexts.map(c=><button key={c.key} onClick={()=>switchContext(c.key)} className={`w-full text-left rounded-input border p-3 ${c.key===active.key?'border-terracotta bg-terracotta-wash':'border-ink/10'}`}><span className="font-bold text-sm">{c.label}</span>{c.type==='salon'&&<span className="block text-xs text-ink-soft mt-1">{c.role}</span>}</button>)}</div></div><div className="mt-6 border-t border-ink/10 pt-4 space-y-1">{nav.map(item=><button key={item.id} onClick={()=>go(item)} className="w-full min-h-[46px] rounded-input px-3 flex items-center gap-3 text-sm text-left hover:bg-cream"><item.icon className="w-4 h-4"/>{item.label}</button>)}</div></div></div>}
  </div>;
}
