"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { API_BASE, getAccessToken, getRole, logout, fetchMe, authHeader } from "@/lib/api";
import { MapPin, Package, Calendar, ArrowRight, Menu, X, LocateFixed } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type AgencyMap = {
  id: number;
  legal_name: string;
  city: string;
  country: string;
  address: string;
  latitude: number;
  longitude: number;
};

type Trip = {
  id: number;
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [agencies, setAgencies] = useState<AgencyMap[]>([]);
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

  // Guard: must be logged in
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace("/login"); return; }
    fetchMe().then((me) => {
      setAvatarUrl(me.avatar_url ?? null);
      setUsername(me.username ?? "");
    }).catch(() => {});
  }, [router]);

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
      const data = await res.json();
      setTrips(data);
    } catch (err: any) {
      setError(err.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrips();
    fetch(`${API_BASE}/agencies/`)
      .then((r) => r.json())
      .then((data) => setAgencies(data.filter((a: any) => a.latitude && a.longitude)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const role = typeof window === "undefined" ? null : getRole();

  function handleLogout() {
    logout();
    router.replace("/login");
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
            <Link href="/trips" className="text-white font-semibold">Trajets</Link>
            <Link href="/mes-colis" className="hover:text-white">Mes colis</Link>
            <Link href="/map" className="hover:text-white">Carte</Link>
          </nav>

          {/* Mobile menu dropdown */}
          {menuOpen && (
            <div className="md:hidden absolute top-14 left-0 right-0 bg-slate-900 border-b border-slate-800 px-4 py-4 flex flex-col gap-3 z-50">
              <Link href="/trips" onClick={() => setMenuOpen(false)} className="text-white font-semibold py-2">Trajets</Link>
              <Link href="/mes-colis" onClick={() => setMenuOpen(false)} className="text-slate-200 py-2">Mes colis</Link>
              <Link href="/map" onClick={() => setMenuOpen(false)} className="text-slate-200 py-2">Carte des agences</Link>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="text-slate-200 py-2">Mon profil</Link>
              {role === "AGENCY" && <Link href="/dashboard/agency" onClick={() => setMenuOpen(false)} className="text-emerald-300 py-2">Dashboard agence</Link>}
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="text-left text-red-400 py-2">Déconnexion</button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {role === "AGENCY" && (
              <Link href="/dashboard/agency" className="hidden md:block px-3 py-2 rounded-xl text-sm font-semibold text-emerald-300 hover:bg-slate-800">
                Dashboard
              </Link>
            )}
            <button onClick={handleLogout} className="hidden md:block px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">
              Déconnexion
            </button>
            <NotificationBell />
            <Link href="/profile" className="flex items-center">
              <div className="h-9 w-9 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center ring-2 ring-slate-700 hover:ring-blue-400 transition">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profil" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-extrabold">{username.slice(0, 2).toUpperCase() || "?"}</span>
                )}
              </div>
            </Link>
            {/* Hamburger mobile */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-xl text-slate-200 hover:bg-slate-800">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* HERO + SEARCH */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-14">
          <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">
            Luggo Transport
          </div>
          <h1 className="text-2xl md:text-5xl font-extrabold tracking-tight mb-3">
            Trajets disponibles
          </h1>
          <p className="text-slate-600 text-sm md:text-lg max-w-xl mb-6 md:mb-8">
            Trouvez un trajet Europe ↔ Maroc et envoyez votre colis en quelques
            clics.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="flex-1 flex flex-col">
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1">
                Pays d&apos;origine
              </label>
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="FR, BE, ES…"
                maxLength={2}
                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1">
                Pays de destination
              </label>
              <input
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                placeholder="MA, FR…"
                maxLength={2}
                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 invisible">
                .
              </label>
              <button
                onClick={fetchTrips}
                className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm text-sm"
              >
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MAP */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">Réseau Luggo</div>
            <h2 className="text-xl font-extrabold text-slate-900">Agences partenaires</h2>
          </div>
          <button
            onClick={handleLocate}
            disabled={locating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition"
          >
            <LocateFixed className="h-4 w-4" />
            {locating ? "Localisation…" : "Me localiser"}
          </button>
        </div>
        <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 360 }}>
          <MapView agencies={agencies} userLocation={userPos} />
        </div>
        {agencies.length === 0 && (
          <p className="text-slate-400 text-sm mt-3 text-center">Aucune agence avec coordonnées pour le moment.</p>
        )}
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        {loading && (
          <p className="text-slate-500 text-sm">Chargement des trajets…</p>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
            Erreur lors du chargement : {error}
          </div>
        )}

        {!loading && !error && trips.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">
              Aucun trajet trouvé pour ces critères.
            </p>
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onBook={() => router.push(`/trips/${trip.id}/book`)}
            />
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-10">
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

/* ---------- TripCard ---------- */

function TripCard({ trip, onBook }: { trip: Trip; onBook: () => void }) {
  const departure = new Date(trip.departure_at);
  const arrival = trip.arrival_eta ? new Date(trip.arrival_eta) : null;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-blue-50/60 to-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span>{trip.origin_city}</span>
            <ArrowRight className="h-4 w-4 text-blue-500 shrink-0" />
            <span>{trip.dest_city}</span>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-semibold border ${
              trip.status === "PUBLISHED"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {trip.status}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 font-medium">
          <MapPin className="h-3 w-3" />
          {trip.origin_country} → {trip.dest_country}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <InfoRow
          icon={<Calendar className="h-4 w-4 text-blue-500" />}
          label="Départ"
        >
          {departure.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          <span className="text-slate-400 ml-1">
            {departure.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </InfoRow>

        {arrival && (
          <InfoRow
            icon={<Calendar className="h-4 w-4 text-slate-400" />}
            label="Arrivée estimée"
          >
            {arrival.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </InfoRow>
        )}

        <InfoRow
          icon={<Package className="h-4 w-4 text-emerald-500" />}
          label="Capacité"
        >
          <span className="font-semibold">{trip.capacity_kg} kg</span>
        </InfoRow>

        <div className="mt-1 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-600">Prix par kg</span>
          <span className="text-xl font-extrabold text-blue-700">
            {trip.price_per_kg} €
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <button
          onClick={onBook}
          className="w-full px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition"
        >
          Envoyer un colis
        </button>
      </div>
    </article>
  );
}

/* ---------- Sub-components ---------- */

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase font-semibold text-slate-400">
          {label}
        </div>
        <div className="text-sm text-slate-800">{children}</div>
      </div>
    </div>
  );
}

function LogoL({ small }: { small?: boolean }) {
  const size = small ? "h-8 w-8" : "h-10 w-10";
  return (
    <div
      className={`${size} rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold shadow-sm`}
    >
      L
    </div>
  );
}
