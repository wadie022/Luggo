"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe } from "@/lib/api";
import ClientNavbar from "@/components/ClientNavbar";
import { Bell, BellOff, Plus, Trash2, ArrowRight } from "lucide-react";

const COUNTRIES = [
  "France", "Maroc", "Espagne", "Italie", "Belgique", "Pays-Bas",
  "Allemagne", "Portugal", "Suisse", "Royaume-Uni", "Suède", "Danemark",
];

type Alert = {
  id: number;
  origin_country: string;
  dest_country: string;
  max_price: number | null;
  is_active: boolean;
  created_at: string;
};

export default function AlertesPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMe().then(u => {
      if (u.role !== "CLIENT") { router.replace("/trips"); return; }
      load();
    }).catch(() => router.replace("/login"));
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/alerts/`, { headers: authHeader() });
      if (res.ok) setAlerts(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    if (!origin || !dest) { setError("Sélectionne un pays de départ et d'arrivée."); return; }
    if (origin === dest) { setError("Le pays de départ et d'arrivée doivent être différents."); return; }
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/alerts/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          origin_country: origin,
          dest_country: dest,
          max_price: maxPrice ? parseFloat(maxPrice) : null,
        }),
      });
      if (res.ok) {
        const alert = await res.json();
        setAlerts(prev => [alert, ...prev]);
        setOrigin(""); setDest(""); setMaxPrice("");
      } else {
        setError("Erreur lors de la création de l'alerte.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteAlert(id: number) {
    await fetch(`${API_BASE}/alerts/${id}/`, { method: "DELETE", headers: authHeader() });
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ClientNavbar />
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Alertes trajets</h1>
              <p className="text-sm text-slate-500">Reçois une notification dès qu'un trajet correspond à ta recherche.</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide">Nouvelle alerte</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Pays de départ</label>
              <select value={origin} onChange={e => setOrigin(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-400 transition">
                <option value="">Sélectionner…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Pays d'arrivée</label>
              <select value={dest} onChange={e => setDest(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-400 transition">
                <option value="">Sélectionner…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Prix max (€/kg) — optionnel</label>
            <input type="number" min="0" step="0.5" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
              placeholder="Ex: 8"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-400 transition" />
          </div>
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <button onClick={create} disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50">
            <Plus className="h-4 w-4" />
            {creating ? "Création…" : "Créer l'alerte"}
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Chargement…</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="h-12 w-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm font-medium">Aucune alerte configurée</p>
              <p className="text-slate-300 text-xs mt-1">Crée ta première alerte ci-dessus.</p>
            </div>
          ) : alerts.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center gap-4 shadow-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Bell className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="font-semibold text-slate-800 text-sm truncate">{a.origin_country}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-800 text-sm truncate">{a.dest_country}</span>
                {a.max_price && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold shrink-0">
                    ≤ {a.max_price} €/kg
                  </span>
                )}
              </div>
              <button onClick={() => deleteAlert(a.id)}
                className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
