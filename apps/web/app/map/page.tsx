"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { API_BASE, getAccessToken, logout, getRole } from "@/lib/api";
import { MapPin, ArrowLeft } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import type { AgencyPoint } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const [points, setPoints] = useState<AgencyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const role = typeof window === "undefined" ? null : getRole();

  function handleLogout() { logout(); router.replace("/login"); }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace("/login"); return; }
    fetch(`${API_BASE}/agency-branches/`)
      .then((r) => r.json())
      .then(setPoints)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const agencyMap = new Map<number, AgencyPoint>();
  for (const p of points) {
    if (!agencyMap.has(p.agency_id) || p.is_main) agencyMap.set(p.agency_id, p);
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <header className="sticky top-0 z-50 bg-[#080808]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
          <Link href="/trips" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">L</div>
            <span className="font-black text-lg tracking-tight">Luggo</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/trips" className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">Trajets</Link>
            <NotificationBell />
            <button onClick={handleLogout} className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <Link href="/trips" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white mb-8 transition">
          <ArrowLeft className="h-4 w-4" /> Retour aux trajets
        </Link>

        <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-2">Réseau Luggo</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Agences partenaires</h1>
        <p className="text-white/40 text-sm mb-8">Trouve l'agence la plus proche de toi.</p>

        {loading ? (
          <p className="text-white/30">Chargement…</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {/* Map */}
            <div className="md:col-span-2 rounded-2xl overflow-hidden border border-white/[0.06]" style={{ height: 480 }}>
              <MapView agencies={points} showContact={role !== "AGENCY"} />
            </div>

            {/* Liste */}
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[480px] pr-1">
              {agencyMap.size === 0 ? (
                <p className="text-white/30 text-sm">Aucune agence vérifiée pour le moment.</p>
              ) : Array.from(agencyMap.values()).map((a) => {
                const branchCount = points.filter(p => p.agency_id === a.agency_id).length;
                return (
                  <div key={a.agency_id} className="rounded-2xl border border-white/[0.06] bg-[#111111] p-4 hover:border-blue-500/20 transition group">
                    <div className="font-bold text-sm">{a.legal_name}</div>
                    <div className="flex items-center gap-1 text-xs text-white/40 mt-1">
                      <MapPin className="h-3 w-3" />
                      {a.city}, {a.country}
                    </div>
                    {branchCount > 1 && (
                      <div className="text-xs text-blue-400 mt-0.5">{branchCount} adresses</div>
                    )}
                    <div className="mt-3 flex gap-3">
                      <Link
                        href={`/trips?origin_country=${a.country}`}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                      >
                        Voir les trajets →
                      </Link>
                      {role !== "AGENCY" && (
                        <Link
                          href={`/messages?agency=${a.agency_id}&name=${encodeURIComponent(a.legal_name)}`}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
                        >
                          Contacter →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
