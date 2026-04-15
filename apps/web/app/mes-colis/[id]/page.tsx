"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { API_BASE, authHeader, fetchMe } from "@/lib/api";
import {
  ArrowLeft, ArrowRight, Clock, CheckCircle2, Building2, Truck, MapPin, Home, XCircle, Package
} from "lucide-react";
import ClientNavbar from "@/components/ClientNavbar";

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
  { key: "PENDING",    label: "En attente",          icon: Clock },
  { key: "ACCEPTED",   label: "Accepté",             icon: CheckCircle2 },
  { key: "DEPOSITED",  label: "Déposé au bureau",    icon: Building2 },
  { key: "IN_TRANSIT", label: "En transit",           icon: Truck },
  { key: "ARRIVED",    label: "Arrivé à destination", icon: MapPin },
  { key: "DELIVERED",  label: "Livré",                icon: CheckCircle2 },
];

const STATUS_ORDER = ["PENDING", "ACCEPTED", "DEPOSITED", "IN_TRANSIT", "ARRIVED", "DELIVERED"];

const STATUS_COLOR: Record<string, string> = {
  PENDING:    "text-amber-600 bg-amber-50 border-amber-200",
  ACCEPTED:   "text-blue-600 bg-blue-50 border-blue-200",
  DEPOSITED:  "text-blue-600 bg-blue-50 border-blue-200",
  IN_TRANSIT: "text-purple-600 bg-purple-50 border-purple-200",
  ARRIVED:    "text-emerald-600 bg-emerald-50 border-emerald-200",
  DELIVERED:  "text-emerald-700 bg-emerald-50 border-emerald-200",
  REJECTED:   "text-red-600 bg-red-50 border-red-200",
};

export default function ShipmentDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [sh, setSh]       = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchMe().catch(() => router.replace("/login"));
    fetch(`${API_BASE}/shipments/${id}/`, { headers: authHeader() })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setSh)
      .catch(() => router.replace("/mes-colis"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function confirmDeposit() {
    if (!confirm("Confirmer que tu as déposé ton colis au bureau de départ ?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/shipments/${id}/tracking/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status: "DEPOSITED" }),
      });
      if (res.ok) setSh(await res.json());
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-slate-500">Chargement…</p>
    </main>
  );

  if (!sh) return null;

  const t = sh.trip_detail;
  const currentIdx = STATUS_ORDER.indexOf(sh.status);
  const isRejected = sh.status === "REJECTED";
  const estimatedPrice = sh.weight_kg * t.price_per_kg;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <ClientNavbar />

      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/mes-colis" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour à mes colis
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">Colis #{sh.id}</div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              {t.origin_city} <ArrowRight className="h-5 w-5 text-blue-500" /> {t.dest_city}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{t.origin_country} → {t.dest_country} · {t.agency_name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full border text-xs font-bold ${STATUS_COLOR[sh.status] ?? "bg-slate-50 border-slate-200 text-slate-600"}`}>
            {TRACKING_STEPS.find((s) => s.key === sh.status)?.label ?? sh.status}
          </span>
        </div>

        {/* Timeline */}
        {!isRejected && (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 mb-5">
            <h2 className="font-bold text-slate-800 mb-5">Suivi du colis</h2>
            <div className="relative">
              {TRACKING_STEPS.map((step, i) => {
                const done   = currentIdx >= i;
                const active = currentIdx === i;
                const Icon   = step.icon;
                return (
                  <div key={step.key} className="flex items-start gap-4 mb-5 last:mb-0">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center transition ${
                        active ? "bg-blue-600 text-white shadow-md shadow-blue-200" :
                        done   ? "bg-emerald-100 text-emerald-600" :
                        "bg-slate-100 text-slate-400"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {i < TRACKING_STEPS.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 rounded ${done && currentIdx > i ? "bg-emerald-300" : "bg-slate-200"}`} />
                      )}
                    </div>
                    <div className="pt-1.5">
                      <div className={`font-semibold text-sm ${active ? "text-blue-700" : done ? "text-emerald-700" : "text-slate-400"}`}>
                        {step.label}
                      </div>
                      {active && (
                        <div className="text-xs text-blue-500 mt-0.5">Étape actuelle</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isRejected && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 mb-5 flex items-center gap-3 text-red-700">
            <XCircle className="h-5 w-5 shrink-0" />
            <div>
              <div className="font-bold">Colis refusé par l'agence</div>
              <div className="text-sm text-red-600 mt-0.5">Contacte l'agence pour plus d'informations.</div>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {/* Infos colis */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" /> Détails du colis
            </h2>
            <dl className="grid gap-2 text-sm">
              <Row label="Poids">{sh.weight_kg} kg</Row>
              {sh.description && <Row label="Contenu">{sh.description}</Row>}
              <Row label="Mode de réception">
                <span className="flex items-center gap-1">
                  {sh.delivery_type === "HOME_DELIVERY"
                    ? <><Home className="h-3.5 w-3.5" /> Livraison à domicile</>
                    : <><Building2 className="h-3.5 w-3.5" /> Retrait au bureau</>}
                </span>
              </Row>
              {sh.delivery_type === "HOME_DELIVERY" && sh.delivery_address && (
                <Row label="Adresse">{sh.delivery_address}</Row>
              )}
              <Row label="Créé le">{new Date(sh.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</Row>
            </dl>
          </div>

          {/* Infos trajet + prix */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-500" /> Trajet & tarif
            </h2>
            <dl className="grid gap-2 text-sm">
              <Row label="Agence">{t.agency_name}</Row>
              <Row label="Départ">{new Date(t.departure_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</Row>
              {t.arrival_eta && <Row label="Arrivée estimée">{new Date(t.arrival_eta).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</Row>}
              <Row label="Tarif">{t.price_per_kg} €/kg</Row>
              <Row label="Montant estimé">
                <span className="font-bold text-blue-700">{estimatedPrice.toFixed(2)} €</span>
              </Row>
            </dl>
          </div>
        </div>

        {/* Contact info */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 mb-5 text-sm text-slate-600">
          <div className="font-semibold text-slate-800 mb-2">Coordonnées</div>
          <div className="grid gap-1">
            <p><span className="font-medium">Nom :</span> {sh.customer_name}</p>
            <p><span className="font-medium">Email :</span> {sh.customer_email}</p>
            <p><span className="font-medium">Tél :</span> {sh.customer_phone}</p>
          </div>
        </div>

        {/* Action confirm deposit */}
        {sh.status === "ACCEPTED" && (
          <button
            onClick={confirmDeposit}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm transition"
          >
            <Building2 className="h-4 w-4" />
            {actionLoading ? "Confirmation…" : "Confirmer le dépôt au bureau de départ"}
          </button>
        )}
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 shrink-0 w-32">{label} :</span>
      <span className="font-medium text-slate-800">{children}</span>
    </div>
  );
}
