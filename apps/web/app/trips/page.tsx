"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { API_BASE, getRole, authHeader } from "@/lib/api";
import { MapPin, Package, Calendar, ArrowRight, LocateFixed } from "lucide-react";
import ClientNavbar from "@/components/ClientNavbar";
import type { AgencyPoint } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type Trip = {
  id: number;
  agency: number;
  agency_name: string;
  origin_country: string;
  origin_city: string;
  dest_country: string;
  dest_city: string;
  departure_at: string;
  arrival_eta: string;
  capacity_kg: number;
  price_per_kg: number;
  status: string;
};

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [agencies, setAgencies] = useState<AgencyPoint[]>([]);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  function handleLocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserPos([pos.coords.latitude, pos.coords.longitude]); setLocating(false); },
      () => setLocating(false)
    );
  }


  async function fetchTrips() {
    try {
      setLoading(true);
      setError(null);
      let url = `${API_BASE}/trips/`;
      const params: string[] = [];
      if (origin) params.push(`origin_country=${origin.toUpperCase()}`);
      if (dest) params.push(`dest_country=${dest.toUpperCase()}`);
      if (params.length > 0) url += "?" + params.join("&");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
      const now = new Date();
      const all: Trip[] = await res.json();
      setTrips(all.filter((t) => new Date(t.departure_at) > now));
    } catch (err: any) {
      setError(err.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrips();
    fetch(`${API_BASE}/agency-branches/`)
      .then((r) => r.json())
      .then(setAgencies)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const role = typeof window === "undefined" ? null : getRole();

  return (
    <main className="min-h-screen bg-[#f8f9fb] text-[#0a0a0a]">

      <ClientNavbar />

      {/* HERO + SEARCH */}
      <section className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
          <p className="text-xs font-bold tracking-widest text-[#2563eb] uppercase mb-2">Luggo Transport</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3 text-[#0a0a0a]">Trajets disponibles</h1>
          <p className="text-gray-500 text-sm md:text-lg max-w-xl mb-8">
            Trouvez un trajet Europe ↔ Maroc et envoyez votre colis en quelques clics.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-widest">Pays d'origine</label>
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="FR, BE, ES…"
                maxLength={2}
                className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#2563eb]/50 focus:outline-none focus:bg-white text-sm text-[#0a0a0a] placeholder:text-gray-400 transition"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-widest">Pays de destination</label>
              <input
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                placeholder="MA, FR…"
                maxLength={2}
                className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#2563eb]/50 focus:outline-none focus:bg-white text-sm text-[#0a0a0a] placeholder:text-gray-400 transition"
              />
            </div>
            <div className="flex flex-col justify-end gap-1.5">
              <label className="text-xs font-bold uppercase text-transparent tracking-widest select-none">.</label>
              <button
                onClick={fetchTrips}
                className="px-6 py-3 rounded-full font-bold text-sm text-white transition shadow-lg shadow-blue-200 hover:bg-blue-700"
                style={{ backgroundColor: "#2563eb" }}
              >
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MAP */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#2563eb] uppercase mb-1">Réseau Luggo</p>
            <h2 className="text-xl font-black text-[#0a0a0a]">Agences partenaires</h2>
          </div>
          <button
            onClick={handleLocate}
            disabled={locating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-[#2563eb]/30 hover:bg-blue-50 disabled:opacity-50 text-[#0a0a0a] text-sm font-semibold transition shadow-sm"
          >
            <LocateFixed className="h-4 w-4 text-[#2563eb]" />
            {locating ? "Localisation…" : "Me localiser"}
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ height: 360 }}>
          <MapView agencies={agencies} userLocation={userPos} showContact={role !== "AGENCY"} />
        </div>
        {agencies.length === 0 && (
          <p className="text-gray-400 text-sm mt-3 text-center">Aucune agence avec coordonnées pour le moment.</p>
        )}
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-[#0a0a0a]">
            {loading ? "Chargement…" : `${trips.length} trajet${trips.length !== 1 ? "s" : ""} disponible${trips.length !== 1 ? "s" : ""}`}
          </h2>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-6">
            Erreur : {error}
          </div>
        )}

        {!loading && !error && trips.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-14 text-center shadow-sm">
            <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Aucun trajet trouvé pour ces critères.</p>
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onBook={() => router.push(`/trips/${trip.id}/book`)}
              onContact={() => router.push(`/messages?agency=${trip.agency}&name=${encodeURIComponent(trip.agency_name || "")}`)}
            />
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="mx-auto max-w-6xl px-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#2563eb] text-white flex items-center justify-center font-black text-sm">L</div>
            <span className="font-bold text-[#0a0a0a]">Luggo</span>
          </div>
          <span className="text-sm text-gray-400">© {new Date().getFullYear()} Luggo.ma</span>
        </div>
      </footer>
    </main>
  );
}

/* ── TripCard ── */
function TripCard({ trip, onBook, onContact }: { trip: Trip; onBook: () => void; onContact: () => void }) {
  const departure = new Date(trip.departure_at);
  const arrival = trip.arrival_eta ? new Date(trip.arrival_eta) : null;

  return (
    <article className="rounded-2xl border border-gray-100 bg-white hover:border-[#2563eb]/20 hover:shadow-md transition-all overflow-hidden flex flex-col group shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-lg font-black tracking-tight text-[#0a0a0a]">
            <span>{trip.origin_city}</span>
            <ArrowRight className="h-4 w-4 text-[#2563eb] shrink-0" />
            <span>{trip.dest_city}</span>
          </div>
          <span className={`text-[11px] px-2 py-1 rounded-lg font-bold border ${
            trip.status === "PUBLISHED"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-gray-50 text-gray-500 border-gray-200"
          }`}>
            {trip.status === "PUBLISHED" ? "Disponible" : trip.status}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
          <MapPin className="h-3 w-3" />
          {trip.origin_country} → {trip.dest_country}
          {trip.agency_name && <span className="ml-1">· {trip.agency_name}</span>}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <InfoRow icon={<Calendar className="h-4 w-4 text-[#2563eb]" />} label="Départ">
          {departure.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          <span className="text-gray-400 ml-1 text-[11px]">
            {departure.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </InfoRow>

        {arrival && (
          <InfoRow icon={<Calendar className="h-4 w-4 text-gray-400" />} label="Arrivée estimée">
            {arrival.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </InfoRow>
        )}

        <InfoRow icon={<Package className="h-4 w-4 text-emerald-600" />} label="Capacité">
          <span className="font-bold">{trip.capacity_kg} kg</span>
        </InfoRow>

        <div className="mt-1 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">Prix par kg</span>
          <span className="text-xl font-black text-[#2563eb]">{trip.price_per_kg} €</span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5 flex flex-col gap-2">
        <button
          onClick={onBook}
          className="w-full px-4 py-3 rounded-full font-bold text-sm text-white transition shadow-lg shadow-blue-200 hover:bg-blue-700"
          style={{ backgroundColor: "#2563eb" }}
        >
          Envoyer un colis
        </button>
        <button
          onClick={onContact}
          className="w-full px-4 py-2.5 rounded-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-[#0a0a0a] font-semibold text-sm transition"
        >
          Contacter l'agence
        </button>
      </div>
    </article>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{label}</div>
        <div className="text-sm text-[#0a0a0a]">{children}</div>
      </div>
    </div>
  );
}
