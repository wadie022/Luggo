"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, fetchMe, authHeader, logout } from "@/lib/api";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  ShieldAlert,
  Plus,
  Phone,
  Mail,
  MapPin,
  Package,
  CreditCard,
  Menu,
  X,
  Star,
  CheckCircle2,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

// ─── Types ───────────────────────────────────────────────────────────────────

type Trip = {
  id: number;
  origin_country: string;
  origin_city: string;
  dest_country: string;
  dest_city: string;
  departure_at: string;
  arrival_eta: string | null;
  capacity_kg: number;
  price_per_kg: number;
  status: string;
  used_kg: number;
  pending_kg: number;
};

type Shipment = {
  id: number;
  trip: number;
  trip_summary: {
    id: number;
    price_per_kg: number;
    route: string;
    capacity_kg: number;
    departure_at: string;
  };
  user_id: number | null;
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

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING: {
    label: "En attente",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  ACCEPTED: {
    label: "Accepté",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  REJECTED: {
    label: "Refusé",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  DEPOSITED: {
    label: "Déposé en agence",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  IN_TRANSIT: {
    label: "En transit",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
  ARRIVED: {
    label: "Arrivé",
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
  },
  DELIVERED: {
    label: "Livré",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function TopBar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const navLinks = [
    { href: "/dashboard/agency/shipments", label: "Demandes" },
    { href: "/dashboard/agency/branches", label: "Adresses" },
    { href: "/reclamations", label: "Réclamations" },
    { href: "/dashboard/agency/profile", label: "Profil" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard/agency" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-lg select-none">
            L
          </div>
          <span className="font-bold text-white text-lg">Luggo</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="ml-1 px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            Déconnexion
          </button>
        </nav>

        {/* Mobile right */}
        <div className="flex md:hidden items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 rounded-xl text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-3 flex flex-col gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-slate-800 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      )}
    </header>
  );
}

// ─── Shipment card ────────────────────────────────────────────────────────────

function ShipmentCard({
  shipment,
  pricePerKg,
  onStatusChange,
}: {
  shipment: Shipment;
  pricePerKg: number;
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
    } finally {
      setReviewLoading(false);
    }
  }

  async function changeStatus(newStatus: string) {
    setUpdating(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/shipments/${shipment.id}/tracking/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Impossible de mettre à jour le statut.");
      }
      onStatusChange(shipment.id, newStatus);
    } catch (e: any) {
      setErr(e.message || "Erreur");
    } finally {
      setUpdating(false);
    }
  }

  const total = (shipment.weight_kg * pricePerKg).toFixed(2);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-xs text-slate-400">Demande #{shipment.id}</p>
          <p className="font-bold text-slate-900 text-base mt-0.5">
            {shipment.customer_name}
          </p>
        </div>
        <StatusBadge status={shipment.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {/* Client info */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Client
          </p>
          <div className="flex items-center gap-2 text-slate-700">
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{shipment.customer_email}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{shipment.customer_phone || "—"}</span>
          </div>
        </div>

        {/* Colis */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Colis
          </p>
          <div className="flex items-center gap-2 text-slate-700">
            <Package className="h-4 w-4 shrink-0 text-slate-400" />
            <span>
              <span className="font-semibold">{shipment.weight_kg} kg</span>
              {shipment.description ? ` — ${shipment.description}` : ""}
            </span>
          </div>
        </div>

        {/* Livraison */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Livraison
          </p>
          <div className="flex items-start gap-2 text-slate-700">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            <span>
              {shipment.delivery_type === "HOME_DELIVERY"
                ? "Livraison à domicile"
                : "Dépôt en agence"}
              {shipment.delivery_type === "HOME_DELIVERY" &&
                shipment.delivery_address && (
                  <span className="block text-slate-500 text-xs mt-0.5">
                    {shipment.delivery_address}
                  </span>
                )}
            </span>
          </div>
        </div>

        {/* Paiement */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Paiement
          </p>
          <div className="flex items-center gap-2 text-slate-700">
            <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
            <span>
              {shipment.weight_kg} kg × {pricePerKg} €/kg ={" "}
              <span className="font-bold">{total} €</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {shipment.status !== "REJECTED" && shipment.status !== "DELIVERED" && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          {shipment.status === "PENDING" && (
            <>
              <button
                onClick={() => changeStatus("ACCEPTED")}
                disabled={updating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-sm font-semibold disabled:opacity-60 transition-colors"
              >
                ✓ Accepter
              </button>
              <button
                onClick={() => changeStatus("REJECTED")}
                disabled={updating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-sm font-semibold disabled:opacity-60 transition-colors"
              >
                ✗ Refuser
              </button>
            </>
          )}
          {shipment.status === "ACCEPTED" && (
            <button
              onClick={() => changeStatus("DEPOSITED")}
              disabled={updating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              📦 Colis reçu en agence
            </button>
          )}
          {shipment.status === "DEPOSITED" && (
            <button
              onClick={() => changeStatus("IN_TRANSIT")}
              disabled={updating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              🚚 Marquer en transit
            </button>
          )}
          {shipment.status === "IN_TRANSIT" && (
            <button
              onClick={() => changeStatus("ARRIVED")}
              disabled={updating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              ✈️ Marquer arrivé
            </button>
          )}
          {shipment.status === "ARRIVED" && (
            <button
              onClick={() => changeStatus("DELIVERED")}
              disabled={updating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              ✅ Confirmer livraison
            </button>
          )}
        </div>
      )}

      {/* Review button for DELIVERED shipments */}
      {shipment.status === "DELIVERED" && shipment.user_id && !reviewSent && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={() => setShowReview(!showReview)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-semibold"
          >
            <Star className="h-4 w-4" />
            Évaluer ce client
          </button>
        </div>
      )}
      {shipment.status === "DELIVERED" && reviewSent && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Avis envoyé
          </div>
        </div>
      )}

      {showReview && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="font-semibold text-sm mb-2">Avis pour {shipment.customer_name}</div>
          <div className="flex gap-1 mb-3">
            {[1,2,3,4,5].map((s) => (
              <button key={s} type="button" onClick={() => setReviewRating(s)}>
                <Star className={`h-6 w-6 transition ${s <= reviewRating ? "text-amber-400 fill-amber-400" : "text-slate-300 fill-slate-300"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Commentaire (optionnel)…"
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-2 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={submitReview} disabled={reviewLoading}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold">
              {reviewLoading ? "Envoi…" : "Envoyer"}
            </button>
            <button onClick={() => setShowReview(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
              Annuler
            </button>
          </div>
        </div>
      )}

      {err && (
        <p className="mt-2 text-xs text-red-600">{err}</p>
      )}
    </div>
  );
}

// ─── Trip card ────────────────────────────────────────────────────────────────

function TripCard({
  trip,
  allShipments,
  onDelete,
  onShipmentStatusChange,
  expandedTripId,
  setExpandedTripId,
}: {
  trip: Trip;
  allShipments: Shipment[];
  onDelete: (id: number) => void;
  onShipmentStatusChange: (shipmentId: number, newStatus: string) => void;
  expandedTripId: number | null;
  setExpandedTripId: (id: number | null) => void;
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const isExpanded = expandedTripId === trip.id;
  const shipments = allShipments.filter(
    (s) => s.trip_summary?.id === trip.id
  );

  async function handleDelete() {
    if (!confirm("Supprimer ce trajet définitivement ?")) return;
    setDeletingId(trip.id);
    setDeleteErr(null);
    try {
      const res = await fetch(`${API_BASE}/agency/trips/${trip.id}/`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Suppression impossible.");
      }
      onDelete(trip.id);
    } catch (e: any) {
      setDeleteErr(e.message || "Erreur");
    } finally {
      setDeletingId(null);
    }
  }

  const available_kg = trip.capacity_kg - trip.used_kg;

  const tripStatusCfg = STATUS_CONFIG[trip.status] ?? {
    label: trip.status,
    color: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-200",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Left: trip info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs text-slate-400">Trajet #{trip.id}</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tripStatusCfg.bg} ${tripStatusCfg.color} ${tripStatusCfg.border}`}
              >
                {tripStatusCfg.label}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              {trip.origin_city} ({trip.origin_country}) →{" "}
              {trip.dest_city} ({trip.dest_country})
            </h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              <span>
                Départ :{" "}
                <span className="font-medium">
                  {new Date(trip.departure_at).toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </span>
              {trip.arrival_eta && (
                <span>
                  Arrivée estimée :{" "}
                  <span className="font-medium">
                    {new Date(trip.arrival_eta).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
              <span>
                Capacité :{" "}
                <span className="font-semibold">{trip.capacity_kg} kg</span>
              </span>
              <span>
                Utilisé :{" "}
                <span className="font-semibold">{trip.used_kg} kg</span>
              </span>
              <span>
                Disponible :{" "}
                <span className="font-semibold text-emerald-700">
                  {available_kg} kg
                </span>
              </span>
              <span>
                Prix :{" "}
                <span className="font-semibold">{trip.price_per_kg} €/kg</span>
              </span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex flex-wrap md:flex-col gap-2 md:w-48 shrink-0">
            <Link
              href={`/dashboard/agency/trips/${trip.id}/edit`}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-sm font-semibold transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </Link>

            {trip.used_kg === 0 && (
              <button
                onClick={handleDelete}
                disabled={deletingId === trip.id}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-60 text-sm font-semibold transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                {deletingId === trip.id ? "Suppression…" : "Supprimer"}
              </button>
            )}

            <button
              onClick={() =>
                setExpandedTripId(isExpanded ? null : trip.id)
              }
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700 text-sm font-semibold transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Masquer
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Voir les demandes ({shipments.length})
                </>
              )}
            </button>
          </div>
        </div>

        {deleteErr && (
          <p className="mt-3 text-sm text-red-600">{deleteErr}</p>
        )}
      </div>

      {/* Expanded shipments */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
          <p className="text-sm font-semibold text-slate-500 mb-4">
            Demandes pour ce trajet ({shipments.length})
          </p>
          {shipments.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aucune demande pour ce trajet.
            </p>
          ) : (
            <div className="grid gap-4">
              {shipments.map((s) => (
                <ShipmentCard
                  key={s.id}
                  shipment={s}
                  pricePerKg={trip.price_per_kg}
                  onStatusChange={onShipmentStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgencyDashboardPage() {
  const router = useRouter();

  const [bootLoading, setBootLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsErr, setTripsErr] = useState<string | null>(null);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [kycStatus, setKycStatus] = useState<string>("PENDING");
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null);

  // Boot: verify role, then fetch agency kyc_status
  useEffect(() => {
    async function boot() {
      try {
        const me = await fetchMe();
        if (me.role !== "AGENCY") {
          router.push("/trips");
          return;
        }
        // Fetch agency profile to get kyc_status (agency-level, not user-level)
        try {
          const profileRes = await fetch(`${API_BASE}/agency/profile/`, {
            headers: authHeader(),
          });
          if (profileRes.ok) {
            const profile = await profileRes.json().catch(() => ({}));
            setKycStatus(profile.kyc_status ?? "PENDING");
          }
        } catch {
          // fallback silencieux
        }
      } catch {
        router.push("/login");
        return;
      } finally {
        setBootLoading(false);
      }
    }
    boot();
  }, [router]);

  // Load trips and all shipments once boot completes
  useEffect(() => {
    if (!bootLoading) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootLoading]);

  async function loadData() {
    setTripsLoading(true);
    setTripsErr(null);
    try {
      const [tripsRes, shipmentsRes] = await Promise.all([
        fetch(`${API_BASE}/agency/trips/`, {
          headers: { "Content-Type": "application/json", ...authHeader() },
        }),
        fetch(`${API_BASE}/agency/shipments/`, {
          headers: { "Content-Type": "application/json", ...authHeader() },
        }),
      ]);

      const tripsData = await tripsRes.json().catch(() => []);
      if (!tripsRes.ok)
        throw new Error(tripsData?.detail || "Erreur chargement trajets.");
      setTrips(Array.isArray(tripsData) ? tripsData : []);

      const shipmentsData = await shipmentsRes.json().catch(() => []);
      if (shipmentsRes.ok) {
        setShipments(Array.isArray(shipmentsData) ? shipmentsData : []);
      }
    } catch (e: any) {
      setTripsErr(e.message || "Erreur");
    } finally {
      setTripsLoading(false);
    }
  }

  function handleTripDelete(id: number) {
    setTrips((prev) => prev.filter((t) => t.id !== id));
    if (expandedTripId === id) setExpandedTripId(null);
  }

  function handleShipmentStatusChange(shipmentId: number, newStatus: string) {
    setShipments((prev) =>
      prev.map((s) =>
        s.id === shipmentId ? { ...s, status: newStatus } : s
      )
    );
  }

  if (bootLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm animate-pulse">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar />

      {/* KYB status banner */}
      {kycStatus !== "VERIFIED" && (
        <div
          className={`border-b px-4 py-3 ${
            kycStatus === "REJECTED"
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="mx-auto max-w-6xl flex items-center gap-3">
            <ShieldAlert
              className={`h-5 w-5 shrink-0 ${
                kycStatus === "REJECTED" ? "text-red-600" : "text-amber-600"
              }`}
            />
            <p
              className={`text-sm font-medium flex-1 ${
                kycStatus === "REJECTED" ? "text-red-700" : "text-amber-700"
              }`}
            >
              {kycStatus === "REJECTED"
                ? "Votre dossier entreprise a été rejeté. Vous ne pouvez pas publier de trajets."
                : "Votre entreprise n'est pas encore vérifiée. Vous ne pouvez pas publier de trajets."}
            </p>
            <Link
              href="/dashboard/agency/kyb"
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                kycStatus === "REJECTED"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
            >
              Vérifier mon entreprise →
            </Link>
          </div>
        </div>
      )}

      {/* Page content */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Mes trajets
            </h1>
            <p className="mt-1 text-slate-500 text-sm">
              Gérez vos trajets et les demandes de vos clients.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={tripsLoading}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 disabled:opacity-60 transition-colors"
            >
              {tripsLoading ? "Chargement…" : "Rafraîchir"}
            </button>
            <Link
              href="/dashboard/agency/trips/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              <Plus className="h-4 w-4" />
              Publier un trajet
            </Link>
          </div>
        </div>

        {/* Error */}
        {tripsErr && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {tripsErr}
          </div>
        )}

        {/* Trips list */}
        {tripsLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-400 text-sm animate-pulse">
              Chargement des trajets…
            </p>
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Aucun trajet pour le moment.</p>
            <p className="text-slate-400 text-sm mt-1">
              Publiez votre premier trajet pour commencer à recevoir des demandes.
            </p>
            <Link
              href="/dashboard/agency/trips/new"
              className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              <Plus className="h-4 w-4" />
              Publier un trajet
            </Link>
          </div>
        ) : (
          <div className="grid gap-5">
            {trips.map((trip) => (
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
