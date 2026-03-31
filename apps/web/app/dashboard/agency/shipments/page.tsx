"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, fetchMe, authHeader } from "@/lib/api";

type Shipment = {
  id: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  weight_kg: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  description: string;
  created_at: string;
  trip_summary: {
    id: number;
    route: string;
    capacity_kg: number;
    price_per_kg: number;
    departure_at: string;
  };
};

export default function AgencyShipmentsPage() {
  const router = useRouter();

  const [bootLoading, setBootLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "ACCEPTED" | "REJECTED">("PENDING");
  const [items, setItems] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/agency/shipments/?status=${statusFilter}`, {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.detail || "Erreur chargement demandes");
      setItems(data);
    } catch (e: any) {
      setErr(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
  }, []);

  useEffect(() => {
    if (!bootLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootLoading, statusFilter]);

  const totalKg = useMemo(() => items.reduce((a, x) => a + Number(x.weight_kg || 0), 0), [items]);

  async function setStatus(id: number, s: "ACCEPTED" | "REJECTED" | "PENDING") {
    // optimistic
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: s } : x)));
    try {
      const res = await fetch(`${API_BASE}/agency/shipments/${id}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status: s }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Impossible de changer le statut");
      // re-sync
      setItems((prev) => prev.map((x) => (x.id === id ? data : x)));
    } catch (e: any) {
      setErr(e.message || "Erreur");
      // reload to be safe
      load();
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
            <h1 className="text-3xl font-extrabold">Demandes</h1>
            <p className="mt-2 text-slate-600">
              Filtre par statut, accepte/refuse, et suis les kg demandés.
            </p>
          </div>
          <Link className="text-blue-700 font-semibold" href="/dashboard/agency">
            ← Retour dashboard
          </Link>
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-3">
          <StatCard title="Statut" value={statusFilter} />
          <StatCard title="Nombre" value={`${items.length}`} />
          <StatCard title="Total kg (liste)" value={`${totalKg.toFixed(1)} kg`} />
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="text-sm font-semibold text-slate-900">Filtre</div>
            <div className="flex flex-wrap gap-2">
              <FilterButton active={statusFilter === "PENDING"} onClick={() => setStatusFilter("PENDING")}>
                En attente
              </FilterButton>
              <FilterButton active={statusFilter === "ACCEPTED"} onClick={() => setStatusFilter("ACCEPTED")}>
                Acceptées
              </FilterButton>
              <FilterButton active={statusFilter === "REJECTED"} onClick={() => setStatusFilter("REJECTED")}>
                Refusées
              </FilterButton>
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <p className="text-slate-600">Chargement...</p>
          ) : items.length === 0 ? (
            <p className="text-slate-600">Aucune demande.</p>
          ) : (
            <div className="grid gap-4">
              {items.map((s) => (
                <div key={s.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-500">Demande #{s.id}</div>
                      <div className="text-lg font-bold mt-1">{s.trip_summary?.route}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        Poids demandé: <span className="font-semibold">{s.weight_kg} kg</span> • Statut:{" "}
                        <Badge status={s.status} />
                      </div>
                      <div className="text-sm text-slate-600 mt-2">
                        Client: <span className="font-semibold">{s.customer_name}</span> • {s.customer_email} •{" "}
                        {s.customer_phone}
                      </div>
                      {s.description && (
                        <div className="mt-2 text-sm text-slate-700">
                          <span className="font-semibold">Contenu:</span> {s.description}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-slate-500">
                        Créée: {new Date(s.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[220px]">
                      <div className="text-xs uppercase text-slate-500 font-semibold">Actions</div>
                      <button
                        onClick={() => setStatus(s.id, "ACCEPTED")}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => setStatus(s.id, "REJECTED")}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold"
                      >
                        Refuser
                      </button>
                      <button
                        onClick={() => setStatus(s.id, "PENDING")}
                        className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 text-sm font-semibold"
                      >
                        Remettre en attente
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
          <Link href="/dashboard/agency/trips" className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">
            Mes trajets
          </Link>
          <Link href="/dashboard/agency/trips/new" className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
            Publier
          </Link>
        </div>
      </div>
    </header>
  );
}

function FilterButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
        active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs uppercase text-slate-500 font-semibold">{title}</div>
      <div className="mt-2 text-xl font-extrabold">{value}</div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const cls =
    status === "ACCEPTED"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : status === "REJECTED"
      ? "bg-rose-100 text-rose-800 border-rose-200"
      : "bg-amber-100 text-amber-800 border-amber-200";
  return <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold border ${cls}`}>{status}</span>;
}
