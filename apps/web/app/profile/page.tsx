"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe, logout } from "@/lib/api";
import { ArrowLeft, Camera, Mail, User, MapPin, Calendar, CreditCard, ShieldCheck, ShieldX, Clock, Star } from "lucide-react";

type Me = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  kyc_status: string;
  avatar_url: string | null;
};

type Review = {
  id: number;
  reviewer_username: string;
  agency_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

type KYCData = {
  status: string;
  extracted_data?: {
    last_name?: string;
    first_name?: string;
    date_of_birth?: string;
    country?: string;
    id_number?: string;
    document_type?: string;
  };
};

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

const KYC_BADGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  VERIFIED: { label: "Identité vérifiée", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <ShieldCheck className="h-4 w-4" /> },
  REJECTED: { label: "Vérification rejetée", cls: "bg-red-50 text-red-700 border-red-200", icon: <ShieldX className="h-4 w-4" /> },
  PENDING:  { label: "Vérification en attente", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="h-4 w-4" /> },
};

export default function ProfilePage() {
  const router = useRouter();
  const avatarRef = useRef<HTMLInputElement>(null);

  const [me, setMe]     = useState<Me | null>(null);
  const [kyc, setKyc]   = useState<KYCData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [editMode, setEditMode]     = useState(false);
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState<string | null>(null);
  const [reviewsReceived, setReviewsReceived] = useState<Review[]>([]);

  function handleLogout() { logout(); router.replace("/login"); }

  useEffect(() => {
    async function boot() {
      try {
        const meData = await fetchMe();
        setMe(meData);
        setAvatarPreview(meData.avatar_url);
        setFirstName(meData.first_name ?? "");
        setLastName(meData.last_name ?? "");
      } catch {
        router.replace("/login"); return;
      }
      try {
        const res = await fetch(`${API_BASE}/kyc/status/`, { headers: authHeader() });
        const data = await res.json();
        setKyc(data);
      } catch {
        setKyc({ status: "PENDING" });
      }
      try {
        const r = await fetch(`${API_BASE}/reviews/`, { headers: authHeader() });
        if (r.ok) setReviewsReceived(await r.json());
      } catch {}
      setLoading(false);
    }
    boot();
  }, [router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`${API_BASE}/me/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ email: me?.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMe(data);
        setSaveMsg("Profil mis à jour !");
        setEditMode(false);
      } else {
        setSaveMsg("Erreur lors de la mise à jour.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // preview immédiat
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // upload
    setUploading(true);
    const form = new FormData();
    form.append("avatar", file);
    try {
      const res = await fetch(`${API_BASE}/me/avatar/`, {
        method: "PATCH",
        headers: authHeader(),
        body: form,
      });
      const data = await res.json();
      if (res.ok) setMe(data);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-500">Chargement…</p>
      </main>
    );
  }

  const ext = kyc?.extracted_data;
  const age = ext?.date_of_birth ? calcAge(ext.date_of_birth) : null;
  const badge = KYC_BADGE[me?.kyc_status ?? "PENDING"];
  const initials = me?.username?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/trips" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold">L</div>
            <span className="font-bold tracking-tight text-lg text-white">Luggo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/trips" className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">Trajets</Link>
            <button onClick={handleLogout} className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
        <Link href="/trips" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-8">
          <ArrowLeft className="h-4 w-4" /> Retour aux trajets
        </Link>

        {/* Avatar + nom */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="relative">
            <div
              onClick={() => avatarRef.current?.click()}
              className="h-24 w-24 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center cursor-pointer ring-4 ring-white shadow-lg hover:opacity-90 transition"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-extrabold">{initials}</span>
              )}
            </div>
            <button
              onClick={() => avatarRef.current?.click()}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-slate-900 border-2 border-white text-white flex items-center justify-center shadow hover:bg-slate-700 transition"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          {uploading && <p className="text-xs text-slate-400">Mise à jour…</p>}
          <div className="text-center">
            <div className="text-lg md:text-xl font-extrabold">{me?.username}</div>
            <div className="text-xs md:text-sm text-slate-500">{me?.email}</div>
          </div>
          {/* Badge KYC */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${badge.cls}`}>
            {badge.icon} {badge.label}
          </div>
        </div>

        {/* Infos du profil */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900 text-lg">Informations personnelles</h2>
          </div>

          {saveMsg && <p className="text-xs font-semibold text-emerald-600 mb-3">{saveMsg}</p>}

          <div className="grid gap-4">
            <InfoRow icon={<User className="h-4 w-4" />} label="Nom d'utilisateur" value={me?.username ?? "—"} />
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={me?.email ?? "—"} />
            {me?.first_name && <InfoRow icon={<User className="h-4 w-4" />} label="Prénom" value={me.first_name} />}
            {me?.last_name  && <InfoRow icon={<User className="h-4 w-4" />} label="Nom" value={me.last_name} />}

            {ext?.last_name && (
              <InfoRow icon={<User className="h-4 w-4" />} label="Nom" value={ext.last_name} fromKyc />
            )}
            {ext?.first_name && (
              <InfoRow icon={<User className="h-4 w-4" />} label="Prénom" value={ext.first_name} fromKyc />
            )}
            {age !== null && (
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Âge" value={`${age} ans`} fromKyc />
            )}
            {ext?.date_of_birth && (
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date de naissance" value={ext.date_of_birth} fromKyc />
            )}
            {ext?.country && (
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Pays" value={ext.country} fromKyc />
            )}
            {ext?.id_number && (
              <InfoRow icon={<CreditCard className="h-4 w-4" />} label="N° de document" value={ext.id_number} fromKyc />
            )}
          </div>

          {me?.kyc_status !== "VERIFIED" && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center justify-between gap-3">
              <span>Les informations d'identité apparaîtront ici après vérification KYC.</span>
              <Link href="/profile/kyc" className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600">
                Vérifier →
              </Link>
            </div>
          )}
        </div>

        {/* Liens rapides */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link href="/profile/kyc" className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition">
            <ShieldCheck className="h-5 w-5 text-blue-600 mb-2" />
            <div className="font-semibold text-sm">Vérification KYC</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {me?.kyc_status === "VERIFIED" ? "Identité vérifiée ✓" : "À compléter"}
            </div>
          </Link>
          <Link href="/mes-colis" className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition">
            <CreditCard className="h-5 w-5 text-emerald-600 mb-2" />
            <div className="font-semibold text-sm">Mes colis</div>
            <div className="text-xs text-slate-500 mt-0.5">Suivi de tes envois</div>
          </Link>
        </div>

        {/* Avis reçus des agences */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">Ma réputation</div>
              <h2 className="text-xl font-extrabold">Avis des agences</h2>
            </div>
            {reviewsReceived.length > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="font-bold text-amber-700">
                  {(reviewsReceived.reduce((s, r) => s + r.rating, 0) / reviewsReceived.length).toFixed(1)}
                </span>
                <span className="text-xs text-amber-600 ml-0.5">/ 5</span>
              </div>
            )}
          </div>
          {reviewsReceived.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
              <Star className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-slate-500 text-sm">Aucun avis reçu pour le moment.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {reviewsReceived.map((r) => (
                <div key={r.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-semibold text-slate-800 text-sm">{r.agency_name || r.reviewer_username}</div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= r.rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
                  <div className="text-xs text-slate-400 mt-2">{new Date(r.created_at).toLocaleDateString("fr-FR")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function InfoRow({
  icon, label, value, fromKyc,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  fromKyc?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold uppercase text-slate-400">{label}</div>
        <div className="font-semibold text-slate-900 text-sm truncate">{value}</div>
      </div>
      {fromKyc && (
        <span className="shrink-0 text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-2 py-0.5 font-semibold">KYC</span>
      )}
    </div>
  );
}
