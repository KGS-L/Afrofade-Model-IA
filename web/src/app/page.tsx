'use client';

import React, { useState, useEffect } from 'react';

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<{ status?: string; service?: string; version?: string; error?: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkApiHealth() {
      try {
        const res = await fetch('/api/py/health');
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const data = await res.json();
        setApiStatus(data);
      } catch (err: any) {
        setApiStatus({ error: err.message || 'Impossible de contacter FastAPI' });
      } finally {
        setLoading(false);
      }
    }
    checkApiHealth();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent">
            Afrofade 💈
          </h1>
          <p className="text-slate-400 text-lg">
            SaaS de Coiffure Virtuelle 3D par IA pour les Salons & Barbershops Africains
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-left">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <h3 className="font-semibold text-amber-400">Plan PRO</h3>
            <p className="text-2xl font-bold text-white mt-1">2 200 FCFA <span className="text-xs text-slate-400">/mois</span></p>
            <p className="text-xs text-slate-400 mt-2">20-30 têtes / mois • Consultation pré-coupe</p>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-xl border border-amber-500/40 relative">
            <span className="absolute -top-3 right-3 bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full">POPULAIRE</span>
            <h3 className="font-semibold text-amber-400">Plan VIP</h3>
            <p className="text-2xl font-bold text-white mt-1">4 900 FCFA <span className="text-xs text-slate-400">/mois</span></p>
            <p className="text-xs text-slate-400 mt-2">100 têtes / mois • Carnet Client 3D (1Go)</p>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <h3 className="font-semibold text-amber-400">Plan EXTRA</h3>
            <p className="text-2xl font-bold text-white mt-1">7 500 FCFA <span className="text-xs text-slate-400">/mois</span></p>
            <p className="text-xs text-slate-400 mt-2">Têtes illimitées • Full Features</p>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm font-mono text-left">
          <span className="text-slate-400">Statut de la connexion FastAPI 3D Microservice :</span>
          {loading ? (
            <span className="text-amber-400 ml-2 animate-pulse">Vérification en cours...</span>
          ) : apiStatus.error ? (
            <span className="text-red-400 ml-2">❌ En attente de démarrage Docker ({apiStatus.error})</span>
          ) : (
            <span className="text-emerald-400 ml-2">
              ✅ Connecté ({apiStatus.service} v{apiStatus.version})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
