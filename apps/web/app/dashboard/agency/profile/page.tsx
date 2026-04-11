"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe, logout } from "@/lib/api";
import { Building2, MapPin, Search, Save, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

type AgencyProfile = {
  legal_name: string;
  registration_number: string;
  city: string;
  country: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  kyc_status: string;
};

export default function AgencyProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AgencyProfile>({
    legal_name: "", registration_number: "", city: "", country: "", address: "", latitude: null, longitude: null, kyc_status: "PENDING",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleLogout() { logout(); router.replace("/login"); }

  useEffect(() => {
    async function boot() {
      try {
        const me = await fetchMe();
        if (me.role !== "AGENCY") { router.replace("/trips"); return; }
      } catch { router.replace("/login"); return; }

      fetch(`${API_BASE}/agency/profile/`, { headers: authHeader() })
        .then((r) => r.json())
        .then(setProfile)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    boot();
  }, [router]);

  async function handleGeocode() {
    const query = [profile.address, profile.city, profile.country].filter(Boolean).join(", ");
    if (!query) { setErrorMsg("Entre une adresse d'abord."); return; }

    setGeocoding(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { "Accept-Language": "fr" } }
      );
      const data = await res.json();
      if (data.length === 0) { setErrorMsg("Adresse introuvable. Essaie d'être plus précis."); return; }
      setProfile((p) => ({ ...p, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }));
      setSuccessMsg(`Coordonnées trouvées : ${data[0].display_name}`);
    } catch {
      setErrorMsg("Erreur lors de la géolocalisation.");
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/agency/profile/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde.");
      setSuccessMsg("Profil mis à jour avec succès !");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-slate-500">Chargement…</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard/agency" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold">L</div>
            <span className="font-bold text-white">Luggo Agence</span>
          </Link>
          <button onClick={handleLogout} className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/dashboard/agency" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour au dashboard
        </Link>

        <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">Mon agence</div>
        <h1 className="text-2xl font-extrabold mb-1">Profil & localisation</h1>
        <p className="text-slate-500 text-sm mb-8">
          Entre ton adresse pour apparaître sur la carte Luggo.
        </p>

        {successMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 mb-6 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />{successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6 flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" />{errorMsg}
          </div>
        )}

        {/* Infos validées par l'admin — lecture seule */}
        {(profile.legal_name || profile.registration_number) && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 grid gap-4 mb-4">
            <div className="text-xs font-semibold uppercase text-slate-400 tracking-widest mb-1">Informations vérifiées (non modifiables)</div>
            {profile.legal_name && (
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500 mb-1"><Building2 className="inline h-3.5 w-3.5 mr-1" />Raison sociale</div>
                <div className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 font-medium">{profile.legal_name}</div>
              </div>
            )}
            {profile.registration_number && (
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500 mb-1">N° d'enregistrement (SIRET / RC)</div>
                <div className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 font-mono">{profile.registration_number}</div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 grid gap-5">

          {/* Adresse */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
              <MapPin className="inline h-3.5 w-3.5 mr-1" />Adresse complète
            </label>
            <input
              value={profile.address}
              onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="12 rue de la Paix"
            />
          </div>

          {/* Ville + Pays */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">Ville</label>
              <input
                value={profile.city}
                onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Paris"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">Pays (code)</label>
              <input
                value={profile.country}
                onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value.toUpperCase() }))}
                maxLength={2}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="FR"
              />
            </div>
          </div>

          {/* Géolocalisation */}
          <div>
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold transition disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {geocoding ? "Recherche en cours…" : "Géolocaliser automatiquement"}
            </button>
            {profile.latitude && profile.longitude && (
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                <MapPin className="h-3.5 w-3.5" />
                {profile.latitude.toFixed(5)}, {profile.longitude.toFixed(5)} — position trouvée ✓
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Sauvegarde…" : "Enregistrer"}
          </button>
        </form>
      </div>
    </main>
  );
}
