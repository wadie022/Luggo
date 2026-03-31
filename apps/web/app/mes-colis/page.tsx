"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, MapPin, Search, Pencil, Trash2, X, Check } from "lucide-react";
import { API_BASE, getRole, logout } from "@/lib/api";

type Shipment = {
  id: number;
  trip: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  weight_kg: number;
  description: string;
  status: string;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  PENDING:  "bg-amber-50  text-amber-700  border-amber-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50    text-red-700    border-red-200",
};

export default function MesColisPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editWeight, setEditWeight] = useState(0);
  const [editDesc, setEditDesc] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const role = typeof window === "undefined" ? null : getRole();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setHasSearched(true);
    setErrorMsg(null);
    setShipments([]);
    setEditingId(null);
    if (!email) { setErrorMsg("Merci de saisir ton email."); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/shipments/?email=${encodeURIComponent(email.trim())}`);
      if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
      setShipments((await res.json()) as Shipment[]);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(s: Shipment) {
    setEditingId(s.id);
    setEditPhone(s.customer_phone);
    setEditWeight(s.weight_kg);
    setEditDesc(s.description ?? "");
    setEditError(null);
  }

  async function submitEdit(id: number) {
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch(`${API_BASE}/shipments/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_email: email.trim(),
          customer_phone: editPhone,
          weight_kg: editWeight,
          description: editDesc,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Erreur modification.");
      setShipments((prev) => prev.map((s) => (s.id === id ? (data as Shipment) : s)));
      setEditingId(null);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer cette demande définitivement ?")) return;
    try {
      const res = await fetch(`${API_BASE}/shipments/${id}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Suppression impossible.");
      }
      setShipments((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setErrorMsg(err.message);
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
            <Link href="/mes-colis" className="text-white font-semibold">Mes colis</Link>
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

      {/* HERO */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">Suivi de colis</div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Mes colis</h1>
          <p className="text-slate-600 text-lg max-w-xl mb-8">
            Entre l&apos;adresse email utilisée lors de ta demande pour retrouver tous tes colis Luggo.
          </p>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="flex-1 flex flex-col">
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1">Adresse email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="ton.email@example.com" required
                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 invisible">.</label>
              <button type="submit" disabled={loading}
                className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 shadow-sm text-sm flex items-center gap-2">
                <Search className="h-4 w-4" />
                {loading ? "Recherche…" : "Rechercher"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        {errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">{errorMsg}</div>
        )}
        {!loading && hasSearched && shipments.length === 0 && !errorMsg && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Aucun colis trouvé pour cet email.</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {shipments.map((s) => (
            <article key={s.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-blue-50/60 to-white flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold tracking-tight">Colis n°{s.id}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <MapPin className="h-3 w-3" />Trajet #{s.trip}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold border ${STATUS_STYLE[s.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {s.status}
                </span>
              </div>

              {/* Body */}
              {editingId === s.id ? (
                /* ---- FORMULAIRE D'ÉDITION INLINE ---- */
                <div className="p-5 flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Modifier la demande</p>
                  {editError && <p className="text-xs text-red-600">{editError}</p>}
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Téléphone</label>
                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Poids (kg)</label>
                    <input type="number" min={0.1} step={0.1} value={editWeight}
                      onChange={(e) => setEditWeight(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Description</label>
                    <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => submitEdit(s.id)} disabled={editLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                      <Check className="h-4 w-4" />{editLoading ? "Enregistrement…" : "Enregistrer"}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* ---- AFFICHAGE NORMAL ---- */
                <div className="p-5 grid gap-2 text-sm flex-1">
                  <Row label="Nom">{s.customer_name}</Row>
                  <Row label="Email">{s.customer_email}</Row>
                  <Row label="Téléphone">{s.customer_phone}</Row>
                  <div className="mt-1 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
                    <span className="text-slate-600">Poids</span>
                    <span className="text-xl font-extrabold text-blue-700">{s.weight_kg} kg</span>
                  </div>
                  {s.description && <Row label="Description">{s.description}</Row>}

                  {/* Boutons modifier/supprimer (PENDING uniquement) */}
                  {s.status === "PENDING" && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => startEdit(s)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-sm font-semibold">
                        <Pencil className="h-4 w-4" />Modifier
                      </button>
                      <button onClick={() => handleDelete(s.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-sm font-semibold">
                        <Trash2 className="h-4 w-4" />Supprimer
                      </button>
                    </div>
                  )}
                  {s.status !== "PENDING" && (
                    <p className="mt-2 text-xs text-slate-400 italic">
                      {s.status === "ACCEPTED" ? "Colis accepté — modification impossible." : "Colis refusé — modification impossible."}
                    </p>
                  )}
                </div>
              )}

              <div className="px-5 pb-5 text-xs text-slate-400">
                Créé le {new Date(s.created_at).toLocaleString("fr-FR")}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-10">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoL small /><span className="font-semibold">Luggo</span>
          </div>
          <div className="text-sm text-slate-500">© {new Date().getFullYear()} Luggo.ma — Tous droits réservés.</div>
        </div>
      </footer>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 shrink-0 w-24">{label} :</span>
      <span className="text-slate-800 font-medium">{children}</span>
    </div>
  );
}

function LogoL({ small }: { small?: boolean }) {
  const size = small ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className={`${size} rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold shadow-sm`}>L</div>
  );
}
