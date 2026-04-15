"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe } from "@/lib/api";
import { MapPin, Plus, Trash2, ArrowLeft, CheckCircle2, XCircle, Star, LocateFixed } from "lucide-react";
import dynamic from "next/dynamic";

const BranchMap = dynamic(() => import("@/components/BranchMap"), { ssr: false });

type Branch = {
  id: number;
  label: string;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  is_main: boolean;
};

const EMPTY: Omit<Branch, "id"> = { label: "", address: "", city: "", country: "", latitude: null, longitude: null, is_main: false };

async function geocodeAddress(address: string, city: string, country: string): Promise<{ lat: number; lon: number } | null> {
  const query = [address, city, country].filter(Boolean).join(", ");
  if (!query) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "Accept-Language": "fr" } }
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export default function AgencyBranchesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [locatingId, setLocatingId] = useState<number | null>(null);


  useEffect(() => {
    async function boot() {
      try {
        const me = await fetchMe();
        if (me.role !== "AGENCY") { router.replace("/trips"); return; }
      } catch { router.replace("/login"); return; }
      await reload();
      setLoading(false);
    }
    boot();
  }, [router]);

  async function reload() {
    const res = await fetch(`${API_BASE}/agency/branches/`, { headers: authHeader() });
    if (res.ok) setBranches(await res.json());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSuccessMsg(null); setErrorMsg(null);

    // Géolocalise directement ici (pas via setForm qui est async)
    let latitude = form.latitude;
    let longitude = form.longitude;

    if (!latitude || !longitude) {
      const coords = await geocodeAddress(form.address, form.city, form.country);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lon;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/agency/branches/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          ...form,
          latitude,
          longitude,
          country: form.country.trim().toUpperCase().slice(0, 2),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data === "object" ? Object.values(data).flat().join(" ") : "Erreur lors de l'ajout.";
        throw new Error(msg);
      }
      await reload();
      setForm({ ...EMPTY });
      setShowForm(false);
      setSuccessMsg("Adresse ajoutée !");
    } catch (err: any) { setErrorMsg(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer cette adresse ?")) return;
    await fetch(`${API_BASE}/agency/branches/${id}/`, { method: "DELETE", headers: authHeader() });
    setBranches(prev => prev.filter(b => b.id !== id));
  }

  async function handleSetMain(id: number) {
    await fetch(`${API_BASE}/agency/branches/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ is_main: true }),
    });
    await reload();
  }

  async function handleLocateBranch(b: Branch) {
    setLocatingId(b.id);
    setSuccessMsg(null); setErrorMsg(null);
    const coords = await geocodeAddress(b.address, b.city, b.country);
    if (!coords) {
      setErrorMsg(`Impossible de géolocaliser "${b.label}". Vérifie l'adresse.`);
      setLocatingId(null);
      return;
    }
    const res = await fetch(`${API_BASE}/agency/branches/${b.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ latitude: coords.lat, longitude: coords.lon }),
    });
    if (res.ok) {
      setSuccessMsg(`"${b.label}" localisée sur la carte !`);
      await reload();
    } else {
      setErrorMsg("Erreur lors de la mise à jour.");
    }
    setLocatingId(null);
  }

  if (loading) return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-slate-500">Chargement…</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-white text-slate-900">

      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/dashboard/agency" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour au dashboard
        </Link>

        <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">Mon agence</div>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-extrabold">Mes adresses</h1>
          <button onClick={() => { setShowForm(!showForm); setSuccessMsg(null); setErrorMsg(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
        <p className="text-slate-500 text-sm mb-6">Gérez vos succursales en Europe et au Maroc.</p>

        {successMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />{successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4 flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" />{errorMsg}
          </div>
        )}

        {/* Formulaire ajout */}
        {showForm && (
          <form onSubmit={handleAdd} className="rounded-3xl border border-blue-200 bg-blue-50/40 p-6 grid gap-4 mb-6">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" /> Nouvelle adresse
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Nom de l'agence *</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required
                placeholder="Ex : Agence Paris, Bureau Casablanca…"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Ville *</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required
                  placeholder="Paris"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Pays (code) *</label>
                <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value.toUpperCase() }))} required
                  maxLength={2} placeholder="FR / MA / BE…"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Adresse complète</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="12 rue de la Paix"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_main} onChange={e => setForm(f => ({ ...f, is_main: e.target.checked }))}
                className="rounded" />
              <span className="text-sm font-semibold text-slate-700">Adresse principale</span>
            </label>

            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm">
                {saving ? "Ajout en cours…" : "Ajouter l'adresse"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Map — toujours visible */}
        <div className="rounded-3xl overflow-hidden border border-slate-200 mb-6" style={{ height: 340 }}>
          <BranchMap branches={branches} />
        </div>

        {/* Note si adresses sans coordonnées */}
        {branches.some(b => !b.latitude || !b.longitude) && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 mb-4 flex items-center gap-2">
            <LocateFixed className="h-4 w-4 shrink-0" />
            Certaines adresses n'ont pas de coordonnées — clique sur <strong className="ml-1">Localiser</strong> pour les afficher sur la carte.
          </div>
        )}

        {/* Liste */}
        {branches.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
            <MapPin className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Aucune adresse enregistrée.</p>
            <p className="text-slate-400 text-sm mt-1">Ajoutez vos succursales pour apparaître sur la carte.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {branches.map(b => (
              <div key={b.id} className="rounded-3xl border border-slate-200 bg-white p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${b.latitude && b.longitude ? "bg-blue-50" : "bg-amber-50"}`}>
                    <MapPin className={`h-5 w-5 ${b.latitude && b.longitude ? "text-blue-600" : "text-amber-500"}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      {b.label}
                      {b.is_main && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                          <Star className="h-3 w-3" /> Principale
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      {[b.address, b.city, b.country].filter(Boolean).join(", ")}
                    </div>
                    {b.latitude && b.longitude ? (
                      <div className="text-xs text-emerald-600 font-medium mt-0.5">📍 {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</div>
                    ) : (
                      <div className="text-xs text-amber-600 mt-0.5">⚠ Pas encore sur la carte</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(!b.latitude || !b.longitude) && (
                    <button
                      onClick={() => handleLocateBranch(b)}
                      disabled={locatingId === b.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold disabled:opacity-60"
                      title="Géolocaliser cette adresse"
                    >
                      <LocateFixed className="h-3.5 w-3.5" />
                      {locatingId === b.id ? "…" : "Localiser"}
                    </button>
                  )}
                  {!b.is_main && (
                    <button onClick={() => handleSetMain(b.id)}
                      className="p-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700"
                      title="Définir comme principale">
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(b.id)}
                    className="p-2 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 text-red-500"
                    title="Supprimer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
