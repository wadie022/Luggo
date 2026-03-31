"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, fetchMe, authHeader } from "@/lib/api";

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

export default function AgencyCapacityPage() {
  const router = useRouter();
  const [bootLoading, setBootLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function boot() {
      try {
        const me = await fetchMe();
        if (me.role !== "AGENCY") {
          router.push("/trips");
          return;
        }
      } catch {
        router.push("/login");
        return;
      } finally {
        setBootLoading(false);
      }
    }
    boot();
  }, [router]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/agency/trips/`, {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.detail || "Erreur chargement capacité");
      setTrips(data);
    } catch (e: any) {
      setErr(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!bootLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootLoading]);

  const totals = useMemo(() => {
    const used = trips.reduce((a, t) => a + Number(t.used_kg || 0), 0);
    const pending = trips.reduce((a, t) => a + Number(t.pending_kg || 0), 0);
    const cap = trips.reduce((a, t) => a + Number(t.capacity_kg || 0), 0);
    return { used, pending, cap };
  }, [trips]);

  if (bootLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-700">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">Capacité</h1>
            <p className="mt-2 text-slate-600">
              Visualise la capacité par trajet : kg acceptés + kg en attente.
            </p>
          </div>
          <Link className="text-blue-700 font-semibold" href="/dashboard/agency">
            ← Retour dashboard
          </Link>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="mt-6 grid md:grid-cols-3 gap-3">
          <Stat title="Capacité totale" value={`${totals.cap.toFixed(1)} kg`} />
          <Stat title="Accepté (used)" value={`${totals.used.toFixed(1)} kg`} />
          <Stat title="En attente (pending)" value={`${totals.pending.toFixed(1)} kg`} />
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Trajets</div>
            <button
              onClick={load}
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200"
              disabled={loading}
            >
              {loading ? "Refresh..." : "Rafraîchir"}
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            {loading ? (
              <p className="text-slate-600">Chargement...</p>
            ) : trips.length === 0 ? (
              <p className="text-slate-600">Aucun trajet.</p>
            ) : (
              trips.map((t) => {
                const used = Number(t.used_kg || 0);
                const pending = Number(t.pending_kg || 0);
                const cap = Number(t.capacity_kg || 0);
                const pctUsed = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
                const pctPending = cap > 0 ? Math.min(100, ((used + pending) / cap) * 100) : 0;

                return (
                  <div key={t.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="text-sm text-slate-500">Trajet #{t.id} • {t.status}</div>
                        <div className="text-lg font-bold">
                          {t.origin_city} ({t.origin_country}) → {t.dest_city} ({t.dest_country})
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          Départ: {new Date(t.departure_at).toLocaleString()} • Prix: <span className="font-semibold">{t.price_per_kg} €/kg</span>
                        </div>
                      </div>

                      <Link
                        href="/dashboard/agency/shipments"
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold hover:bg-slate-100"
                      >
                        Voir demandes →
                      </Link>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <div>
                          Capacité: <span className="font-semibold">{cap} kg</span>
                        </div>
                        <div>
                          Accepté: <span className="font-semibold">{used} kg</span> • En attente:{" "}
                          <span className="font-semibold">{pending} kg</span>
                        </div>
                      </div>

                      <div className="mt-2 h-3 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${pctUsed}%` }} />
                      </div>
                      <div className="mt-2 h-3 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${pctPending}%` }} />
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        Barre verte = accepté • Barre orange = accepté + en attente
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard/agency" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold">
            L
          </div>
          <span className="font-bold text-white">Luggo</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/agency/shipments" className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">
            Demandes
          </Link>
          <Link href="/dashboard/agency/trips/new" className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
            Publier
          </Link>
        </div>
      </div>
    </header>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs uppercase text-slate-500 font-semibold">{title}</div>
      <div className="mt-2 text-xl font-extrabold">{value}</div>
    </div>
  );
}
