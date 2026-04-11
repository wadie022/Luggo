"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe, logout } from "@/lib/api";
import { AlertCircle, CheckCircle2, Clock, MessageSquare, Plus, ArrowRight, X } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type Shipment = { id: number; trip_detail: { origin_city: string; dest_city: string } };

type Reclamation = {
  id: number;
  shipment: number | null;
  shipment_route: string | null;
  subject: string;
  message: string;
  status: string;
  admin_response: string;
  created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  OPEN:        { label: "Ouverte",     cls: "bg-amber-50 text-amber-700 border-amber-200",   icon: <Clock className="h-3.5 w-3.5" /> },
  IN_PROGRESS: { label: "En cours",   cls: "bg-blue-50 text-blue-700 border-blue-200",       icon: <MessageSquare className="h-3.5 w-3.5" /> },
  RESOLVED:    { label: "Résolue",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  CLOSED:      { label: "Fermée",     cls: "bg-slate-100 text-slate-500 border-slate-200",   icon: <X className="h-3.5 w-3.5" /> },
};

export default function ReclamationsPage() {
  const router = useRouter();
  const [recs, setRecs]           = useState<Reclamation[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [shipmentId, setShipmentId] = useState<string>("");

  useEffect(() => {
    fetchMe().catch(() => router.replace("/login"));
    Promise.all([
      fetch(`${API_BASE}/reclamations/`, { headers: authHeader() }).then(r => r.json()),
      fetch(`${API_BASE}/shipments/`,    { headers: authHeader() }).then(r => r.json()),
    ]).then(([r, s]) => {
      setRecs(Array.isArray(r) ? r : []);
      setShipments(Array.isArray(s) ? s : []);
    }).catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/reclamations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          subject,
          message,
          ...(shipmentId ? { shipment: Number(shipmentId) } : {}),
        }),
      });
      if (res.ok) {
        const newRec = await res.json();
        setRecs(prev => [newRec, ...prev]);
        setSubject(""); setMessage(""); setShipmentId("");
        setShowForm(false);
        setSuccessMsg("Réclamation envoyée. Notre équipe vous répondra sous 48h.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-slate-500">Chargement…</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/trips" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold">L</div>
            <span className="font-bold tracking-tight text-lg text-white">Luggo</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/mes-colis" className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">Mes colis</Link>
            <NotificationBell />
            <button onClick={() => { logout(); router.replace("/login"); }} className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">Support</div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Mes réclamations</h1>
            <p className="text-slate-500 text-sm mt-1">Signalez un problème — nous répondons sous 48h.</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setSuccessMsg(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Nouvelle réclamation
          </button>
        </div>

        {successMsg && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
          </div>
        )}

        {/* Formulaire */}
        {showForm && (
          <div className="mb-6 rounded-3xl border border-blue-200 bg-blue-50/40 p-6">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" /> Soumettre une réclamation
            </h2>
            <form onSubmit={handleSubmit} className="grid gap-4">
              {/* Colis lié */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Colis concerné (optionnel)</label>
                <select
                  value={shipmentId}
                  onChange={(e) => setShipmentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Réclamation générale —</option>
                  {shipments.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} — {s.trip_detail.origin_city} → {s.trip_detail.dest_city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sujet */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Sujet *</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="Ex : Colis non reçu, mauvais état, délai dépassé…"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Description *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="Décrivez votre problème en détail…"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm"
                >
                  {submitting ? "Envoi…" : "Envoyer la réclamation"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste */}
        {recs.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Aucune réclamation pour le moment.</p>
            <p className="text-slate-400 text-sm mt-1">Si vous avez un problème, cliquez sur "Nouvelle réclamation".</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {recs.map((r) => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.OPEN;
              return (
                <article key={r.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Réclamation #{r.id} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</div>
                      <div className="font-bold text-slate-900">{r.subject}</div>
                      {r.shipment_route && (
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" /> {r.shipment_route}
                        </div>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0 ${cfg.cls}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  <div className="p-5 grid gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Votre message</div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{r.message}</p>
                    </div>

                    {r.admin_response && (
                      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                        <div className="text-xs font-semibold uppercase text-blue-600 mb-1 flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" /> Réponse de l'équipe Luggo
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{r.admin_response}</p>
                      </div>
                    )}

                    {!r.admin_response && r.status === "OPEN" && (
                      <p className="text-xs text-slate-400 italic">En attente de réponse de notre équipe (48h max).</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
