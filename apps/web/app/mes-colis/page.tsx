"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe, logout } from "@/lib/api";
import { Package, MapPin, ArrowRight, Clock, CheckCircle2, XCircle, Truck, Home, Building2, Search, Star } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type TripDetail = {
  id: number;
  origin_city: string;
  origin_country: string;
  dest_city: string;
  dest_country: string;
  departure_at: string;
  arrival_eta: string | null;
  price_per_kg: number;
  agency_name: string;
  agency_id: number | null;
};

type Shipment = {
  id: number;
  trip: number;
  trip_detail: TripDetail;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  weight_kg: number;
  description: string;
  delivery_type: string;
  delivery_address: string;
  status: string;
  created_at: string;
};

const TRACKING_STEPS = [
  { key: "PENDING",    label: "En attente",       icon: Clock },
  { key: "ACCEPTED",   label: "Accepté",          icon: CheckCircle2 },
  { key: "DEPOSITED",  label: "Déposé",           icon: Building2 },
  { key: "IN_TRANSIT", label: "En transit",        icon: Truck },
  { key: "ARRIVED",    label: "Arrivé",           icon: MapPin },
  { key: "DELIVERED",  label: "Livré",            icon: CheckCircle2 },
];
const STATUS_ORDER = ["PENDING", "ACCEPTED", "DEPOSITED", "IN_TRANSIT", "ARRIVED", "DELIVERED"];

const FILTER_OPTIONS = [
  { key: "ALL",        label: "Tous" },
  { key: "PENDING",    label: "En attente" },
  { key: "ACCEPTED",   label: "Accepté" },
  { key: "DEPOSITED",  label: "Déposé" },
  { key: "IN_TRANSIT", label: "En transit" },
  { key: "ARRIVED",    label: "Arrivé" },
  { key: "DELIVERED",  label: "Livré" },
  { key: "REJECTED",   label: "Refusé" },
];

export default function MesColisPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  function handleLogout() { logout(); router.replace("/login"); }

  async function load() {
    try {
      const res = await fetch(`${API_BASE}/shipments/`, { headers: authHeader() });
      if (!res.ok) throw new Error();
      setShipments(await res.json());
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMe().catch(() => router.replace("/login"));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmDeposit(id: number) {
    if (!confirm("Confirmer que tu as déposé ton colis au bureau de départ ?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE}/shipments/${id}/tracking/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status: "DEPOSITED" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setShipments((prev) => prev.map((s) => s.id === id ? updated : s));
      }
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = shipments.filter((sh) => {
    if (statusFilter !== "ALL" && sh.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const t = sh.trip_detail;
      return (
        t.origin_city.toLowerCase().includes(q) ||
        t.dest_city.toLowerCase().includes(q) ||
        t.agency_name.toLowerCase().includes(q) ||
        sh.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <p className="text-white/40">Chargement…</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#080808]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
          <Link href="/trips" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">L</div>
            <span className="font-black text-lg tracking-tight">Luggo</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/trips" className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">Trajets</Link>
            <Link href="/reclamations" className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">Réclamations</Link>
            <NotificationBell />
            <button onClick={handleLogout} className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-2">Mon espace</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">Mes colis</h1>
        <p className="text-white/45 text-sm mb-8">Suis l'état de tous tes envois en temps réel.</p>

        {/* Search + filter */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par ville, agence, contenu…"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 focus:outline-none text-sm text-white placeholder:text-white/25 transition"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  statusFilter === f.key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white/[0.04] text-white/50 border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {f.label}
                {f.key !== "ALL" && (
                  <span className="ml-1 opacity-60">({shipments.filter((s) => s.status === f.key).length})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-14 text-center">
            <Package className="mx-auto h-10 w-10 text-white/20 mb-3" />
            <p className="text-white/40 font-medium">
              {shipments.length === 0 ? "Aucun colis pour le moment." : "Aucun résultat pour ce filtre."}
            </p>
            {shipments.length === 0 && (
              <Link href="/trips" className="mt-5 inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition">
                Voir les trajets →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((sh) => (
              <ShipmentCard
                key={sh.id}
                sh={sh}
                onConfirmDeposit={() => confirmDeposit(sh.id)}
                actionLoading={actionLoading === sh.id}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ShipmentCard({ sh, onConfirmDeposit, actionLoading }: {
  sh: Shipment; onConfirmDeposit: () => void; actionLoading: boolean;
}) {
  const t = sh.trip_detail;
  const currentIdx = STATUS_ORDER.indexOf(sh.status);
  const isRejected = sh.status === "REJECTED";
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  async function submitReview() {
    setReviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reviews/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ agency: t.agency_id, shipment: sh.id, rating: reviewRating, comment: reviewComment }),
      });
      if (res.ok) { setReviewSent(true); setShowReview(false); }
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-[#111111] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <div className="flex items-center gap-2 font-black text-lg tracking-tight">
            <span>{t.origin_city}</span>
            <ArrowRight className="h-4 w-4 text-blue-500 shrink-0" />
            <span>{t.dest_city}</span>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
            sh.status === "DELIVERED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
            sh.status === "IN_TRANSIT" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
            sh.status === "REJECTED"  ? "bg-red-500/10 text-red-400 border-red-500/20" :
            "bg-blue-500/10 text-blue-400 border-blue-500/20"
          }`}>
            {TRACKING_STEPS.find((s) => s.key === sh.status)?.label ?? sh.status}
          </span>
        </div>
        <div className="text-xs text-white/40 font-medium">
          {t.origin_country} → {t.dest_country} · {t.agency_name} · {sh.weight_kg} kg
        </div>
      </div>

      {/* Tracking timeline */}
      {!isRejected && (
        <div className="px-5 py-4 border-b border-white/[0.04] overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {TRACKING_STEPS.map((step, i) => {
              const done   = currentIdx >= i;
              const active = currentIdx === i;
              const Icon   = step.icon;
              return (
                <div key={step.key} className="flex items-center gap-1 shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center transition ${
                      active ? "bg-blue-600 text-white" :
                      done   ? "bg-emerald-500/20 text-emerald-400" :
                      "bg-white/[0.04] text-white/20"
                    }`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className={`text-[10px] font-bold text-center max-w-[56px] leading-tight ${
                      active ? "text-blue-400" : done ? "text-emerald-400" : "text-white/25"
                    }`}>{step.label}</span>
                  </div>
                  {i < TRACKING_STEPS.length - 1 && (
                    <div className={`h-0.5 w-5 mb-4 shrink-0 rounded-full ${done && currentIdx > i ? "bg-emerald-500/50" : "bg-white/[0.06]"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isRejected && (
        <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-2 text-red-400 text-sm">
          <XCircle className="h-4 w-4 shrink-0" /> Colis refusé par l'agence.
        </div>
      )}

      {/* Infos + actions */}
      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 grid gap-1 text-sm text-white/60">
          {sh.description && <p><span className="font-semibold text-white/80">Description :</span> {sh.description}</p>}
          <p className="flex items-center gap-1.5">
            {sh.delivery_type === "HOME_DELIVERY" ? <Home className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
            {sh.delivery_type === "HOME_DELIVERY" ? `Livraison domicile — ${sh.delivery_address}` : "Retrait au bureau"}
          </p>
          <p className="text-xs text-white/30">Créé le {new Date(sh.created_at).toLocaleDateString("fr-FR")}</p>
        </div>

        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <Link
            href={`/mes-colis/${sh.id}`}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-sm font-bold text-white/70 hover:text-white transition text-center"
          >
            Voir détails →
          </Link>
          {sh.status === "ACCEPTED" && (
            <button
              onClick={onConfirmDeposit}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold transition"
            >
              <Building2 className="h-4 w-4" />
              {actionLoading ? "Confirmation…" : "Confirmer dépôt"}
            </button>
          )}
          {sh.status === "DELIVERED" && !reviewSent && (
            <button
              onClick={() => setShowReview(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 text-sm font-bold transition"
            >
              <Star className="h-4 w-4" />
              Laisser un avis
            </button>
          )}
          {reviewSent && (
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Avis envoyé
            </div>
          )}
        </div>
      </div>

      {showReview && (
        <div className="border-t border-white/[0.06] p-5 bg-amber-500/[0.03]">
          <div className="font-bold text-sm mb-3 flex items-center gap-2 text-amber-400">
            <Star className="h-4 w-4" />
            Votre avis pour {t.agency_name}
          </div>
          <div className="flex gap-1 mb-3">
            {[1,2,3,4,5].map((s) => (
              <button key={s} type="button" onClick={() => setReviewRating(s)}>
                <Star className={`h-6 w-6 transition ${s <= reviewRating ? "text-amber-400 fill-amber-400" : "text-white/15 fill-white/15"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Partagez votre expérience (optionnel)…"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/50 focus:outline-none text-sm text-white placeholder:text-white/25 mb-3 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={submitReview} disabled={reviewLoading}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-bold transition">
              {reviewLoading ? "Envoi…" : "Envoyer"}
            </button>
            <button onClick={() => setShowReview(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 text-sm font-bold hover:text-white transition">
              Annuler
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
