"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE, authHeader, getAccessToken, getRole, logout, fetchMe } from "@/lib/api";
import { ArrowLeft, Package, MapPin, Calendar, ArrowRight, Home, Building2, CreditCard } from "lucide-react";

type Trip = {
  id: number;
  origin_country: string;
  origin_city: string;
  dest_country: string;
  dest_city: string;
  departure_at: string;
  arrival_eta: string;
  price_per_kg: number;
};

type ShipmentResponse = {
  id: number;
  trip: number;
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

export default function BookShipmentPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = Number(params.Id);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [tripError, setTripError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [weightKg, setWeightKg] = useState(1);
  const [description, setDescription]   = useState("");
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "HOME_DELIVERY">("PICKUP");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [submitting, setSubmitting]         = useState(false);
  const [successMsg, setSuccessMsg]         = useState<string | null>(null);
  const [errorMsg, setErrorMsg]             = useState<string | null>(null);
  const [apiErrors, setApiErrors]           = useState<any>(null);
  const [createdShipment, setCreatedShipment] = useState<ShipmentResponse | null>(null);

  const estimatedPrice =
    trip && weightKg ? Number(weightKg) * Number(trip.price_per_kg || 0) : null;

  const role = typeof window === "undefined" ? null : getRole();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  useEffect(() => {
    async function guard() {
      const token = getAccessToken();
      if (!token) { router.replace("/login"); return; }
      try {
        const me = await fetchMe();
        if (me.role === "AGENCY") { router.replace("/dashboard/agency"); return; }
        if (me.role === "CLIENT" && me.kyc_status !== "VERIFIED") {
          router.replace("/profile/kyc"); return;
        }
        // Pre-fill from profile
        setFullName(me.username ?? "");
        setEmail(me.email ?? "");
      } catch {
        router.replace("/login");
      }
    }
    guard();
  }, [router]);

  useEffect(() => {
    if (!tripId || Number.isNaN(tripId)) return;
    async function loadTrip() {
      try {
        setLoadingTrip(true);
        setTripError(null);
        const res = await fetch(`${API_BASE}/trips/${tripId}/`);
        if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
        setTrip(await res.json());
      } catch (err: any) {
        setTripError(err.message ?? "Erreur inconnue");
      } finally {
        setLoadingTrip(false);
      }
    }
    loadTrip();
  }, [tripId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    setApiErrors(null);
    setCreatedShipment(null);

    try {
      const res = await fetch(`${API_BASE}/shipments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          trip: tripId,
          customer_phone: phone,
          weight_kg: weightKg,
          description,
          delivery_type: deliveryType,
          delivery_address: deliveryType === "HOME_DELIVERY" ? deliveryAddress : "",
        }),
      });

      const data: ShipmentResponse = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setApiErrors(data);
        throw new Error((data as any).detail || "Impossible de créer le colis. Vérifie les informations.");
      }

      setCreatedShipment(data);
      setSuccessMsg("Demande envoyée ! Procède au paiement pour confirmer ta réservation.");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoL />
            <span className="font-bold tracking-tight text-lg text-white">Luggo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-200">
            <Link href="/trips" className="hover:text-white">Trajets</Link>
            <Link href="/mes-colis" className="hover:text-white">Mes colis</Link>
          </nav>

          <div className="flex items-center gap-2">
            {role === "AGENCY" && (
              <Link href="/dashboard/agency" className="px-3 py-2 rounded-xl text-sm font-semibold text-emerald-300 hover:bg-slate-800">
                Dashboard agence
              </Link>
            )}
            <button onClick={handleLogout} className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link href="/trips" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Retour aux trajets
        </Link>

        {loadingTrip && <p className="text-slate-500 text-sm">Chargement du trajet…</p>}

        {tripError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Erreur : {tripError}
          </div>
        )}

        {!loadingTrip && !tripError && trip && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* FORM */}
            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-blue-50/60 to-white">
                  <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">
                    Demande d'envoi
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                    {trip.origin_city}
                    <ArrowRight className="h-5 w-5 text-blue-500 shrink-0" />
                    {trip.dest_city}
                  </h1>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {trip.origin_country} → {trip.dest_country}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(trip.departure_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </span>
                    <span className="font-semibold text-blue-700">{trip.price_per_kg} €/kg</span>
                  </div>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="p-6 grid gap-4 md:grid-cols-2">
                  {/* Nom — pre-filled, read-only */}
                  <div className="md:col-span-2">
                    <Field label="Nom complet">
                      <input
                        value={fullName}
                        readOnly
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-100 text-sm text-slate-500 cursor-not-allowed"
                      />
                    </Field>
                  </div>

                  {/* Téléphone */}
                  <div className="md:col-span-2">
                    <Field label="Téléphone">
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+33 6 00 00 00 00"
                        required
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </Field>
                  </div>

                  {/* Poids */}
                  <div className="md:col-span-2">
                    <Field label="Poids du colis (kg)">
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={weightKg}
                        onChange={(e) => setWeightKg(Number(e.target.value))}
                        required
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </Field>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <Field label="Description du contenu">
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Vêtements, documents, cadeaux…"
                        rows={3}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </Field>
                  </div>

                  {/* Mode de livraison */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                      Mode de réception à destination
                    </label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDeliveryType("PICKUP")}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition ${
                          deliveryType === "PICKUP"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <Building2 className="h-5 w-5 shrink-0" />
                        Retrait au bureau
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType("HOME_DELIVERY")}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition ${
                          deliveryType === "HOME_DELIVERY"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <Home className="h-5 w-5 shrink-0" />
                        Livraison à domicile
                      </button>
                    </div>
                  </div>

                  {/* Adresse domicile */}
                  {deliveryType === "HOME_DELIVERY" && (
                    <div className="md:col-span-2">
                      <Field label="Adresse de livraison">
                        <input
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="12 rue des Lilas, Casablanca"
                          required
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </Field>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    {errorMsg && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-3">
                        {errorMsg}
                      </div>
                    )}
                    {successMsg && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-3">
                        {successMsg}
                      </div>
                    )}
                    {apiErrors && (
                      <pre className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-2xl p-3 mb-3 whitespace-pre-wrap">
                        {JSON.stringify(apiErrors, null, 2)}
                      </pre>
                    )}

                    {!createdShipment && (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold shadow-sm transition"
                      >
                        {submitting ? "Envoi en cours…" : "Envoyer la demande"}
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Récap après soumission */}
              {createdShipment && (
                <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 mb-3">
                    <Package className="h-5 w-5" />
                    Récapitulatif de ta demande
                  </div>
                  <div className="grid gap-1 text-sm text-slate-700">
                    <Row label="N° colis">#{createdShipment.id}</Row>
                    <Row label="Statut">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                        En attente
                      </span>
                    </Row>
                    <Row label="Poids">{createdShipment.weight_kg} kg</Row>
                    <Row label="Livraison">
                      {createdShipment.delivery_type === "HOME_DELIVERY"
                        ? `Domicile — ${createdShipment.delivery_address}`
                        : "Retrait au bureau"}
                    </Row>
                    {estimatedPrice !== null && (
                      <Row label="Montant estimé">
                        <span className="font-bold text-blue-700">{estimatedPrice.toFixed(2)} €</span>
                      </Row>
                    )}
                  </div>
                  <p className="mt-4 text-xs text-slate-500 mb-4">
                    Ton paiement est nécessaire pour confirmer la réservation. L'agence n'examinera ta demande qu'après paiement.
                  </p>
                  <Link
                    href={`/payment/${createdShipment.id}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-white font-semibold text-sm"
                    style={{ backgroundColor: "#2563eb" }}
                  >
                    <CreditCard className="h-4 w-4" />
                    Payer maintenant — {estimatedPrice !== null ? `${(estimatedPrice * 1.05).toFixed(2)} €` : "…"}
                  </Link>
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <div className="flex flex-col gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="text-sm font-bold text-slate-900 mb-3">Estimation du prix</div>
                <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-4 text-center">
                  <div className="text-xs text-slate-500 mb-1">Pour {weightKg} kg</div>
                  <div className="text-3xl font-extrabold text-blue-700">
                    {estimatedPrice !== null ? `${estimatedPrice.toFixed(2)} €` : "—"}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{trip.price_per_kg} €/kg × {weightKg} kg</div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                <div className="font-semibold text-slate-900 mb-2">Comment ça marche ?</div>
                <ul className="grid gap-2">
                  <li className="flex gap-2"><span className="text-blue-600 font-bold">1.</span> Tu envoies la demande</li>
                  <li className="flex gap-2"><span className="text-blue-600 font-bold">2.</span> L'agence accepte ou refuse</li>
                  <li className="flex gap-2"><span className="text-blue-600 font-bold">3.</span> Tu déposes le colis en agence</li>
                  <li className="flex gap-2"><span className="text-blue-600 font-bold">4.</span> Suivi sur "Mes colis"</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-10 mt-10">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoL small />
            <span className="font-semibold">Luggo</span>
          </div>
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()} Luggo.ma — Tous droits réservés.
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ---------- Sub-components ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400 w-28 shrink-0">{label} :</span>
      <span className="font-medium text-slate-800">{children}</span>
    </div>
  );
}

function LogoL({ small }: { small?: boolean }) {
  const size = small ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className={`${size} rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold shadow-sm`}>
      L
    </div>
  );
}
