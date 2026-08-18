'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ArrowLeft, MessageSquare, Mail, Phone, Send, CheckCircle2, Clock, MapPin } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    salonName: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-cream text-ink font-body flex flex-col">
      <Navbar />

      <main className="max-w-container mx-auto px-6 py-12 md:py-16 flex-1">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta hover:underline mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>

        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-card bg-terracotta-wash text-terracotta mb-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="font-hand text-2xl text-terracotta">Nous sommes à votre écoute</p>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-2">
            Contact & Support Salon
          </h1>
          <p className="mt-3 text-ink-soft text-base leading-relaxed">
            Une question sur le Rituel, vos abonnements Mobile Money ou besoin d'assistance pour votre salon ? Notre équipe vous répond 7j/7.
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr_1.3fr] gap-8 max-w-4xl mx-auto">
          {/* Informations de contact directes */}
          <div className="space-y-6">
            <div className="bg-card rounded-card p-6 shadow-soft border border-ink/5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-pill bg-terracotta-wash text-terracotta flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-ink">Support WhatsApp Salon</h3>
                <p className="text-sm text-ink-soft mt-1">Assistance directe pour barbiers & gérants</p>
                <a
                  href="https://wa.me/2250000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-terracotta hover:underline"
                >
                  Ouvrir WhatsApp (+225 00 00 00 00)
                </a>
              </div>
            </div>

            <div className="bg-card rounded-card p-6 shadow-soft border border-ink/5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-pill bg-terracotta-wash text-terracotta flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-ink">E-mail Support & Partenariats</h3>
                <p className="text-sm text-ink-soft mt-1">Réponse garantie sous 24h</p>
                <a
                  href="mailto:support@afrofade.com"
                  className="inline-block mt-3 text-sm font-bold text-terracotta hover:underline"
                >
                  support@afrofade.com
                </a>
              </div>
            </div>

            <div className="bg-card rounded-card p-6 shadow-soft border border-ink/5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-pill bg-terracotta-wash text-terracotta flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-ink">Horaires du Support</h3>
                <p className="text-sm text-ink-soft mt-1">Du Lundi au Samedi : 08h00 – 20h00 (GMT)</p>
                <p className="text-xs text-ink-soft/80 mt-0.5">Dimanche : Permeance WhatsApp 10h00 – 18h00</p>
              </div>
            </div>
          </div>

          {/* Formulaire de contact */}
          <div className="bg-card rounded-card p-7 md:p-8 shadow-soft border border-ink/5">
            {submitted ? (
              <div className="text-center py-10 animate-fade-in space-y-4">
                <div className="w-14 h-14 bg-terracotta-wash text-terracotta rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-display text-2xl">Message envoyé !</h3>
                <p className="text-sm text-ink-soft max-w-sm mx-auto">
                  Merci {formData.name || 'cher salon'}. Notre équipe a bien reçu votre demande et vous recontactera très rapidement.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 inline-flex items-center justify-center px-6 py-2.5 rounded-pill bg-terracotta text-white font-bold text-sm hover:bg-terracotta-dark transition-colors"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-bold text-lg text-ink mb-1">Écrivez-nous</h3>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
                    Votre Nom & Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: Mamadou Kouassi"
                    className="w-full h-11 px-4 rounded-card bg-cream border border-ink/15 text-sm text-ink focus:outline-none focus:border-terracotta"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
                    Nom de votre Salon
                  </label>
                  <input
                    type="text"
                    value={formData.salonName}
                    onChange={(e) => setFormData({ ...formData, salonName: e.target.value })}
                    placeholder="ex: KGS Barbershop Treichville"
                    className="w-full h-11 px-4 rounded-card bg-cream border border-ink/15 text-sm text-ink focus:outline-none focus:border-terracotta"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="salon@exemple.com"
                      className="w-full h-11 px-4 rounded-card bg-cream border border-ink/15 text-sm text-ink focus:outline-none focus:border-terracotta"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
                      Téléphone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+225 07..."
                      className="w-full h-11 px-4 rounded-card bg-cream border border-ink/15 text-sm text-ink focus:outline-none focus:border-terracotta"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
                    Votre Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Expliquez-nous votre besoin ou votre question..."
                    className="w-full p-4 rounded-card bg-cream border border-ink/15 text-sm text-ink focus:outline-none focus:border-terracotta resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-12 rounded-pill bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm flex items-center justify-center gap-2 shadow-soft transition-colors mt-2"
                >
                  <Send className="w-4 h-4" />
                  Envoyer le message
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
