"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe, logout } from "@/lib/api";
import { ShieldCheck, ShieldX, Clock, Eye, CheckCircle2, XCircle, Building2, User } from "lucide-react";

type KYCItem = {
  id: number;
  status: string;
  rejection_reason: string;
  submitted_at: string;
  verified_at: string | null;
  user_info?: { username: string; email: string };
  id_front_url?: string | null;
  id_back_url?: string | null;
};

type KYBItem = {
  id: number;
  status: string;
  rejection_reason: string;
  submitted_at: string;
  verified_at: string | null;
  agency_name?: string;
  document_url?: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [kyc, setKyc]     = useState<KYCItem[]>([]);
  const [kyb, setKyb]     = useState<KYBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("PENDING");

  function handleLogout() { logout(); router.replace("/login"); }

  useEffect(() => {
    async function boot() {
      try {
        const me = await fetchMe();
        if (me.role !== "ADMIN") { router.replace("/trips"); return; }
      } catch { router.replace("/login"); return; }
      await reload();
      setLoading(false);
    }
    boot();
  }, [router]);

  async function reload(st = filter) {
    const [kycRes, kybRes] = await Promise.all([
      fetch(`${API_BASE}/admin/kyc/?status=${st}`, { headers: authHeader() }),
      fetch(`${API_BASE}/admin/kyb/?status=${st}`, { headers: authHeader() }),
    ]);
    setKyc(await kycRes.json().catch(() => []));
    setKyb(await kybRes.json().catch(() => []));
  }

  async function reviewKYC(id: number, newStatus: "VERIFIED" | "REJECTED", reason = "") {
    await fetch(`${API_BASE}/admin/kyc/${id}/review/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ status: newStatus, rejection_reason: reason }),
    });
    await reload();
  }

  async function reviewKYB(id: number, newStatus: "VERIFIED" | "REJECTED", reason = "") {
    await fetch(`${API_BASE}/admin/kyb/${id}/review/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ status: newStatus, rejection_reason: reason }),
    });
    await reload();
  }

  function handleFilter(st: string) {
    setFilter(st);
    reload(st);
  }

  if (loading) return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-slate-500">Chargement…</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard/admin" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold">L</div>
            <span className="font-bold text-white">Luggo Admin</span>
          </Link>
          <button onClick={handleLogout} className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-2">Vérifications en attente</h1>
        <p className="text-slate-500 mb-8">Approuve ou rejette les documents d'identité et d'entreprise.</p>

        {/* Filtres */}
        <div className="flex gap-2 mb-8">
          {["PENDING", "VERIFIED", "REJECTED"].map((s) => (
            <button
              key={s}
              onClick={() => handleFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                filter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {s === "PENDING" ? "En attente" : s === "VERIFIED" ? "Vérifiés" : "Rejetés"}
            </button>
          ))}
        </div>

        {/* KYC Clients */}
        <Section title="Identités clients (KYC)" icon={<User className="h-5 w-5" />}>
          {kyc.length === 0 ? (
            <p className="text-slate-400 text-sm py-4">Aucun document.</p>
          ) : kyc.map((item) => (
            <DocCard
              key={item.id}
              id={item.id}
              title={`Client — ${item.user_info?.username ?? `#${item.id}`}`}
              subtitle={item.user_info?.email ?? ""}
              status={item.status}
              submittedAt={item.submitted_at}
              docUrls={[item.id_front_url, item.id_back_url].filter(Boolean) as string[]}
              onApprove={() => reviewKYC(item.id, "VERIFIED")}
              onReject={() => {
                const r = prompt("Raison du rejet :");
                if (r !== null) reviewKYC(item.id, "REJECTED", r);
              }}
            />
          ))}
        </Section>

        {/* KYB Agences */}
        <Section title="Documents entreprises (KYB)" icon={<Building2 className="h-5 w-5" />}>
          {kyb.length === 0 ? (
            <p className="text-slate-400 text-sm py-4">Aucun document.</p>
          ) : kyb.map((item) => (
            <DocCard
              key={item.id}
              id={item.id}
              title={`Agence — ${item.agency_name ?? `#${item.id}`}`}
              subtitle=""
              status={item.status}
              submittedAt={item.submitted_at}
              docUrls={item.document_url ? [item.document_url] : []}
              onApprove={() => reviewKYB(item.id, "VERIFIED")}
              onReject={() => {
                const r = prompt("Raison du rejet :");
                if (r !== null) reviewKYB(item.id, "REJECTED", r);
              }}
            />
          ))}
        </Section>
      </div>
    </main>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 font-bold text-lg mb-4 text-slate-800">
        {icon} {title}
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function DocCard({ id, title, subtitle, status, submittedAt, docUrls, onApprove, onReject }: {
  id: number; title: string; subtitle: string; status: string;
  submittedAt: string; docUrls: string[]; onApprove: () => void; onReject: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900">{title}</div>
          {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
          <div className="text-xs text-slate-400 mt-1">
            Soumis le {new Date(submittedAt).toLocaleDateString("fr-FR")} à {new Date(submittedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${STATUS_BADGE[status] ?? STATUS_BADGE.PENDING}`}>
          {status === "VERIFIED" ? <ShieldCheck className="h-3.5 w-3.5" /> : status === "REJECTED" ? <ShieldX className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {status}
        </div>
        {status === "PENDING" && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onApprove}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
            >
              <CheckCircle2 className="h-4 w-4" /> Approuver
            </button>
            <button
              onClick={onReject}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-sm font-semibold"
            >
              <XCircle className="h-4 w-4" /> Rejeter
            </button>
          </div>
        )}
      </div>

      {/* Documents */}
      {docUrls.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {docUrls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-sm font-semibold text-slate-700 hover:text-blue-700 transition"
            >
              <Eye className="h-4 w-4" />
              {docUrls.length > 1 ? (i === 0 ? "Recto" : "Verso") : "Voir le document"}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
