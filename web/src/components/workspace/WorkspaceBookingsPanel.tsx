'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Star, XCircle, BellRing, Send } from 'lucide-react';

type Booking = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  service_name_snapshot: string;
  price_amount_snapshot: number;
  currency_snapshot: string;
  target_type: string;
  salon_id: string | null;
  assigned_professional_profile_id: string | null;
  visual_brief_snapshot: any;
};

type ReminderLog = {
  id: string;
  reminderType: '24h' | '2h' | 'manual_instant';
  channel: string;
  recipient: string;
  status: string;
  sentAt: string | null;
};

const providerNext: Record<string, string[]> = {
  requested: ['confirmed', 'rejected', 'cancelled_by_provider'],
  confirmed: ['completed', 'cancelled_by_provider', 'no_show_customer', 'no_show_provider'],
};

export default function WorkspaceBookingsPanel({ context }: { context: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reminderLogs, setReminderLogs] = useState<Record<string, ReminderLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const personal = context === 'personal';

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/workspace/bookings?context=${encodeURIComponent(context)}`, { cache: 'no-store' }).then(
        async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          return d.bookings || [];
        }
      ),
      !personal
        ? fetch('/api/workspace/reminders', { cache: 'no-store' }).then(async (r) => {
            if (!r.ok) return {};
            const d = await r.json();
            return d.reminderLogsByBooking || {};
          })
        : Promise.resolve({}),
    ])
      .then(([bList, logsMap]) => {
        setBookings(bList);
        setReminderLogs(logsMap);
      })
      .catch((e) => setError(e.message || 'Chargement impossible.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [context]);

  const transition = async (id: string, status: string) => {
    setBusy(id + status);
    setError(null);
    try {
      const r = await fetch('/api/workspace/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusy(null);
    }
  };

  const sendManualReminder = async (bookingId: string) => {
    setBusy(bookingId + 'reminder');
    setError(null);
    try {
      const r = await fetch('/api/workspace/reminders/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setError('🔔 Rappel instantané envoyé au client avec succès !');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d\'envoyer le rappel.');
    } finally {
      setBusy(null);
    }
  };

  const review = async (b: Booking, targetType: 'professional' | 'salon') => {
    setBusy(b.id + targetType);
    try {
      const r = await fetch('/api/marketplace/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: b.id,
          targetType,
          rating: 5,
          comment: 'Très bonne prestation.',
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setError('Avis 5★ publié comme prestation vérifiée.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Avis impossible.');
    } finally {
      setBusy(null);
    }
  };

  if (loading)
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 rounded-card bg-card animate-pulse" />
        ))}
      </div>
    );

  return (
    <div>
      {error && (
        <div
          className={`mb-4 rounded-input px-4 py-3 text-sm ${
            error.includes('publié') || error.includes('🔔')
              ? 'bg-terracotta-wash text-terracotta font-semibold'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {bookings.map((b) => {
          const logs = reminderLogs[b.id] || [];
          const has24h = logs.some((l) => l.reminderType === '24h' && l.status === 'sent');
          const has2h = logs.some((l) => l.reminderType === '2h' && l.status === 'sent');
          const hasManual = logs.some((l) => l.reminderType === 'manual_instant' && l.status === 'sent');

          return (
            <article key={b.id} className="rounded-card bg-card border border-ink/10 p-5 shadow-soft">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[.1em] font-bold text-terracotta">
                    {b.status.replaceAll('_', ' ')}
                  </p>
                  <h3 className="font-display text-2xl mt-1">{b.service_name_snapshot}</h3>
                </div>
                <p className="font-display text-xl whitespace-nowrap">
                  {Number(b.price_amount_snapshot).toLocaleString('fr-FR')} {b.currency_snapshot}
                </p>
              </div>

              <p className="mt-3 text-sm inline-flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-terracotta" />
                {new Date(b.starts_at).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <br />
              <p className="mt-1 text-sm inline-flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-terracotta" />
                {new Date(b.starts_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                –{' '}
                {new Date(b.ends_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>

              {/* Badges d'état des rappels */}
              {logs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {has24h && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 text-xs font-semibold">
                      <BellRing className="w-3 h-3" /> Rappel 24h envoyé
                    </span>
                  )}
                  {has2h && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 px-2.5 py-0.5 text-xs font-semibold">
                      <BellRing className="w-3 h-3" /> Rappel 2h envoyé
                    </span>
                  )}
                  {hasManual && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-600 px-2.5 py-0.5 text-xs font-semibold">
                      <Send className="w-3 h-3" /> Client relancé
                    </span>
                  )}
                </div>
              )}

              {b.visual_brief_snapshot && (
                <div className="mt-4 rounded-input bg-terracotta-wash p-3 text-sm">
                  <b>Look joint :</b> {b.visual_brief_snapshot.style || b.visual_brief_snapshot.title}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {personal && ['requested', 'confirmed'].includes(b.status) && (
                  <button
                    disabled={busy !== null}
                    onClick={() => transition(b.id, 'cancelled_by_customer')}
                    className="min-h-[38px] rounded-pill border border-red-200 text-red-700 px-3 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Annuler
                  </button>
                )}

                {!personal &&
                  (providerNext[b.status] || []).map((s) => (
                    <button
                      key={s}
                      disabled={busy !== null}
                      onClick={() => transition(b.id, s)}
                      className="min-h-[38px] rounded-pill border border-ink/15 px-3 text-xs font-bold"
                    >
                      {s.replaceAll('_', ' ')}
                    </button>
                  ))}

                {/* Bouton de relance manuelle salon */}
                {!personal && ['requested', 'confirmed'].includes(b.status) && (
                  <button
                    disabled={busy !== null}
                    onClick={() => sendManualReminder(b.id)}
                    className="min-h-[38px] rounded-pill bg-terracotta-wash text-terracotta border border-terracotta/30 px-3 text-xs font-bold inline-flex items-center gap-1 hover:bg-terracotta hover:text-white transition-colors"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    Relancer le client
                  </button>
                )}

                {personal && b.status === 'completed' && b.assigned_professional_profile_id && (
                  <button
                    disabled={busy !== null}
                    onClick={() => review(b, 'professional')}
                    className="min-h-[38px] rounded-pill bg-terracotta text-white px-3 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Star className="w-4 h-4" />
                    Noter le pro 5★
                  </button>
                )}
                {personal && b.status === 'completed' && b.salon_id && (
                  <button
                    disabled={busy !== null}
                    onClick={() => review(b, 'salon')}
                    className="min-h-[38px] rounded-pill border border-terracotta text-terracotta px-3 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Noter le salon 5★
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {!bookings.length && (
          <div className="lg:col-span-2 rounded-card bg-card border border-ink/10 p-8 text-center">
            <CalendarDays className="w-8 h-8 text-terracotta mx-auto" />
            <h3 className="font-display text-2xl mt-3">Aucune réservation pour le moment.</h3>
          </div>
        )}
      </div>
    </div>
  );
}
