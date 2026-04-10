"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe, logout, getRole } from "@/lib/api";
import { Package, MapPin, ArrowRight, Clock, CheckCircle2, XCircle, Truck, Home, Building2 } from "lucide-react";
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
  { key: "PENDING",    label: "En attente",         icon: Clock },
  { key: "ACCEPTED",   label: "Accepté",            icon: CheckCircle2 },
  { key: "DEPOSITED",  label: "Déposé au bureau",   icon: Building2 },
  { key: "IN_TRANSIT", label: "En transit",          icon: Truck },
  { key: "ARRIVED",    label: "Arrivé à destination",icon: MapPin },
  { key: "DELIVERED",  label: "Livré",               icon: CheckCircle2 },
];

const STATUS_ORDER = ["PENDING", "ACCEPTED", "DEPOSITED", "IN_TRANSIT", "ARRIVED", "DELIVERED"];

const STATUS_COLOR: Record<string, string> = {
  PENDING:    "text-amber-600",
  ACCEPTED:   "text-blue-600",
  DEPOSITED:  "text-blue-600",
  IN_TRANSIT: "text-purple-600",
  ARRIVED:    "text-emerald-600",
  DELIVERED:  "text-emerald-700",
  REJECTED:   "text-red-600",
};

export default function MesColisPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const role = typeof window === "undefined" ? null : getRole();

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
            <Link href="/trips" className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">Trajets</Link>
            <NotificationBell />
            <button onClick={handleLogout} className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">Mon espace</div>
        <h1 className="text-2xl md:text-3xl font-extrabold mb-1">Mes colis</h1>
        <p className="text-slate-500 text-sm mb-8">Suis l'état de tous tes envois en temps réel.</p>

        {shipments.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Aucun colis pour le moment.</p>
            <Link href="/trips" className="mt-4 inline-block px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">
              Voir les trajets →
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {shipments.map((sh) => (
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
  sh: Shipment;
  onConfirmDeposit: () => void;
  actionLoading: boolean;
}) {
  const t = sh.trip_detail;
  const currentIdx = STATUS_ORDER.indexOf(sh.status);
  const isRejected = sh.status === "REJECTED";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header trajet */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-blue-50/60 to-white">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 font-extrabold text-lg tracking-tight">
            <span>{t.origin_city}</span>
            <ArrowRight className="h-4 w-4 text-blue-500 shrink-0" />
            <span>{t.dest_city}</span>
          </div>
          <span className={`text-xs font-bold ${STATUS_COLOR[sh.status] ?? "text-slate-600"}`}>
            {TRACKING_STEPS.find((s) => s.key === sh.status)?.label ?? sh.status}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500 font-medium">
          {t.origin_country} → {t.dest_country} · {t.agency_name} · {sh.weight_kg} kg
        </div>
      </div>

      {/* Tracking timeline */}
      {!isRejected && (
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {TRACKING_STEPS.map((step, i) => {
              const done = currentIdx >= i;
              const active = currentIdx === i;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-center gap-1 shrink-0">
                  <div className={`flex flex-col items-center gap-1`}>
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center transition ${
                      active ? "bg-blue-600 text-white" :
                      done ? "bg-emerald-100 text-emerald-600" :
                      "bg-slate-100 text-slate-400"
                    }`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className={`text-[10px] font-semibold text-center max-w-[60px] leading-tight ${
                      active ? "text-blue-600" : done ? "text-emerald-600" : "text-slate-400"
                    }`}>{step.label}</span>
                  </div>
                  {i < TRACKING_STEPS.length - 1 && (
                    <div className={`h-0.5 w-6 mb-4 shrink-0 rounded ${done && currentIdx > i ? "bg-emerald-400" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isRejected && (
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 text-red-600 text-sm">
          <XCircle className="h-4 w-4 shrink-0" /> Colis refusé par l'agence.
        </div>
      )}

      {/* Infos */}
      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 grid gap-1 text-sm text-slate-600">
          {sh.description && <p><span className="font-semibold text-slate-800">Description :</span> {sh.description}</p>}
          <p className="flex items-center gap-1">
            {sh.delivery_type === "HOME_DELIVERY" ? <Home className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
            {sh.delivery_type === "HOME_DELIVERY" ? `Livraison domicile — ${sh.delivery_address}` : "Retrait au bureau"}
          </p>
          <p className="text-xs text-slate-400">Créé le {new Date(sh.created_at).toLocaleDateString("fr-FR")}</p>
        </div>

        {/* Action client */}
        {sh.status === "ACCEPTED" && (
          <button
            onClick={onConfirmDeposit}
            disabled={actionLoading}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition"
          >
            <Building2 className="h-4 w-4" />
            {actionLoading ? "Confirmation…" : "Confirmer dépôt"}
          </button>
        )}
      </div>
    </article>
  );
}
