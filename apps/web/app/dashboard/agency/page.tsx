"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, fetchMe, authHeader } from "@/lib/api";
import { Pencil, Trash2 } from "lucide-react";

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

export default function AgencyTripsPage() {
  const router = useRouter();
  const [bootLoading, setBootLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
      if (!res.ok) throw new Error(data?.detail || "Erreur chargement trajets agence");
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

  async function handleDeleteTrip(id: number) {
    if (!confirm("Supprimer ce trajet définitivement ?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/agency/trips/${id}/`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Suppression impossible.");
      }
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setDeletingId(null);
    }
  }

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
            <h1 className="text-3xl font-extrabold">Mes trajets</h1>
            <p className="mt-2 text-slate-600">Liste des trajets publiés par ton agence.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={load}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold"
              disabled={loading}
            >
              {loading ? "Refresh..." : "Rafraîchir"}
            </button>
            <Link
              href="/dashboard/agency/trips/new"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              + Publier un trajet
            </Link>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="mt-6 grid gap-4">
          {loading ? (
            <p className="text-slate-600">Chargement...</p>
          ) : trips.length === 0 ? (
            <p className="text-slate-600">Aucun trajet pour le moment.</p>
          ) : (
            trips.map((t) => (
              <div key={t.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Trajet #{t.id} • {t.status}</div>
                    <div className="text-xl font-extrabold mt-1">
                      {t.origin_city} ({t.origin_country}) → {t.dest_city} ({t.dest_country})
                    </div>
                    <div className="text-sm text-slate-600 mt-2">
                      Départ: {new Date(t.departure_at).toLocaleString()}
                      {t.arrival_eta ? ` • Arrivée: ${new Date(t.arrival_eta).toLocaleString()}` : ""}
                    </div>
                    <div className="text-sm text-slate-600 mt-2">
                      Capacité: <span className="font-semibold">{t.capacity_kg} kg</span> • Prix:{" "}
                      <span className="font-semibold">{t.price_per_kg} €/kg</span>
                    </div>
                    <div className="text-sm text-slate-700 mt-2">
                      Accepté: <span className="font-semibold">{t.used_kg} kg</span> • En attente:{" "}
                      <span className="font-semibold">{t.pending_kg} kg</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[220px]">
                    <Link
                      href={`/dashboard/agency/trips/${t.id}/edit`}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-sm font-semibold"
                    >
                      <Pencil className="h-4 w-4" />
                      Modifier
                    </Link>
                    <Link
                      href="/dashboard/agency/shipments"
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm font-semibold text-center"
                    >
                      Voir demandes
                    </Link>
                    <Link
                      href="/dashboard/agency/capacity"
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-semibold text-center"
                    >
                      Voir capacité
                    </Link>
                    {t.used_kg === 0 && (
                      <button
                        onClick={() => handleDeleteTrip(t.id)}
                        disabled={deletingId === t.id}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-60 text-sm font-semibold"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingId === t.id ? "Suppression…" : "Supprimer"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
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
          <Link href="/dashboard/agency/capacity" className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">
            Capacité
          </Link>
          <Link href="/dashboard/agency/trips/new" className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
            Publier
          </Link>
        </div>
      </div>
    </header>
  );
}
