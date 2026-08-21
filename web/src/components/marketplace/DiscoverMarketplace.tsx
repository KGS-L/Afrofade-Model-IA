'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, CheckCircle2, LocateFixed, MapPin, Search, Scissors, SlidersHorizontal } from 'lucide-react';

type ProviderResult = {
  provider_type: 'salon' | 'professional'; provider_id: string; slug: string | null; display_name: string;
  city: string | null; neighborhood: string | null; distance_m: number | null; matched_service_id: string;
  matched_service_name: string; matched_service_price: number; currency: string; matched_style_slug: string | null; rank_score: number;
};
type Taxonomy = { id: string; slug: string; kind: 'category' | 'style' | 'skill'; parent_id: string | null; label_fr: string };

export default function DiscoverMarketplace() {
  const router=useRouter(); const search=useSearchParams();
  const [q,setQ]=useState(search.get('q')||''); const [city,setCity]=useState(search.get('city')||'Ouagadougou');
  const [style,setStyle]=useState(search.get('style')||''); const [type,setType]=useState(search.get('type')||'all');
  const [coords,setCoords]=useState<{lat:number;lng:number}|null>(null); const [locating,setLocating]=useState(false);
  const [taxonomy,setTaxonomy]=useState<Taxonomy[]>([]); const [results,setResults]=useState<ProviderResult[]>([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);

  useEffect(()=>{fetch('/api/marketplace/taxonomy').then(r=>r.json()).then(d=>setTaxonomy(d.taxonomy||[])).catch(()=>{});},[]);
  const styles=useMemo(()=>taxonomy.filter(item=>item.kind==='style'),[taxonomy]);

  const runSearch=async(paramsOverride?:{q?:string;city?:string;style?:string;type?:string;coords?:{lat:number;lng:number}|null})=>{
    const next={q:paramsOverride?.q??q,city:paramsOverride?.city??city,style:paramsOverride?.style??style,type:paramsOverride?.type??type,coords:paramsOverride?.coords===undefined?coords:paramsOverride.coords};
    setLoading(true); setError(null);
    try{
      const params=new URLSearchParams(); if(next.q)params.set('q',next.q); if(next.style)params.set('style',next.style); if(next.type&&next.type!=='all')params.set('type',next.type);
      if(next.coords){params.set('lat',String(next.coords.lat));params.set('lng',String(next.coords.lng));params.set('radius','25000');} else if(next.city) params.set('city',next.city);
      const response=await fetch(`/api/marketplace/discover?${params}`,{cache:'no-store'}); const data=await response.json(); if(!response.ok)throw new Error(data.error||'Recherche impossible.');
      setResults(data.results||[]);
      const url=new URLSearchParams(); if(next.q)url.set('q',next.q); if(next.style)url.set('style',next.style); if(next.type&&next.type!=='all')url.set('type',next.type); if(!next.coords&&next.city)url.set('city',next.city);
      router.replace(`/discover?${url.toString()}`,{scroll:false});
    }catch(e){setError(e instanceof Error?e.message:'Recherche impossible.');setResults([]);}finally{setLoading(false);}
  };

  useEffect(()=>{void runSearch();/* initial URL state only */},[]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit=(event:FormEvent)=>{event.preventDefault();void runSearch();};
  const locate=()=>{
    if(!navigator.geolocation){setError('La géolocalisation n’est pas disponible. Utilisez votre ville.');return;}
    setLocating(true); setError(null);
    navigator.geolocation.getCurrentPosition((position)=>{const next={lat:position.coords.latitude,lng:position.coords.longitude};setCoords(next);setLocating(false);void runSearch({coords:next});},()=>{setLocating(false);setCoords(null);setError('Position non autorisée. Vous pouvez continuer avec votre ville.');},{enableHighAccuracy:false,timeout:8000,maximumAge:300000});
  };

  return <main className="min-h-screen bg-cream text-ink"><section className="bg-card border-b border-ink/10"><div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12"><p className="font-hand text-2xl text-terracotta">trouvez votre talent</p><h1 className="font-display text-4xl sm:text-5xl mt-1">Qui peut réaliser votre prochain style ?</h1><p className="mt-3 text-ink-soft max-w-2xl">Recherchez une prestation ou un style, puis utilisez votre position ou indiquez simplement votre ville.</p><form onSubmit={submit} className="mt-7 grid lg:grid-cols-[1fr_280px_auto] gap-3"><label className="relative"><Search className="absolute left-4 top-4 w-5 h-5 text-ink-soft"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tresses, locks, taper fade…" className="w-full min-h-[52px] rounded-pill border border-ink/15 bg-cream pl-12 pr-4"/></label><label className="relative"><MapPin className="absolute left-4 top-4 w-5 h-5 text-ink-soft"/><input value={city} onChange={e=>{setCity(e.target.value);setCoords(null);}} placeholder="Ville ou quartier" className="w-full min-h-[52px] rounded-pill border border-ink/15 bg-cream pl-12 pr-4"/></label><button className="min-h-[52px] rounded-pill bg-terracotta text-white px-7 font-bold">Rechercher</button></form><div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={locate} disabled={locating} className="inline-flex min-h-[40px] items-center gap-2 rounded-pill border border-ink/10 px-4 text-sm font-bold hover:border-terracotta"><LocateFixed className="w-4 h-4 text-terracotta"/>{locating?'Localisation…':coords?'Position utilisée':'Utiliser ma position'}</button><span className="text-xs text-ink-soft">Votre position sert uniquement à cette recherche et n’est pas enregistrée dans votre profil.</span></div></div></section>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div className="flex gap-2 overflow-x-auto pb-1">{[['all','Tous'],['professional','Professionnels'],['salon','Salons']].map(([value,label])=><button key={value} onClick={()=>{setType(value);void runSearch({type:value});}} className={`whitespace-nowrap min-h-[40px] rounded-pill border px-4 text-sm font-bold ${type===value?'bg-ink text-white border-ink':'bg-card border-ink/10'}`}>{label}</button>)}</div><label className="flex items-center gap-2 text-sm"><SlidersHorizontal className="w-4 h-4 text-terracotta"/><select value={style} onChange={e=>{setStyle(e.target.value);void runSearch({style:e.target.value});}} className="min-h-[40px] rounded-pill border border-ink/10 bg-card px-4"><option value="">Tous les styles</option>{styles.map(item=><option key={item.id} value={item.slug}>{item.label_fr}</option>)}</select></label></div>

      {style&&<div className="mt-5 rounded-card border border-terracotta/20 bg-terracotta-wash px-5 py-4"><p className="font-bold">Professionnels capables de réaliser « {styles.find(item=>item.slug===style)?.label_fr||style} »</p><div className="mt-2 flex flex-wrap gap-3 text-sm"><Link href={`/styles/${style}`} className="font-bold text-terracotta">Voir le style</Link><Link href={`/rituel?style=${encodeURIComponent(style)}`} className="font-bold text-terracotta">Essayer sur moi</Link></div></div>}

      {error&&<div className="mt-6 rounded-input border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading?<div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i=><div key={i} className="h-52 rounded-card bg-card border border-ink/10 animate-pulse"/>)}</div>:results.length?<div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{results.map(result=>{
        const href=result.slug?(result.provider_type==='professional'?`/professionnels/${result.slug}`:`/salons/${result.slug}`):'#';
        return <article key={`${result.provider_type}:${result.provider_id}`} className="rounded-card bg-card border border-ink/10 shadow-soft p-5 flex flex-col"><div className="flex items-start justify-between gap-3"><span className="w-12 h-12 rounded-full bg-terracotta-wash text-terracotta flex items-center justify-center">{result.provider_type==='professional'?<Scissors className="w-5 h-5"/>:<Building2 className="w-5 h-5"/>}</span><span className="inline-flex items-center gap-1 text-xs font-bold text-terracotta"><CheckCircle2 className="w-4 h-4"/>Vérifié</span></div><p className="mt-4 text-xs uppercase tracking-[.1em] text-ink-soft font-bold">{result.provider_type==='professional'?'Professionnel':'Salon'}</p><h2 className="font-display text-2xl mt-1">{result.display_name}</h2><p className="mt-2 text-sm font-bold">{result.matched_service_name}</p><p className="text-sm text-ink-soft mt-1">{[result.neighborhood,result.city].filter(Boolean).join(' · ')||'Zone disponible sur le profil'}{result.distance_m!=null?` · ${(result.distance_m/1000).toFixed(1)} km`:''}</p><p className="font-display text-xl mt-4">Dès {Number(result.matched_service_price).toLocaleString('fr-FR')} {result.currency}</p><Link href={href} aria-disabled={!result.slug} className={`mt-5 min-h-[44px] rounded-pill font-bold flex items-center justify-center ${result.slug?'bg-ink text-white':'bg-ink/10 text-ink-soft pointer-events-none'}`}>Voir le profil</Link></article>;
      })}</div>:<div className="mt-10 rounded-card border border-ink/10 bg-card p-8 text-center"><h2 className="font-display text-3xl">Pas encore de résultat ici.</h2><p className="mt-2 text-ink-soft">Essayez une autre ville, élargissez votre recherche ou explorez les styles Afrofade.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/styles" className="min-h-[44px] rounded-pill bg-terracotta text-white px-5 font-bold flex items-center">Explorer les styles</Link><button onClick={()=>{setQ('');setStyle('');setType('all');void runSearch({q:'',style:'',type:'all'});}} className="min-h-[44px] rounded-pill border border-ink/15 px-5 font-bold">Réinitialiser</button></div></div>}
    </div></main>;
}
