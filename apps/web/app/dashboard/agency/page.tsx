"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, fetchMe, authHeader, logout } from "@/lib/api";
import {
  ChevronDown, ChevronUp, Pencil, Trash2, ShieldAlert,
  Plus, Phone, Mail, MapPin, Package, CreditCard, Menu, X, Star, CheckCircle2,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type Trip = {
  id: number; origin_country: string; origin_city: string;
  dest_country: string; dest_city: string;
  departure_at: string; arrival_eta: string | null;
  capacity_kg: number; price_per_kg: number; status: string;
  used_kg: number; pending_kg: number;
};

type Shipment = {
  id: number; trip: number;
  trip_summary: { id: number; price_per_kg: number; route: string; capacity_kg: number; departure_at: string; };
  user_id: number | null; customer_name: string; customer_email: string; customer_phone: string;
  weight_kg: number; description: string; delivery_type: string;
  delivery_address: string; status: string; created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: "En attente",       cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  ACCEPTED:   { label: "Accepté",          cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  REJECTED:   { label: "Refusé",           cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  DEPOSITED:  { label: "Déposé",           cls: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  IN_TRANSIT: { label: "En transit",        cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  ARRIVED:    { label: "Arrivé",           cls: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  DELIVERED:  { label: "Livré",            cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  PUBLISHED:  { label: "Publié",           cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: "bg-white/5 text-white/50 border-white/10" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function TopBar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  function handleLogout() { logout(); router.replace("/login"); }

  const navLinks = [
    { href: "/dashboard/agency/shipments", label: "Demandes" },
    { href: "/dashboard/agency/messages", label: "Messages" },
    { href: "/dashboard/agency/branches", label: "Adresses" },
    { href: "/reclamations", label: "Réclamations" },
    { href: "/dashboard/agency/profile", label: "Profil" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#080808]/95 backdrop-blur border-b border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
        <Link href="/dashboard/agency" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">L</div>
          <span className="font-black text-lg text-white">Luggo</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className="px-3 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">
              {l.label}
            </Link>
          ))}
          <NotificationBell />
          <button onClick={handleLogout}
            className="ml-1 px-3 py-2 rounded-xl text-sm font-semibold text-white/40 hover:text-white hover:bg-white/[0.06] transition">
            Déconnexion
          </button>
        </nav>

        <div className="flex md:hidden items-center gap-2">
          <NotificationBell />
          <button onClick={() => setMobileOpen(v => !v)}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#0d0d0d] border-t border-white/[0.06] px-5 py-3 flex flex-col gap-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">
              {l.label}
            </Link>
          ))}
          <button onClick={handleLogout}
            className="text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-white/[0.06] transition">
            Déconnexion
          </button>
        </div>
      )}
    </header>
  );
}

function ShipmentCard({ shipment, pricePerKg, onStatusChange }: {
  shipment: Shipment; pricePerKg: number;
  onStatusChange: (id: number, newStatus: string) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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
        body: JSON.stringify({ reviewed_user: shipment.user_id, shipment: shipment.id, rating: reviewRating, comment: reviewComment }),
      });
      if (res.ok) { setReviewSent(true); setShowReview(false); }
    } finally { setReviewLoading(false); }
  }

  async function changeStatus(newStatus: string) {
    setUpdating(true); setErr(null);
    try {
      const res = await fetch(`${API_BASE}/shipments/${shipment.id}/tracking/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Impossible de mettre à jour.");
      }
      onStatusChange(shipment.id, newStatus);
    } catch (e: any) {
      setErr(e.message || "Erreur");
    } finally { setUpdating(false); }
  }

  const total = (shipment.weight_kg * pricePerKg).toFixed(2);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d0d] p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-xs text-white/30">Demande #{shipment.id}</p>
          <p className="font-bold text-base mt-0.5">{shipment.customer_name}</p>
        </div>
        <StatusBadge status={shipment.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Client</p>
          <div className="flex items-center gap-2 text-white/60">
            <Mail className="h-4 w-4 shrink-0 text-white/25" />
            <span>{shipment.customer_email}</span>
          </div>
          <div className="flex items-center gap-2 text-white/60">
            <Phone className="h-4 w-4 shrink-0 text-white/25" />
            <span>{shipment.customer_phone || "—"}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Colis</p>
          <div className="flex items-center gap-2 text-white/60">
            <Package className="h-4 w-4 shrink-0 text-white/25" />
            <span><span className="font-bold text-white">{shipment.weight_kg} kg</span>{shipment.description ? ` — ${shipment.description}` : ""}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Livraison</p>
          <div className="flex items-start gap-2 text-white/60">
            <MapPin className="h-4 w-4 shrink-0 text-white/25 mt-0.5" />
            <span>
              {shipment.delivery_type === "HOME_DELIVERY" ? "Livraison à domicile" : "Dépôt en agence"}
              {shipment.delivery_type === "HOME_DELIVERY" && shipment.delivery_address && (
                <span className="block text-white/35 text-xs mt-0.5">{shipment.delivery_address}</span>
              )}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Paiement</p>
          <div className="flex items-center gap-2 text-white/60">
            <CreditCard className="h-4 w-4 shrink-0 text-white/25" />
            <span>{shipment.weight_kg} kg × {pricePerKg} €/kg = <span className="font-bold text-white">{total} €</span></span>
          </div>
        </div>
      </div>

      {shipment.status !== "REJECTED" && shipment.status !== "DELIVERED" && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap gap-2">
          {shipment.status === "PENDING" && (
            <>
              <button onClick={() => changeStatus("ACCEPTED")} disabled={updating}
                className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-bold disabled:opacity-50 transition">
                ✓ Accepter
              </button>
              <button onClick={() => changeStatus("REJECTED")} disabled={updating}
                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-bold disabled:opacity-50 transition">
                ✗ Refuser
              </button>
            </>
          )}
          {shipment.status === "ACCEPTED" && (
            <button onClick={() => changeStatus("DEPOSITED")} disabled={updating}
              className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-sm font-bold disabled:opacity-50 transition">
              📦 Colis reçu en agence
            </button>
          )}
          {shipment.status === "DEPOSITED" && (
            <button onClick={() => changeStatus("IN_TRANSIT")} disabled={updating}
              className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 text-sm font-bold disabled:opacity-50 transition">
              🚚 Marquer en transit
            </button>
          )}
          {shipment.status === "IN_TRANSIT" && (
            <button onClick={() => changeStatus("ARRIVED")} disabled={updating}
              className="px-4 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 text-sm font-bold disabled:opacity-50 transition">
              ✈️ Marquer arrivé
            </button>
          )}
          {shipment.status === "ARRIVED" && (
            <button onClick={() => changeStatus("DELIVERED")} disabled={updating}
              className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-bold disabled:opacity-50 transition">
              ✅ Confirmer livraison
            </button>
          )}
        </div>
      )}

      {shipment.status === "DELIVERED" && shipment.user_id && !reviewSent && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <button onClick={() => setShowReview(!showReview)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 text-sm font-bold transition">
            <Star className="h-4 w-4" /> Évaluer ce client
          </button>
        </div>
      )}
      {shipment.status === "DELIVERED" && reviewSent && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Avis envoyé
          </div>
        </div>
      )}

      {showReview && (
        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <div className="font-bold text-sm mb-2 text-amber-400">Avis pour {shipment.customer_name}</div>
          <div className="flex gap-1 mb-3">
            {[1,2,3,4,5].map((s) => (
              <button key={s} type="button" onClick={() => setReviewRating(s)}>
                <Star className={`h-6 w-6 transition ${s <= reviewRating ? "text-amber-400 fill-amber-400" : "text-white/15 fill-white/15"}`} />
              </button>
            ))}
          </div>
          <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Commentaire (optionnel)…" rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/50 focus:outline-none text-sm text-white placeholder:text-white/25 mb-2 resize-none" />
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
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}

function TripCard({ trip, allShipments, onDelete, onShipmentStatusChange, expandedTripId, setExpandedTripId }: {
  trip: Trip; allShipments: Shipment[]; onDelete: (id: number) => void;
  onShipmentStatusChange: (shipmentId: number, newStatus: string) => void;
  expandedTripId: number | null; setExpandedTripId: (id: number | null) => void;
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const isExpanded = expandedTripId === trip.id;
  const shipments = allShipments.filter(s => s.trip_summary?.id === trip.id);

  async function handleDelete() {
    if (!confirm("Supprimer ce trajet définitivement ?")) return;
    setDeletingId(trip.id); setDeleteErr(null);
    try {
      const res = await fetch(`${API_BASE}/agency/trips/${trip.id}/`, { method: "DELETE", headers: authHeader() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Suppression impossible.");
      }
      onDelete(trip.id);
    } catch (e: any) {
      setDeleteErr(e.message || "Erreur");
    } finally { setDeletingId(null); }
  }

  const available_kg = trip.capacity_kg - trip.used_kg;
  const usedPct = trip.capacity_kg > 0 ? Math.min(100, (trip.used_kg / trip.capacity_kg) * 100) : 0;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111111] overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs text-white/30">Trajet #{trip.id}</span>
              <StatusBadge status={trip.status} />
            </div>
            <h2 className="text-xl font-black tracking-tight">
              {trip.origin_city} ({trip.origin_country}) → {trip.dest_city} ({trip.dest_country})
            </h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/50">
              <span>Départ : <span className="font-semibold text-white/80">{new Date(trip.departure_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span></span>
              {trip.arrival_eta && (
                <span>Arrivée : <span className="font-semibold text-white/80">{new Date(trip.arrival_eta).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span></span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/50">
              <span>Capacité : <span className="font-bold text-white/80">{trip.capacity_kg} kg</span></span>
              <span>Utilisé : <span className="font-bold text-white/80">{trip.used_kg} kg</span></span>
              <span>Disponible : <span className="font-bold text-emerald-400">{available_kg} kg</span></span>
              <span>Prix : <span className="font-bold text-blue-400">{trip.price_per_kg} €/kg</span></span>
            </div>
            {/* Capacity bar */}
            <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden max-w-xs">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${usedPct}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 md:w-44 shrink-0">
            <Link href={`/dashboard/agency/trips/${trip.id}/edit`}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-sm font-bold transition">
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
            {trip.used_kg === 0 && (
              <button onClick={handleDelete} disabled={deletingId === trip.id}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-50 text-sm font-bold transition">
                <Trash2 className="h-4 w-4" />
                {deletingId === trip.id ? "Suppression…" : "Supprimer"}
              </button>
            )}
            <button onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/[0.08] text-white text-sm font-bold transition">
              {isExpanded ? <><ChevronUp className="h-4 w-4" /> Masquer</> : <><ChevronDown className="h-4 w-4" /> Demandes ({shipments.length})</>}
            </button>
          </div>
        </div>
        {deleteErr && <p className="mt-3 text-sm text-red-400">{deleteErr}</p>}
      </div>

      {isExpanded && (
        <div className="border-t border-white/[0.06] bg-white/[0.02] px-6 py-5">
          <p className="text-sm font-bold text-white/40 mb-4">Demandes pour ce trajet ({shipments.length})</p>
          {shipments.length === 0 ? (
            <p className="text-sm text-white/30">Aucune demande pour ce trajet.</p>
          ) : (
            <div className="grid gap-3">
              {shipments.map(s => (
                <ShipmentCard key={s.id} shipment={s} pricePerKg={trip.price_per_kg} onStatusChange={onShipmentStatusChange} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgencyDashboardPage() {
  const router = useRouter();
  const [bootLoading, setBootLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsErr, setTripsErr] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [kycStatus, setKycStatus] = useState<string>("PENDING");
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null);

  useEffect(() => {
    async function boot() {
      try {
        const me = await fetchMe();
        if (me.role !== "AGENCY") { router.push("/trips"); return; }
        try {
          const profileRes = await fetch(`${API_BASE}/agency/profile/`, { headers: authHeader() });
          if (profileRes.ok) {
            const profile = await profileRes.json().catch(() => ({}));
            setKycStatus(profile.kyc_status ?? "PENDING");
          }
        } catch {}
      } catch { router.push("/login"); return; }
      finally { setBootLoading(false); }
    }
    boot();
  }, [router]);

  useEffect(() => {
    if (!bootLoading) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootLoading]);

  async function loadData() {
    setTripsLoading(true); setTripsErr(null);
    try {
      const [tripsRes, shipmentsRes] = await Promise.all([
        fetch(`${API_BASE}/agency/trips/`, { headers: { "Content-Type": "application/json", ...authHeader() } }),
        fetch(`${API_BASE}/agency/shipments/`, { headers: { "Content-Type": "application/json", ...authHeader() } }),
      ]);
      const tripsData = await tripsRes.json().catch(() => []);
      if (!tripsRes.ok) throw new Error(tripsData?.detail || "Erreur chargement trajets.");
      setTrips(Array.isArray(tripsData) ? tripsData : []);
      const shipmentsData = await shipmentsRes.json().catch(() => []);
      if (shipmentsRes.ok) setShipments(Array.isArray(shipmentsData) ? shipmentsData : []);
    } catch (e: any) {
      setTripsErr(e.message || "Erreur");
    } finally { setTripsLoading(false); }
  }

  function handleTripDelete(id: number) {
    setTrips(prev => prev.filter(t => t.id !== id));
    if (expandedTripId === id) setExpandedTripId(null);
  }

  function handleShipmentStatusChange(shipmentId: number, newStatus: string) {
    setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: newStatus } : s));
  }

  if (bootLoading) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <p className="text-white/30 text-sm animate-pulse">Chargement…</p>
    </main>
  );

  const pendingCount = shipments.filter(s => s.status === "PENDING").length;

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <TopBar />

      {/* KYB banner */}
      {kycStatus !== "VERIFIED" && (
        <div className={`border-b px-5 py-3 ${kycStatus === "REJECTED" ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
          <div className="mx-auto max-w-6xl flex items-center gap-3">
            <ShieldAlert className={`h-5 w-5 shrink-0 ${kycStatus === "REJECTED" ? "text-red-400" : "text-amber-400"}`} />
            <p className={`text-sm font-medium flex-1 ${kycStatus === "REJECTED" ? "text-red-400" : "text-amber-400"}`}>
              {kycStatus === "REJECTED"
                ? "Votre dossier entreprise a été rejeté. Vous ne pouvez pas publier de trajets."
                : "Votre entreprise n'est pas encore vérifiée. Vous ne pouvez pas publier de trajets."}
            </p>
            <Link href="/dashboard/agency/kyb"
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition ${kycStatus === "REJECTED" ? "bg-red-500 text-white hover:bg-red-400" : "bg-amber-500 text-white hover:bg-amber-400"}`}>
              Vérifier mon entreprise →
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-5 py-10">
        {/* Stats row */}
        {(trips.length > 0 || shipments.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Trajets", value: trips.length, color: "text-blue-400" },
              { label: "Demandes", value: shipments.length, color: "text-white" },
              { label: "En attente", value: pendingCount, color: "text-amber-400" },
              { label: "Livrés", value: shipments.filter(s => s.status === "DELIVERED").length, color: "text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-[#111111] p-4">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
          <div>
            <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-1">Tableau de bord</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Mes trajets</h1>
            <p className="text-white/40 text-sm mt-1">Gérez vos trajets et les demandes de vos clients.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData} disabled={tripsLoading}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-sm font-bold text-white/60 hover:text-white disabled:opacity-50 transition">
              {tripsLoading ? "Chargement…" : "Rafraîchir"}
            </button>
            <Link href="/dashboard/agency/trips/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition shadow-lg shadow-blue-900/30">
              <Plus className="h-4 w-4" /> Publier un trajet
            </Link>
          </div>
        </div>

        {tripsErr && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{tripsErr}</div>
        )}

        {tripsLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-white/30 text-sm animate-pulse">Chargement des trajets…</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-white/[0.06] bg-white/[0.01]">
            <div className="h-16 w-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-white/50 font-bold">Aucun trajet pour le moment.</p>
            <p className="text-white/30 text-sm mt-1">Publiez votre premier trajet pour recevoir des demandes.</p>
            <Link href="/dashboard/agency/trips/new"
              className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition">
              <Plus className="h-4 w-4" /> Publier un trajet
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {trips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                allShipments={shipments}
                onDelete={handleTripDelete}
                onShipmentStatusChange={handleShipmentStatusChange}
                expandedTripId={expandedTripId}
                setExpandedTripId={setExpandedTripId}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
