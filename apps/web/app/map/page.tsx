"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { API_BASE, getAccessToken, logout, getRole } from "@/lib/api";
import { MapPin, ArrowLeft } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type Agency = {
  id: number;
  legal_name: string;
  city: string;
  country: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export default function MapPage() {
  const router = useRouter();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const role = typeof window === "undefined" ? null : getRole();

  function handleLogout() { logout(); router.replace("/login"); }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace("/login"); return; }
    fetch(`${API_BASE}/agencies/`)
      .then((r) => r.json())
      .then(setAgencies)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const mappable = agencies.filter((a) => a.latitude && a.longitude);

  return (
    <main className="min-h-screen bg-white text-slate-900">
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

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link href="/trips" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour aux trajets
        </Link>

        <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">Réseau Luggo</div>
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Agences partenaires</h1>
        <p className="text-slate-500 text-sm mb-6">Trouve l'agence la plus proche de toi.</p>

        {loading ? (
          <p className="text-slate-400">Chargement…</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Map */}
            <div className="md:col-span-2 rounded-3xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 480 }}>
              <MapView agencies={mappable} />
            </div>

            {/* Liste */}
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[480px] pr-1">
              {agencies.length === 0 ? (
                <p className="text-slate-400 text-sm">Aucune agence vérifiée pour le moment.</p>
              ) : agencies.map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-200 hover:shadow-sm transition">
                  <div className="font-semibold text-slate-900 text-sm">{a.legal_name}</div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <MapPin className="h-3 w-3" />
                    {a.city}, {a.country}
                  </div>
                  {a.address && <div className="text-xs text-slate-400 mt-0.5">{a.address}</div>}
                  <Link
                    href={`/trips?origin_country=${a.country}`}
                    className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Voir les trajets →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
