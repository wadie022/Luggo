"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { API_BASE, getAccessToken, getRole, logout, fetchMe, authHeader } from "@/lib/api";
import { MapPin, Package, Calendar, ArrowRight, Menu, X, LocateFixed } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
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
      setTrips(await res.json());
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

  function handleLogout() { logout(); router.replace("/login"); }

  return (
    <main className="min-h-screen bg-[#080808] text-white">

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#080808]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">L</div>
            <span className="font-black text-lg tracking-tight">Luggo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link href="/trips" className="px-3 py-2 rounded-xl font-bold text-white bg-white/[0.06]">Trajets</Link>
            <Link href="/mes-colis" className="px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition">Mes colis</Link>
            <Link href="/messages" className="px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition">Messages</Link>
            <Link href="/map" className="px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition">Carte</Link>
            <Link href="/reclamations" className="px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition">Réclamations</Link>
          </nav>

          {menuOpen && (
            <div className="md:hidden absolute top-[57px] left-0 right-0 bg-[#0f0f0f] border-b border-white/[0.06] px-5 py-4 flex flex-col gap-1 z-50">
              <Link href="/trips" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-white font-bold bg-white/[0.06]">Trajets</Link>
              {role !== "AGENCY" && <Link href="/mes-colis" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-white/70">Mes colis</Link>}
              <Link href="/map" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-white/70">Carte des agences</Link>
              <Link href="/reclamations" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-white/70">Réclamations</Link>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-white/70">Mon profil</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="text-left px-3 py-2.5 rounded-xl text-red-400">Déconnexion</button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {role === "AGENCY" && (
              <Link href="/dashboard/agency" className="hidden md:block px-3 py-2 rounded-xl text-sm font-bold text-emerald-400 hover:bg-white/[0.06] transition">
                Dashboard
              </Link>
            )}
            <button onClick={handleLogout} className="hidden md:block px-3 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">
              Déconnexion
            </button>
            <NotificationBell />
            <Link href="/profile" className="flex items-center">
              <div className="h-9 w-9 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center ring-2 ring-white/10 hover:ring-blue-500 transition">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Profil" className="h-full w-full object-cover" />
                  : <span className="text-white text-xs font-black">{username.slice(0, 2).toUpperCase() || "?"}</span>
                }
              </div>
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06]">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* HERO + SEARCH */}
      <section className="border-b border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
          <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-2">Luggo Transport</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-[-0.02em] mb-3">Trajets disponibles</h1>
          <p className="text-white/50 text-sm md:text-lg max-w-xl mb-8">
            Trouvez un trajet Europe ↔ Maroc et envoyez votre colis en quelques clics.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-white/35 tracking-widest">Pays d'origine</label>
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="FR, BE, ES…"
                maxLength={2}
                className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 focus:outline-none text-sm text-white placeholder:text-white/25 transition"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-white/35 tracking-widest">Pays de destination</label>
              <input
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                placeholder="MA, FR…"
                maxLength={2}
                className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 focus:outline-none text-sm text-white placeholder:text-white/25 transition"
              />
            </div>
            <div className="flex flex-col justify-end gap-1.5">
              <label className="text-xs font-bold uppercase text-white/0 tracking-widest select-none">.</label>
              <button
                onClick={fetchTrips}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg shadow-blue-900/40"
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
            <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-1">Réseau Luggo</p>
            <h2 className="text-xl font-black">Agences partenaires</h2>
          </div>
          <button
            onClick={handleLocate}
            disabled={locating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/[0.08] disabled:opacity-50 text-white text-sm font-semibold transition"
          >
            <LocateFixed className="h-4 w-4" />
            {locating ? "Localisation…" : "Me localiser"}
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden border border-white/[0.06]" style={{ height: 360 }}>
          <MapView agencies={agencies} userLocation={userPos} showContact={role !== "AGENCY"} />
        </div>
        {agencies.length === 0 && (
          <p className="text-white/30 text-sm mt-3 text-center">Aucune agence avec coordonnées pour le moment.</p>
        )}
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black">
            {loading ? "Chargement…" : `${trips.length} trajet${trips.length !== 1 ? "s" : ""} disponible${trips.length !== 1 ? "s" : ""}`}
          </h2>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 mb-6">
            Erreur : {error}
          </div>
        )}

        {!loading && !error && trips.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-14 text-center">
            <Package className="mx-auto h-10 w-10 text-white/20 mb-3" />
            <p className="text-white/40 font-medium">Aucun trajet trouvé pour ces critères.</p>
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
      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto max-w-6xl px-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">L</div>
            <span className="font-bold text-white">Luggo</span>
          </div>
          <span className="text-sm text-white/25">© {new Date().getFullYear()} Luggo.ma</span>
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
    <article className="rounded-2xl border border-white/[0.06] bg-[#111111] hover:border-blue-500/25 transition-all overflow-hidden flex flex-col group">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span>{trip.origin_city}</span>
            <ArrowRight className="h-4 w-4 text-blue-500 shrink-0" />
            <span>{trip.dest_city}</span>
          </div>
          <span className={`text-[11px] px-2 py-1 rounded-lg font-bold border ${
            trip.status === "PUBLISHED"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-white/5 text-white/40 border-white/10"
          }`}>
            {trip.status === "PUBLISHED" ? "Disponible" : trip.status}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/40 font-medium">
          <MapPin className="h-3 w-3" />
          {trip.origin_country} → {trip.dest_country}
          {trip.agency_name && <span className="ml-1">· {trip.agency_name}</span>}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <InfoRow icon={<Calendar className="h-4 w-4 text-blue-500" />} label="Départ">
          {departure.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          <span className="text-white/35 ml-1 text-[11px]">
            {departure.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </InfoRow>

        {arrival && (
          <InfoRow icon={<Calendar className="h-4 w-4 text-white/30" />} label="Arrivée estimée">
            {arrival.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </InfoRow>
        )}

        <InfoRow icon={<Package className="h-4 w-4 text-emerald-500" />} label="Capacité">
          <span className="font-bold">{trip.capacity_kg} kg</span>
        </InfoRow>

        <div className="mt-1 rounded-xl bg-blue-600/10 border border-blue-500/15 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-white/50">Prix par kg</span>
          <span className="text-xl font-black text-blue-400">{trip.price_per_kg} €</span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5 flex flex-col gap-2">
        <button
          onClick={onBook}
          className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg shadow-blue-900/30"
        >
          Envoyer un colis
        </button>
        <button
          onClick={onContact}
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/70 hover:text-white font-semibold text-sm transition"
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
      <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{label}</div>
        <div className="text-sm text-white/80">{children}</div>
      </div>
    </div>
  );
}
