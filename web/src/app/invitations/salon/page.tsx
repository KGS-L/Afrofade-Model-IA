'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';

function SalonInvitationContent() {
  const router = useRouter();
  const search = useSearchParams();
  const { user, hydrated } = useAuth();
  const token = search.get('token') || '';
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace(`/connexion?next=${encodeURIComponent(`/invitations/salon?token=${token}`)}`);
    }
  }, [hydrated, user, router, token]);

  if (!hydrated || !user) return <DashboardSkeleton />;

  const accept = async () => {
    if (!token) { setState('error'); setMessage('Cette invitation est invalide.'); return; }
    setState('saving'); setMessage('');
    try {
      const response = await fetch('/api/marketplace/invitations/accept', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invitation impossible à accepter.');
      setState('done');
      setMessage('Vous faites maintenant partie de cette équipe Afrofade.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Invitation impossible à accepter.');
    }
  };

  return <main className="min-h-screen bg-cream text-ink px-4 py-12 flex items-center justify-center"><section className="w-full max-w-lg rounded-card border border-ink/10 bg-card shadow-soft p-6 sm:p-8 text-center"><span className="mx-auto w-14 h-14 rounded-full bg-terracotta-wash text-terracotta flex items-center justify-center">{state === 'done' ? <CheckCircle2 className="w-6 h-6"/> : <Building2 className="w-6 h-6"/>}</span><p className="mt-4 text-xs uppercase tracking-[.14em] font-bold text-terracotta">Invitation salon</p><h1 className="font-display text-3xl mt-1">Rejoindre une équipe Afrofade</h1><p className="mt-3 text-sm text-ink-soft">L’invitation sera acceptée uniquement si l’adresse email de votre compte correspond à celle invitée.</p>{message && <div className={`mt-5 rounded-input border px-4 py-3 text-sm ${state === 'done' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{message}</div>}{state === 'done' ? <button onClick={() => router.push('/workspace')} className="mt-6 min-h-[48px] px-6 rounded-pill bg-terracotta text-white font-bold">Ouvrir mon espace</button> : <button onClick={accept} disabled={state === 'saving'} className="mt-6 min-h-[48px] px-6 rounded-pill bg-terracotta text-white font-bold disabled:opacity-50 inline-flex items-center gap-2">{state === 'saving' && <Loader2 className="w-4 h-4 animate-spin"/>}Accepter l’invitation</button>}</section></main>;
}

export default function SalonInvitationPage() {
  return <Suspense fallback={<DashboardSkeleton />}><SalonInvitationContent /></Suspense>;
}
