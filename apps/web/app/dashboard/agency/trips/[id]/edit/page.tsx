"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { API_BASE, authHeader, fetchMe } from "@/lib/api";
import { Pencil, ArrowLeft, AlertTriangle } from "lucide-react";

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

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = Number(params.id);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // form fields
  const [originCountry, setOriginCountry] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [destCountry, setDestCountry] = useState("");
  const [destCity, setDestCity] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [arrivalEta, setArrivalEta] = useState("");
  const [capacityKg, setCapacityKg] = useState(0);
  const [pricePerKg, setPricePerKg] = useState(0);
  const [tripStatus, setTripStatus] = useState("PUBLISHED");

  // Auth guard
  useEffect(() => {
    fetchMe()
      .then((me) => { if (me.role !== "AGENCY") router.replace("/trips"); })
      .catch(() => router.replace("/login"));
  }, [router]);

  // Load trip
  useEffect(() => {
    if (!tripId) return;
    fetch(`${API_BASE}/agency/trips/`, { headers: authHeader() })
      .then((r) => r.json())
      .then((trips: Trip[]) => {
        const t = trips.find((x) => x.id === tripId);
        if (!t) { setErrorMsg("Trajet introuvable."); return; }
        setTrip(t);
        setOriginCountry(t.origin_country);
        setOriginCity(t.origin_city);
        setDestCountry(t.dest_country);
        setDestCity(t.dest_city);
        setDepartureAt(t.departure_at.slice(0, 16));
        setArrivalEta(t.arrival_eta ? t.arrival_eta.slice(0, 16) : "");
        setCapacityKg(t.capacity_kg);
        setPricePerKg(t.price_per_kg);
        setTripStatus(t.status);
      })
      .catch(() => setErrorMsg("Impossible de charger le trajet."))
      .finally(() => setLoading(false));
  }, [tripId]);

  const hasAccepted = (trip?.used_kg ?? 0) > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const payload = hasAccepted
      ? { capacity_kg: capacityKg }
      : {
          origin_country: originCountry.toUpperCase(),
          origin_city: originCity.trim(),
          dest_country: destCountry.toUpperCase(),
          dest_city: destCity.trim(),
          departure_at: new Date(departureAt).toISOString(),
          arrival_eta: arrivalEta ? new Date(arrivalEta).toISOString() : null,
          capacity_kg: capacityKg,
          price_per_kg: pricePerKg,
          status: tripStatus,
        };

    try {
      const res = await fetch(`${API_BASE}/agency/trips/${tripId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Erreur lors de la modification.");
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/agency"), 1000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-500">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard/agency" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold">L</div>
            <span className="font-bold text-white">Luggo</span>
          </Link>
          <span className="text-sm text-slate-300">Espace Agence</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/dashboard/agency" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour dashboard
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Pencil className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Modifier le trajet #{tripId}</h1>
            {hasAccepted && (
              <p className="text-sm text-amber-700 font-medium mt-0.5">
                Des colis sont acceptés — seule la capacité est modifiable.
              </p>
            )}
          </div>
        </div>

        {/* Avertissement cas 2 */}
        {hasAccepted && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <b>{trip?.used_kg} kg</b> sont déjà acceptés sur ce trajet. Tu ne peux modifier que la capacité totale (minimum {trip?.used_kg} kg).
            </span>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
          {errorMsg && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Trajet modifié avec succès ✅ Redirection…
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            {/* Champs complets (cas 1 seulement) */}
            {!hasAccepted && (
              <>
                <Field label="Pays d'origine (ISO)">
                  <input value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} maxLength={2} required className={input} />
                </Field>
                <Field label="Ville d'origine">
                  <input value={originCity} onChange={(e) => setOriginCity(e.target.value)} required className={input} />
                </Field>
                <Field label="Pays de destination (ISO)">
                  <input value={destCountry} onChange={(e) => setDestCountry(e.target.value)} maxLength={2} required className={input} />
                </Field>
                <Field label="Ville de destination">
                  <input value={destCity} onChange={(e) => setDestCity(e.target.value)} required className={input} />
                </Field>
                <Field label="Départ">
                  <input type="datetime-local" value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} required className={input} />
                </Field>
                <Field label="Arrivée estimée (optionnel)">
                  <input type="datetime-local" value={arrivalEta} onChange={(e) => setArrivalEta(e.target.value)} className={input} />
                </Field>
                <Field label="Prix par kg (€)">
                  <input type="number" min={0.1} step={0.1} value={pricePerKg} onChange={(e) => setPricePerKg(Number(e.target.value))} required className={input} />
                </Field>
              </>
            )}

            {/* Capacité — toujours modifiable */}
            <Field label={hasAccepted ? `Capacité totale (kg) — min ${trip?.used_kg} kg` : "Capacité (kg)"}>
              <input
                type="number"
                min={hasAccepted ? trip?.used_kg : 0.1}
                step={0.1}
                value={capacityKg}
                onChange={(e) => setCapacityKg(Number(e.target.value))}
                required
                className={input}
              />
            </Field>

            {/* Statut (cas 1 seulement) */}
            {!hasAccepted && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1 uppercase text-slate-500">Statut</label>
                <div className="flex gap-2">
                  {["PUBLISHED", "CLOSED"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTripStatus(s)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                        tripStatus === s
                          ? s === "PUBLISHED" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting || success}
                className="w-full px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold shadow-sm transition"
              >
                {submitting ? "Enregistrement…" : "Enregistrer les modifications"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

const input = "w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
