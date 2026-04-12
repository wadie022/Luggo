"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe, logout } from "@/lib/api";
import { ArrowLeft, Camera, Mail, User, MapPin, Calendar, CreditCard, ShieldCheck, ShieldX, Clock, Star, Package } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type Me = {
  id: number; username: string; email: string;
  first_name: string; last_name: string;
  role: string; kyc_status: string; avatar_url: string | null;
};
type Review = {
  id: number; reviewer_username: string; agency_name: string;
  rating: number; comment: string; created_at: string;
};
type KYCData = {
  status: string;
  extracted_data?: {
    last_name?: string; first_name?: string; date_of_birth?: string;
    country?: string; id_number?: string; document_type?: string;
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
  VERIFIED: { label: "Identité vérifiée", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <ShieldCheck className="h-4 w-4" /> },
  REJECTED: { label: "Vérification rejetée", cls: "bg-red-500/10 text-red-400 border-red-500/20", icon: <ShieldX className="h-4 w-4" /> },
  PENDING:  { label: "Vérification en attente", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: <Clock className="h-4 w-4" /> },
};

export default function ProfilePage() {
  const router = useRouter();
  const avatarRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [kyc, setKyc] = useState<KYCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [reviewsReceived, setReviewsReceived] = useState<Review[]>([]);

  function handleLogout() { logout(); router.replace("/login"); }

  useEffect(() => {
    async function boot() {
      try {
        const meData = await fetchMe();
        setMe(meData);
        setAvatarPreview(meData.avatar_url);
      } catch { router.replace("/login"); return; }
      try {
        const res = await fetch(`${API_BASE}/kyc/status/`, { headers: authHeader() });
        setKyc(await res.json());
      } catch { setKyc({ status: "PENDING" }); }
      try {
        const r = await fetch(`${API_BASE}/reviews/`, { headers: authHeader() });
        if (r.ok) setReviewsReceived(await r.json());
      } catch {}
      setLoading(false);
    }
    boot();
  }, [router]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    const form = new FormData();
    form.append("avatar", file);
    try {
      const res = await fetch(`${API_BASE}/me/avatar/`, { method: "PATCH", headers: authHeader(), body: form });
      const data = await res.json();
      if (res.ok) setMe(data);
    } finally { setUploading(false); }
  }

  if (loading) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <p className="text-white/40">Chargement…</p>
    </main>
  );

  const ext = kyc?.extracted_data;
  const age = ext?.date_of_birth ? calcAge(ext.date_of_birth) : null;
  const badge = KYC_BADGE[me?.kyc_status ?? "PENDING"];
  const initials = me?.username?.slice(0, 2).toUpperCase() ?? "??";
  const avgRating = reviewsReceived.length
    ? (reviewsReceived.reduce((s, r) => s + r.rating, 0) / reviewsReceived.length).toFixed(1)
    : null;

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#080808]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
          <Link href="/trips" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">L</div>
            <span className="font-black text-lg tracking-tight">Luggo</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/trips" className="px-3 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">Trajets</Link>
            <NotificationBell />
            <button onClick={handleLogout} className="px-3 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link href="/trips" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white mb-8 transition">
          <ArrowLeft className="h-4 w-4" /> Retour aux trajets
        </Link>

        {/* Avatar + nom */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="relative">
            <div
              onClick={() => avatarRef.current?.click()}
              className="h-24 w-24 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center cursor-pointer ring-4 ring-white/[0.06] hover:ring-blue-500/50 transition"
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                : <span className="text-white text-2xl font-black">{initials}</span>
              }
            </div>
            <button
              onClick={() => avatarRef.current?.click()}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#1a1a1a] border-2 border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          {uploading && <p className="text-xs text-white/30">Mise à jour…</p>}
          <div className="text-center">
            <div className="text-xl font-black">{me?.username}</div>
            <div className="text-sm text-white/40">{me?.email}</div>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${badge.cls}`}>
            {badge.icon} {badge.label}
          </div>
          {avgRating && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span className="font-black text-amber-400">{avgRating}</span>
              <span className="text-xs text-amber-500/70">/ 5</span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6 mb-5">
          <h2 className="font-black text-lg mb-5">Informations personnelles</h2>
          {saveMsg && <p className="text-xs font-bold text-emerald-400 mb-3">{saveMsg}</p>}
          <div className="grid gap-2">
            <DarkInfoRow icon={<User className="h-4 w-4" />} label="Nom d'utilisateur" value={me?.username ?? "—"} />
            <DarkInfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={me?.email ?? "—"} />
            {me?.first_name && <DarkInfoRow icon={<User className="h-4 w-4" />} label="Prénom" value={me.first_name} />}
            {me?.last_name  && <DarkInfoRow icon={<User className="h-4 w-4" />} label="Nom" value={me.last_name} />}
            {ext?.last_name && <DarkInfoRow icon={<User className="h-4 w-4" />} label="Nom" value={ext.last_name} fromKyc />}
            {ext?.first_name && <DarkInfoRow icon={<User className="h-4 w-4" />} label="Prénom" value={ext.first_name} fromKyc />}
            {age !== null && <DarkInfoRow icon={<Calendar className="h-4 w-4" />} label="Âge" value={`${age} ans`} fromKyc />}
            {ext?.date_of_birth && <DarkInfoRow icon={<Calendar className="h-4 w-4" />} label="Date de naissance" value={ext.date_of_birth} fromKyc />}
            {ext?.country && <DarkInfoRow icon={<MapPin className="h-4 w-4" />} label="Pays" value={ext.country} fromKyc />}
            {ext?.id_number && <DarkInfoRow icon={<CreditCard className="h-4 w-4" />} label="N° de document" value={ext.id_number} fromKyc />}
          </div>
          {me?.kyc_status !== "VERIFIED" && (
            <div className="mt-5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-400 flex items-center justify-between gap-3">
              <span>Les infos d'identité apparaîtront ici après vérification KYC.</span>
              <Link href="/profile/kyc" className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-400 transition">
                Vérifier →
              </Link>
            </div>
          )}
        </div>

        {/* Liens rapides */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link href="/profile/kyc" className="rounded-2xl border border-white/[0.06] bg-[#111111] p-4 hover:border-blue-500/20 transition group">
            <ShieldCheck className="h-5 w-5 text-blue-500 mb-3" />
            <div className="font-bold text-sm">Vérification KYC</div>
            <div className="text-xs text-white/40 mt-0.5">
              {me?.kyc_status === "VERIFIED" ? "Identité vérifiée ✓" : "À compléter"}
            </div>
          </Link>
          <Link href="/mes-colis" className="rounded-2xl border border-white/[0.06] bg-[#111111] p-4 hover:border-emerald-500/20 transition group">
            <Package className="h-5 w-5 text-emerald-500 mb-3" />
            <div className="font-bold text-sm">Mes colis</div>
            <div className="text-xs text-white/40 mt-0.5">Suivi de tes envois</div>
          </Link>
        </div>

        {/* Avis reçus */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-1">Ma réputation</p>
              <h2 className="text-xl font-black">Avis des agences</h2>
            </div>
          </div>
          {reviewsReceived.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
              <Star className="mx-auto h-8 w-8 text-white/15 mb-2" />
              <p className="text-white/35 text-sm">Aucun avis reçu pour le moment.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {reviewsReceived.map((r) => (
                <div key={r.id} className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-bold text-sm">{r.agency_name || r.reviewer_username}</div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= r.rating ? "text-amber-400 fill-amber-400" : "text-white/10 fill-white/10"}`} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-white/50">{r.comment}</p>}
                  <div className="text-xs text-white/25 mt-2">{new Date(r.created_at).toLocaleDateString("fr-FR")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function DarkInfoRow({ icon, label, value, fromKyc }: {
  icon: React.ReactNode; label: string; value: string; fromKyc?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <span className="text-white/30 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase text-white/30 tracking-widest">{label}</div>
        <div className="font-semibold text-sm truncate">{value}</div>
      </div>
      {fromKyc && (
        <span className="shrink-0 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 font-bold">KYC</span>
      )}
    </div>
  );
}
