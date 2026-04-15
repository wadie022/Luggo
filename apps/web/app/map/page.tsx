"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { API_BASE, getAccessToken, getRole } from "@/lib/api";
import { MapPin, ArrowLeft } from "lucide-react";
import ClientNavbar from "@/components/ClientNavbar";
import type { AgencyPoint } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const [points, setPoints] = useState<AgencyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const role = typeof window === "undefined" ? null : getRole();


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
    <main className="min-h-screen bg-[#f8f9fb] text-[#0a0a0a]">
      <ClientNavbar />

      <div className="mx-auto max-w-6xl px-5 py-8">
        <Link href="/trips" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#2563eb] mb-8 transition">
          <ArrowLeft className="h-4 w-4" /> Retour aux trajets
        </Link>

        <p className="text-xs font-bold tracking-widest text-[#2563eb] uppercase mb-2">Réseau Luggo</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-[#0a0a0a]">Agences partenaires</h1>
        <p className="text-gray-500 text-sm mb-8">Trouve l'agence la plus proche de toi.</p>

        {loading ? (
          <p className="text-gray-400">Chargement…</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {/* Map */}
            <div className="md:col-span-2 rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ height: 480 }}>
              <MapView agencies={points} showContact={role !== "AGENCY"} />
            </div>

            {/* Liste */}
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[480px] pr-1">
              {agencyMap.size === 0 ? (
                <p className="text-gray-400 text-sm">Aucune agence vérifiée pour le moment.</p>
              ) : Array.from(agencyMap.values()).map((a) => {
                const branchCount = points.filter(p => p.agency_id === a.agency_id).length;
                return (
                  <div key={a.agency_id} className="rounded-2xl border border-gray-100 bg-white p-4 hover:border-[#2563eb]/20 hover:shadow-md transition group shadow-sm">
                    <div className="font-bold text-sm text-[#0a0a0a]">{a.legal_name}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <MapPin className="h-3 w-3" />
                      {a.city}, {a.country}
                    </div>
                    {branchCount > 1 && (
                      <div className="text-xs text-[#2563eb] mt-0.5">{branchCount} adresses</div>
                    )}
                    <div className="mt-3 flex gap-3">
                      <Link
                        href={`/trips?origin_country=${a.country}`}
                        className="text-xs font-bold text-[#2563eb] hover:text-blue-700 transition"
                      >
                        Voir les trajets →
                      </Link>
                      {role !== "AGENCY" && (
                        <Link
                          href={`/messages?agency=${a.agency_id}&name=${encodeURIComponent(a.legal_name)}`}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
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
