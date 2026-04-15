"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, fetchMe, authHeader } from "@/lib/api";
import {
  CheckCircle2, XCircle, Clock, Truck, MapPin, Building2, Home, Package, ArrowRight
} from "lucide-react";

type Shipment = {
  id: number;
  status: string;
  weight_kg: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  description: string;
  delivery_type: string;
  delivery_address: string;
  created_at: string;
  trip_summary: {
    id: number;
    route: string;
    capacity_kg: number;
    price_per_kg: number;
    departure_at: string;
  };
};

const ALL_STATUSES = [
  { key: "PENDING",    label: "En attente" },
  { key: "ACCEPTED",  label: "Acceptées" },
  { key: "REJECTED",  label: "Refusées" },
  { key: "DEPOSITED", label: "Déposées" },
  { key: "IN_TRANSIT",label: "En transit" },
  { key: "ARRIVED",   label: "Arrivées" },
  { key: "DELIVERED", label: "Livrées" },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING:    "En attente",
  ACCEPTED:   "Accepté",
  REJECTED:   "Refusé",
  DEPOSITED:  "Déposé au bureau",
  IN_TRANSIT: "En transit",
  ARRIVED:    "Arrivé",
  DELIVERED:  "Livré",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:    "bg-amber-100 text-amber-800 border-amber-200",
  ACCEPTED:   "bg-blue-100 text-blue-800 border-blue-200",
  REJECTED:   "bg-rose-100 text-rose-800 border-rose-200",
  DEPOSITED:  "bg-purple-100 text-purple-800 border-purple-200",
  IN_TRANSIT: "bg-purple-100 text-purple-800 border-purple-200",
  ARRIVED:    "bg-emerald-100 text-emerald-800 border-emerald-200",
  DELIVERED:  "bg-emerald-100 text-emerald-800 border-emerald-200",
};

// Actions the agency can trigger, depending on current status
const AGENCY_ACTIONS: Record<string, { status: string; label: string; color: string }[]> = {
  PENDING:    [
    { status: "ACCEPTED",   label: "Accepter",              color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    { status: "REJECTED",   label: "Refuser",               color: "bg-rose-600 hover:bg-rose-700 text-white" },
  ],
  DEPOSITED:  [
    { status: "IN_TRANSIT", label: "Marquer en transit",    color: "bg-purple-600 hover:bg-purple-700 text-white" },
  ],
  IN_TRANSIT: [
    { status: "ARRIVED",    label: "Marquer arrivé",        color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  ],
  ARRIVED:    [
    { status: "DELIVERED",  label: "Marquer livré",         color: "bg-emerald-700 hover:bg-emerald-800 text-white" },
  ],
};

export default function AgencyShipmentsPage() {
  const router = useRouter();
  const [bootLoading, setBootLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [items, setItems]               = useState<Shipment[]>([]);
  const [loading, setLoading]           = useState(false);
  const [actionId, setActionId]         = useState<number | null>(null);
  const [err, setErr]                   = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then((me) => { if (me.role !== "AGENCY") router.push("/trips"); })
      .catch(() => router.push("/login"))
      .finally(() => setBootLoading(false));
  }, [router]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/agency/shipments/?status=${statusFilter}`, {
        headers: authHeader(),
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.detail || "Erreur chargement demandes");
      setItems(data);
    } catch (e: any) {
      setErr(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!bootLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootLoading, statusFilter]);

  async function doAction(id: number, newStatus: string) {
    setActionId(id);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/shipments/${id}/tracking/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Impossible de changer le statut");
      // remove from list if filter no longer matches
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setErr(e.message || "Erreur");
    } finally {
      setActionId(null);
    }
  }

  if (bootLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-700">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 print:bg-white">

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 print:hidden">
          <div>
            <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">Mon agence</div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Demandes de colis</h1>
            <p className="mt-1 text-slate-500 text-sm">Gère les envois et mets à jour le suivi à chaque étape.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700"
            >
              Exporter PDF
            </button>
            <Link className="text-sm font-semibold text-blue-600 hover:underline" href="/dashboard/agency">
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Print header (visible only in print) */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-extrabold">Luggo — Demandes de colis</h1>
          <p className="text-sm text-slate-500">Exporté le {new Date().toLocaleDateString("fr-FR")} · Statut : {statusFilter}</p>
        </div>

        {/* Filtre statut */}
        <div className="flex flex-wrap gap-2 mb-6 print:hidden">
          {ALL_STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                statusFilter === s.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {err && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500">Chargement...</p>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="text-slate-500 font-medium">Aucune demande dans cette catégorie.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((s) => {
              const actions = AGENCY_ACTIONS[s.status] ?? [];
              return (
                <article key={s.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-blue-50/40 to-white flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-xs text-slate-400 font-medium mb-0.5">Demande #{s.id}</div>
                      <div className="font-extrabold text-lg">{s.trip_summary?.route}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLOR[s.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 grid gap-1 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-800">Client :</span> {s.customer_name}</p>
                      <p><span className="font-semibold text-slate-800">Email :</span> {s.customer_email}</p>
                      <p><span className="font-semibold text-slate-800">Tél :</span> {s.customer_phone}</p>
                      <p><span className="font-semibold text-slate-800">Poids :</span> {s.weight_kg} kg</p>
                      {s.description && (
                        <p><span className="font-semibold text-slate-800">Contenu :</span> {s.description}</p>
                      )}
                      <p className="flex items-center gap-1">
                        {s.delivery_type === "HOME_DELIVERY"
                          ? <><Home className="h-3.5 w-3.5 shrink-0" /> Livraison domicile — {s.delivery_address}</>
                          : <><Building2 className="h-3.5 w-3.5 shrink-0" /> Retrait au bureau</>}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Créé le {new Date(s.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>

                    {/* Actions — hidden in print */}
                    {actions.length > 0 && (
                      <div className="flex flex-col gap-2 min-w-[200px] print:hidden">
                        {actions.map((a) => (
                          <button
                            key={a.status}
                            onClick={() => doAction(s.id, a.status)}
                            disabled={actionId === s.id}
                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition ${a.color}`}
                          >
                            {actionId === s.id ? "En cours…" : a.label}
                          </button>
                        ))}
                      </div>
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

