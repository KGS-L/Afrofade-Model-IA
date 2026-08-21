'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, MapPin, Scissors, Sparkles, UserRound } from 'lucide-react';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { useAuth } from '@/lib/auth';

type OperatingMode = 'independent' | 'mobile' | 'studio' | 'hybrid' | 'salon_only';
type JobSeeking = 'not_looking' | 'open' | 'actively_looking';

type FormState = {
  professionalName: string;
  slug: string;
  headline: string;
  bio: string;
  operatingMode: OperatingMode;
  city: string;
  neighborhood: string;
  serviceRadiusM: string;
  jobSeekingStatus: JobSeeking;
};

const initialForm: FormState = {
  professionalName: '', slug: '', headline: '', bio: '', operatingMode: 'independent',
  city: 'Ouagadougou', neighborhood: '', serviceRadiusM: '10000', jobSeekingStatus: 'not_looking',
};

export default function ProfessionalOnboardingPage() {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.replace('/connexion?next=/pro/onboarding'); return; }
    fetch('/api/professional/profile', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error('load_failed')))
      .then(({ profile }) => {
        if (!profile) return;
        setForm({
          professionalName: profile.professional_name || '', slug: profile.slug || '', headline: profile.headline || '',
          bio: profile.bio || '', operatingMode: profile.operating_mode || 'independent', city: profile.city || '',
          neighborhood: profile.neighborhood || '', serviceRadiusM: profile.service_radius_m == null ? '' : String(profile.service_radius_m),
          jobSeekingStatus: profile.job_seeking_status || 'not_looking',
        });
      })
      .catch(() => setError('Impossible de charger votre profil professionnel.'))
      .finally(() => setLoading(false));
  }, [hydrated, user, router]);

  const canContinue = useMemo(() => {
    if (step === 0) return form.professionalName.trim().length >= 2;
    if (step === 1) return Boolean(form.operatingMode && form.city.trim());
    return true;
  }, [step, form]);

  if (!hydrated || !user || loading) return <DashboardSkeleton />;

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const response = await fetch('/api/professional/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, serviceRadiusM: form.serviceRadiusM ? Number(form.serviceRadiusM) : null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally { setSaving(false); }
  };

  const steps = [
    { label: 'Identité', icon: UserRound },
    { label: 'Activité', icon: MapPin },
    { label: 'Carrière', icon: BriefcaseBusiness },
    { label: 'Aperçu', icon: Sparkles },
  ];

  return (
    <main className="min-h-screen bg-cream text-ink px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-bold text-ink-soft hover:text-terracotta"><ArrowLeft className="w-4 h-4"/>Retour</button>
          <div className="mt-5 flex items-center gap-3"><span className="w-11 h-11 rounded-full bg-terracotta text-white flex items-center justify-center"><Scissors className="w-5 h-5"/></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-terracotta">Afrofade Pro</p><h1 className="font-display text-3xl sm:text-4xl">Créez votre identité professionnelle</h1></div></div>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-ink-soft">Votre espace personnel reste intact. Ce profil ajoute simplement votre activité professionnelle au même compte Afrofade.</p>
        </header>

        <div className="grid grid-cols-4 gap-2 mb-6">
          {steps.map(({ label, icon: Icon }, index) => <div key={label} className={`rounded-input border px-2 py-3 text-center ${index === step ? 'border-terracotta bg-terracotta-wash' : index < step ? 'border-ink/10 bg-card' : 'border-ink/10 bg-transparent'}`}><Icon className={`w-4 h-4 mx-auto ${index <= step ? 'text-terracotta' : 'text-ink-soft'}`}/><span className="hidden sm:block mt-1 text-xs font-bold">{label}</span></div>)}
        </div>

        <section className="bg-card border border-ink/10 rounded-card shadow-soft p-5 sm:p-8">
          {step === 0 && <div className="space-y-5"><div><p className="font-hand text-xl text-terracotta">Votre signature</p><h2 className="font-display text-2xl">Comment les clients doivent-ils vous reconnaître ?</h2></div><label className="block text-xs font-bold">Nom professionnel<input value={form.professionalName} onChange={(e)=>setForm({...form,professionalName:e.target.value})} placeholder="Ex. Aïcha Hair" className="mt-1.5 w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal"/></label><label className="block text-xs font-bold">Identifiant public <span className="font-normal text-ink-soft">(facultatif)</span><input value={form.slug} onChange={(e)=>setForm({...form,slug:e.target.value})} placeholder="aicha-hair" className="mt-1.5 w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal"/></label><label className="block text-xs font-bold">Phrase de présentation<input value={form.headline} onChange={(e)=>setForm({...form,headline:e.target.value})} placeholder="Spécialiste tresses protectrices & knotless" className="mt-1.5 w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal"/></label><label className="block text-xs font-bold">Bio<textarea value={form.bio} onChange={(e)=>setForm({...form,bio:e.target.value})} rows={4} className="mt-1.5 w-full rounded-input border border-ink/15 bg-cream px-4 py-3 font-normal"/></label></div>}

          {step === 1 && <div className="space-y-5"><div><p className="font-hand text-xl text-terracotta">Votre activité</p><h2 className="font-display text-2xl">Où et comment travaillez-vous ?</h2></div><div className="grid sm:grid-cols-2 gap-3">{([['independent','À mon compte'],['mobile','Je me déplace'],['studio','Dans mon espace'],['hybrid','Plusieurs modes'],['salon_only','Uniquement en salon']] as const).map(([value,label])=><button type="button" key={value} onClick={()=>setForm({...form,operatingMode:value})} className={`text-left rounded-input border p-4 ${form.operatingMode===value?'border-terracotta bg-terracotta-wash':'border-ink/10'}`}><span className="font-bold">{label}</span>{form.operatingMode===value&&<Check className="w-4 h-4 text-terracotta float-right"/>}</button>)}</div><div className="grid sm:grid-cols-2 gap-4"><label className="block text-xs font-bold">Ville<input value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})} className="mt-1.5 w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal"/></label><label className="block text-xs font-bold">Quartier / zone<input value={form.neighborhood} onChange={(e)=>setForm({...form,neighborhood:e.target.value})} className="mt-1.5 w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal"/></label></div><label className="block text-xs font-bold">Rayon de service approximatif (mètres)<input type="number" min="0" max="500000" value={form.serviceRadiusM} onChange={(e)=>setForm({...form,serviceRadiusM:e.target.value})} className="mt-1.5 w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal"/></label><p className="text-xs text-ink-soft">Votre adresse privée exacte n’est pas demandée ici. La géolocalisation publique détaillée sera gérée séparément avec vos préférences de confidentialité.</p></div>}

          {step === 2 && <div className="space-y-5"><div><p className="font-hand text-xl text-terracotta">Votre carrière</p><h2 className="font-display text-2xl">Souhaitez-vous être visible pour des opportunités ?</h2></div>{([['not_looking','Pas pour le moment','Votre profil reste centré sur les clients.'],['open','Ouvert(e) aux opportunités','Les opportunités pertinentes pourront vous être proposées.'],['actively_looking','Je recherche activement','Afrofade pourra mettre davantage en avant les offres adaptées.']] as const).map(([value,title,desc])=><button type="button" key={value} onClick={()=>setForm({...form,jobSeekingStatus:value})} className={`block w-full text-left rounded-input border p-4 ${form.jobSeekingStatus===value?'border-terracotta bg-terracotta-wash':'border-ink/10'}`}><div className="flex justify-between gap-3"><div><p className="font-bold">{title}</p><p className="text-sm text-ink-soft mt-1">{desc}</p></div>{form.jobSeekingStatus===value&&<Check className="w-5 h-5 text-terracotta shrink-0"/>}</div></button>)}</div>}

          {step === 3 && <div className="space-y-6"><div><p className="font-hand text-xl text-terracotta">Aperçu</p><h2 className="font-display text-2xl">Votre profil professionnel prend forme.</h2></div><div className="rounded-card bg-cream border border-ink/10 p-5"><div className="w-14 h-14 rounded-full bg-terracotta-wash flex items-center justify-center text-terracotta"><Scissors className="w-6 h-6"/></div><h3 className="font-display text-2xl mt-4">{form.professionalName || 'Votre nom professionnel'}</h3><p className="text-sm text-ink-soft mt-1">{form.headline || 'Votre spécialité apparaîtra ici.'}</p><p className="text-sm mt-4">{form.bio || 'Ajoutez une bio pour raconter votre savoir-faire.'}</p><div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-pill bg-card border border-ink/10 px-3 py-1.5">{form.city}{form.neighborhood ? ` · ${form.neighborhood}` : ''}</span><span className="rounded-pill bg-card border border-ink/10 px-3 py-1.5">{form.operatingMode}</span></div></div><div className="rounded-input border border-terracotta/20 bg-terracotta-wash px-4 py-3 text-sm"><strong>Étapes suivantes :</strong> prestations, portfolio et agenda seront ajoutés à ce même profil au fil des prochaines briques marketplace.</div>{saved&&<div className="rounded-input border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Profil professionnel enregistré. Votre espace personnel existe toujours sur le même compte.</div>}</div>}

          {error && <div className="mt-5 rounded-input border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink/10 pt-5">
            <button type="button" disabled={step===0||saving} onClick={()=>setStep((s)=>Math.max(0,s-1))} className="min-h-[44px] px-4 rounded-pill border border-ink/15 font-bold disabled:opacity-40 inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4"/>Retour</button>
            {step<3 ? <button type="button" disabled={!canContinue} onClick={()=>setStep((s)=>Math.min(3,s+1))} className="min-h-[44px] px-5 rounded-pill bg-terracotta text-white font-bold disabled:opacity-40 inline-flex items-center gap-2">Continuer<ArrowRight className="w-4 h-4"/></button> : <button type="button" disabled={saving} onClick={save} className="min-h-[44px] px-5 rounded-pill bg-terracotta text-white font-bold disabled:opacity-50 inline-flex items-center gap-2">{saving?'Enregistrement…':'Enregistrer mon profil'}<Sparkles className="w-4 h-4"/></button>}
          </div>
        </section>
      </div>
    </main>
  );
}
