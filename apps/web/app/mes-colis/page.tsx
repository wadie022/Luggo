"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe, logout } from "@/lib/api";
import { Package, MapPin, ArrowRight, Clock, CheckCircle2, XCircle, Truck, Home, Building2, Search, Star, CreditCard } from "lucide-react";
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
    <main className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
      <p className="text-gray-400">Chargement…</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#f8f9fb] text-[#0a0a0a]">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
          <Link href="/trips" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-black text-lg">L</div>
            <span className="font-black text-lg tracking-tight text-[#0a0a0a]">Luggo</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/trips" className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-[#2563eb] hover:bg-blue-50 transition">Trajets</Link>
            <Link href="/reclamations" className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-[#2563eb] hover:bg-blue-50 transition">Réclamations</Link>
            <NotificationBell />
            <button onClick={handleLogout} className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-[#0a0a0a] hover:bg-gray-50 transition">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-xs font-bold tracking-widest text-[#2563eb] uppercase mb-2">Mon espace</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1 text-[#0a0a0a]">Mes colis</h1>
        <p className="text-gray-500 text-sm mb-8">Suis l'état de tous tes envois en temps réel.</p>

        {/* Search + filter */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par ville, agence, contenu…"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#2563eb]/50 focus:outline-none text-sm text-[#0a0a0a] placeholder:text-gray-400 transition shadow-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  statusFilter === f.key
                    ? "text-white border-[#2563eb]"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-[#0a0a0a]"
                }`}
                style={statusFilter === f.key ? { backgroundColor: "#2563eb" } : {}}
              >
                {f.label}
                {f.key !== "ALL" && (
                  <span className="ml-1 opacity-70">({shipments.filter((s) => s.status === f.key).length})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-14 text-center shadow-sm">
            <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              {shipments.length === 0 ? "Aucun colis pour le moment." : "Aucun résultat pour ce filtre."}
            </p>
            {shipments.length === 0 && (
              <Link href="/trips" className="mt-5 inline-block px-5 py-2.5 rounded-full font-bold text-sm text-white transition shadow-md shadow-blue-200 hover:bg-blue-700"
                style={{ backgroundColor: "#2563eb" }}>
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
    <article className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <div className="flex items-center gap-2 font-black text-lg tracking-tight text-[#0a0a0a]">
            <span>{t.origin_city}</span>
            <ArrowRight className="h-4 w-4 text-[#2563eb] shrink-0" />
            <span>{t.dest_city}</span>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
            sh.status === "DELIVERED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            sh.status === "IN_TRANSIT" ? "bg-purple-50 text-purple-700 border-purple-200" :
            sh.status === "REJECTED"  ? "bg-red-50 text-red-600 border-red-200" :
            "bg-blue-50 text-[#2563eb] border-blue-200"
          }`}>
            {TRACKING_STEPS.find((s) => s.key === sh.status)?.label ?? sh.status}
          </span>
        </div>
        <div className="text-xs text-gray-400 font-medium">
          {t.origin_country} → {t.dest_country} · {t.agency_name} · {sh.weight_kg} kg
        </div>
      </div>

      {/* Tracking timeline */}
      {!isRejected && (
        <div className="px-5 py-4 border-b border-gray-100 overflow-x-auto bg-[#f8f9fb]">
          <div className="flex items-center gap-1 min-w-max">
            {TRACKING_STEPS.map((step, i) => {
              const done   = currentIdx >= i;
              const active = currentIdx === i;
              const Icon   = step.icon;
              return (
                <div key={step.key} className="flex items-center gap-1 shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center transition ${
                      active ? "text-white" :
                      done   ? "bg-emerald-50 text-emerald-600" :
                      "bg-gray-100 text-gray-400"
                    }`} style={active ? { backgroundColor: "#2563eb" } : {}}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className={`text-[10px] font-bold text-center max-w-[56px] leading-tight ${
                      active ? "text-[#2563eb]" : done ? "text-emerald-600" : "text-gray-400"
                    }`}>{step.label}</span>
                  </div>
                  {i < TRACKING_STEPS.length - 1 && (
                    <div className={`h-0.5 w-5 mb-4 shrink-0 rounded-full ${done && currentIdx > i ? "bg-emerald-300" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isRejected && (
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 text-red-600 text-sm bg-red-50">
          <XCircle className="h-4 w-4 shrink-0" /> Colis refusé par l'agence.
        </div>
      )}

      {/* Infos + actions */}
      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 grid gap-1 text-sm text-gray-500">
          {sh.description && <p><span className="font-semibold text-[#0a0a0a]">Description :</span> {sh.description}</p>}
          <p className="flex items-center gap-1.5">
            {sh.delivery_type === "HOME_DELIVERY" ? <Home className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
            {sh.delivery_type === "HOME_DELIVERY" ? `Livraison domicile — ${sh.delivery_address}` : "Retrait au bureau"}
          </p>
          <p className="text-xs text-gray-400">Créé le {new Date(sh.created_at).toLocaleDateString("fr-FR")}</p>
        </div>

        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <Link
            href={`/mes-colis/${sh.id}`}
            className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-sm font-bold text-gray-600 hover:text-[#0a0a0a] transition text-center"
          >
            Voir détails →
          </Link>
          {sh.status === "ACCEPTED" && (
            <>
              <Link
                href={`/payment/${sh.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition shadow-md shadow-blue-200 text-center"
                style={{ backgroundColor: "#2563eb" }}
              >
                <CreditCard className="h-4 w-4" />
                Payer maintenant
              </Link>
              <button
                onClick={onConfirmDeposit}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 disabled:opacity-50"
              >
                <Building2 className="h-4 w-4" />
                {actionLoading ? "Confirmation…" : "Confirmer dépôt"}
              </button>
            </>
          )}
          {sh.status === "DELIVERED" && !reviewSent && (
            <button
              onClick={() => setShowReview(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-sm font-bold transition"
            >
              <Star className="h-4 w-4" />
              Laisser un avis
            </button>
          )}
          {reviewSent && (
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Avis envoyé
            </div>
          )}
        </div>
      </div>

      {showReview && (
        <div className="border-t border-amber-100 p-5 bg-amber-50">
          <div className="font-bold text-sm mb-3 flex items-center gap-2 text-amber-700">
            <Star className="h-4 w-4" />
            Votre avis pour {t.agency_name}
          </div>
          <div className="flex gap-1 mb-3">
            {[1,2,3,4,5].map((s) => (
              <button key={s} type="button" onClick={() => setReviewRating(s)}>
                <Star className={`h-6 w-6 transition ${s <= reviewRating ? "text-amber-400 fill-amber-400" : "text-gray-300 fill-gray-300"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Partagez votre expérience (optionnel)…"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-white border border-amber-200 focus:border-amber-400 focus:outline-none text-sm text-[#0a0a0a] placeholder:text-gray-400 mb-3 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={submitReview} disabled={reviewLoading}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-bold transition">
              {reviewLoading ? "Envoi…" : "Envoyer"}
            </button>
            <button onClick={() => setShowReview(false)}
              className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition">
              Annuler
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
