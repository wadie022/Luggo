"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe, logout } from "@/lib/api";
import {
  ShieldCheck, ShieldX, Clock, Eye, CheckCircle2, XCircle,
  Building2, User, Package, TrendingUp, Users, Truck, BarChart3,
  Ban, UserCheck, Search, AlertCircle, MessageSquare, X
} from "lucide-react";

type KYCItem = {
  id: number;
  status: string;
  rejection_reason: string;
  submitted_at: string;
  verified_at: string | null;
  user_info?: { username: string; email: string };
  id_front_url?: string | null;
  id_back_url?: string | null;
  extracted_data?: { first_name?: string; last_name?: string } | null;
};

type KYBItem = {
  id: number;
  status: string;
  rejection_reason: string;
  submitted_at: string;
  verified_at: string | null;
  agency_name?: string;
  document_url?: string | null;
  extracted_data?: { company_name?: string; registration_number?: string; manager_name?: string; legal_form?: string } | null;
};

type Stats = {
  total_clients: number;
  total_agencies: number;
  total_shipments: number;
  by_status: Record<string, number>;
  estimated_revenue: number;
  total_kg: number;
};

const STATUS_BADGE: Record<string, string> = {
  VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:    "En attente",
  ACCEPTED:   "Acceptés",
  REJECTED:   "Refusés",
  DEPOSITED:  "Déposés",
  IN_TRANSIT: "En transit",
  ARRIVED:    "Arrivés",
  DELIVERED:  "Livrés",
};

type Reclamation = {
  id: number;
  username: string;
  email: string;
  shipment: number | null;
  shipment_route: string | null;
  subject: string;
  message: string;
  status: string;
  admin_response: string;
  created_at: string;
};

type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  kyc_status: string;
  is_active: boolean;
  date_joined: string;
};

type Tab = "stats" | "kyc" | "users" | "reclamations";

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab]         = useState<Tab>("stats");
  const [kyc, setKyc]         = useState<KYCItem[]>([]);
  const [kyb, setKyb]         = useState<KYBItem[]>([]);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [recs, setRecs]           = useState<Reclamation[]>([]);
  const [recFilter, setRecFilter] = useState("OPEN");
  const [replyId, setReplyId]     = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("IN_PROGRESS");
  const [replySaving, setReplySaving] = useState(false);
  const [userRole, setUserRole]     = useState("ALL");
  const [userSearch, setUserSearch] = useState("");
  const [userActionId, setUserActionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("PENDING");

  function handleLogout() { logout(); router.replace("/login"); }

  useEffect(() => {
    async function boot() {
      try {
        const me = await fetchMe();
        if (me.role !== "ADMIN") { router.replace("/trips"); return; }
      } catch { router.replace("/login"); return; }

      const [statsRes, usersRes, recsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/stats/`, { headers: authHeader() }),
        fetch(`${API_BASE}/admin/users/`, { headers: authHeader() }),
        fetch(`${API_BASE}/admin/reclamations/?status=OPEN`, { headers: authHeader() }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (recsRes.ok) setRecs(await recsRes.json());

      await reload();
      setLoading(false);
    }
    boot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function reload(st = filter) {
    const [kycRes, kybRes] = await Promise.all([
      fetch(`${API_BASE}/admin/kyc/?status=${st}`, { headers: authHeader() }),
      fetch(`${API_BASE}/admin/kyb/?status=${st}`, { headers: authHeader() }),
    ]);
    setKyc(await kycRes.json().catch(() => []));
    setKyb(await kybRes.json().catch(() => []));
  }

  async function loadRecs(st = recFilter) {
    const res = await fetch(`${API_BASE}/admin/reclamations/?status=${st}`, { headers: authHeader() });
    if (res.ok) setRecs(await res.json());
  }

  async function sendReply(id: number) {
    setReplySaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/reclamations/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status: replyStatus, admin_response: replyText }),
      });
      if (res.ok) {
        setRecs(prev => prev.map(r => r.id === id ? { ...r, status: replyStatus, admin_response: replyText } : r));
        setReplyId(null); setReplyText(""); setReplyStatus("IN_PROGRESS");
      }
    } finally {
      setReplySaving(false);
    }
  }

  async function loadUsers(role = userRole, search = userSearch) {
    const params = new URLSearchParams();
    if (role !== "ALL") params.set("role", role);
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`${API_BASE}/admin/users/?${params}`, { headers: authHeader() });
    if (res.ok) setUsers(await res.json());
  }

  async function doUserAction(id: number, action: "ban" | "unban") {
    setUserActionId(id);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const updated: AdminUser = await res.json();
        setUsers((prev) => prev.map((u) => u.id === id ? updated : u));
      }
    } finally {
      setUserActionId(null);
    }
  }

  async function reviewKYC(id: number, newStatus: "VERIFIED" | "REJECTED", reason = "", firstName = "", lastName = "") {
    await fetch(`${API_BASE}/admin/kyc/${id}/review/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ status: newStatus, rejection_reason: reason, first_name: firstName, last_name: lastName }),
    });
    await reload();
  }

  async function reviewKYB(id: number, newStatus: "VERIFIED" | "REJECTED", reason = "", legalName = "", regNumber = "") {
    await fetch(`${API_BASE}/admin/kyb/${id}/review/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ status: newStatus, rejection_reason: reason, legal_name: legalName, registration_number: regNumber }),
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
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
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab("stats")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              tab === "stats" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <BarChart3 className="h-4 w-4" /> Statistiques
          </button>
          <button
            onClick={() => setTab("kyc")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              tab === "kyc" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Vérifications
            {kyc.filter(k => k.status === "PENDING").length + kyb.filter(k => k.status === "PENDING").length > 0 && (
              <span className="ml-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {kyc.filter(k => k.status === "PENDING").length + kyb.filter(k => k.status === "PENDING").length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab("users"); loadUsers(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              tab === "users" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Users className="h-4 w-4" /> Utilisateurs
          </button>
          <button
            onClick={() => { setTab("reclamations"); loadRecs("OPEN"); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              tab === "reclamations" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <AlertCircle className="h-4 w-4" /> Réclamations
            {recs.filter(r => r.status === "OPEN").length > 0 && (
              <span className="ml-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {recs.filter(r => r.status === "OPEN").length}
              </span>
            )}
          </button>
        </div>

        {/* ── STATS TAB ── */}
        {tab === "stats" && stats && (
          <div className="grid gap-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Users className="h-5 w-5 text-blue-600" />}
                label="Clients"
                value={stats.total_clients.toString()}
                bg="bg-blue-50"
              />
              <StatCard
                icon={<Building2 className="h-5 w-5 text-purple-600" />}
                label="Agences"
                value={stats.total_agencies.toString()}
                bg="bg-purple-50"
              />
              <StatCard
                icon={<Package className="h-5 w-5 text-amber-600" />}
                label="Colis totaux"
                value={stats.total_shipments.toString()}
                bg="bg-amber-50"
              />
              <StatCard
                icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
                label="CA estimé"
                value={`${stats.estimated_revenue.toFixed(0)} €`}
                bg="bg-emerald-50"
              />
            </div>

            {/* Volume */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                <Truck className="h-4 w-4 text-blue-500" /> Volume transporté
              </div>
              <div className="text-3xl font-extrabold text-blue-700 mb-1">{stats.total_kg} kg</div>
              <p className="text-xs text-slate-400">Somme des colis acceptés (hors refusés et en attente)</p>
            </div>

            {/* By status */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="font-bold text-slate-800 mb-4">Colis par statut</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <div key={key} className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
                    <div className="text-2xl font-extrabold text-slate-800">{stats.by_status[key] ?? 0}</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div>
            <h1 className="text-2xl font-extrabold mb-2">Gestion des utilisateurs</h1>
            <p className="text-slate-500 mb-6 text-sm">Consulte et bannit / réactive les clients et agences.</p>

            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); loadUsers(userRole, e.target.value); }}
                  placeholder="Rechercher par nom ou email…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                {["ALL", "CLIENT", "AGENCY"].map((r) => (
                  <button
                    key={r}
                    onClick={() => { setUserRole(r); loadUsers(r, userSearch); }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                      userRole === r ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {r === "ALL" ? "Tous" : r === "CLIENT" ? "Clients" : "Agences"}
                  </button>
                ))}
              </div>
            </div>

            {/* Badges résumé */}
            <div className="flex gap-4 mb-5 text-sm text-slate-500">
              <span><span className="font-bold text-slate-800">{users.filter(u => u.is_active).length}</span> actifs</span>
              <span><span className="font-bold text-red-600">{users.filter(u => !u.is_active).length}</span> bannis</span>
            </div>

            <div className="grid gap-3">
              {users.length === 0 ? (
                <p className="text-slate-400 py-8 text-center">Aucun utilisateur trouvé.</p>
              ) : users.map((u) => (
                <div
                  key={u.id}
                  className={`rounded-3xl border bg-white p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
                    !u.is_active ? "border-red-200 bg-red-50/30" : "border-slate-200"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{u.username}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        u.role === "AGENCY"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>{u.role}</span>
                      {!u.is_active && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                          <Ban className="h-3 w-3" /> Banni
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">{u.email}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Inscrit le {u.date_joined} · KYC : <span className={
                        u.kyc_status === "VERIFIED" ? "text-emerald-600 font-semibold" :
                        u.kyc_status === "REJECTED" ? "text-red-600 font-semibold" : "text-amber-600 font-semibold"
                      }>{u.kyc_status}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {u.is_active ? (
                      <button
                        onClick={() => {
                          if (confirm(`Bannir ${u.username} ? Il ne pourra plus se connecter.`))
                            doUserAction(u.id, "ban");
                        }}
                        disabled={userActionId === u.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-sm font-semibold disabled:opacity-60 transition"
                      >
                        <Ban className="h-4 w-4" />
                        {userActionId === u.id ? "…" : "Bannir"}
                      </button>
                    ) : (
                      <button
                        onClick={() => doUserAction(u.id, "unban")}
                        disabled={userActionId === u.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-sm font-semibold disabled:opacity-60 transition"
                      >
                        <UserCheck className="h-4 w-4" />
                        {userActionId === u.id ? "…" : "Réactiver"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RECLAMATIONS TAB ── */}
        {tab === "reclamations" && (
          <div>
            <h1 className="text-2xl font-extrabold mb-2">Réclamations</h1>
            <p className="text-slate-500 mb-6 text-sm">Répondez aux clients et mettez à jour le statut.</p>

            <div className="flex gap-2 mb-6 flex-wrap">
              {[
                { key: "OPEN",        label: "Ouvertes" },
                { key: "IN_PROGRESS", label: "En cours" },
                { key: "RESOLVED",    label: "Résolues" },
                { key: "CLOSED",      label: "Fermées" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setRecFilter(key); loadRecs(key); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    recFilter === key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >{label}</button>
              ))}
            </div>

            {recs.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p className="text-slate-500 font-medium">Aucune réclamation dans cette catégorie.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {recs.map((r) => (
                  <div key={r.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">#{r.id} · {r.username} · {r.email} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</div>
                        <div className="font-bold text-slate-900">{r.subject}</div>
                        {r.shipment_route && <div className="text-xs text-slate-500 mt-0.5">Colis : {r.shipment_route}</div>}
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        r.status === "OPEN" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        r.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        r.status === "RESOLVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>{r.status}</span>
                    </div>

                    <div className="p-5 grid gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Message client</div>
                        <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{r.message}</p>
                      </div>

                      {r.admin_response && (
                        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3">
                          <div className="text-xs font-semibold text-blue-600 uppercase mb-1">Votre réponse</div>
                          <p className="text-sm text-slate-700 whitespace-pre-line">{r.admin_response}</p>
                        </div>
                      )}

                      {replyId === r.id ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 grid gap-3">
                          <div>
                            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Nouveau statut</label>
                            <select
                              value={replyStatus}
                              onChange={e => setReplyStatus(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="IN_PROGRESS">En cours</option>
                              <option value="RESOLVED">Résolue</option>
                              <option value="CLOSED">Fermée</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Réponse *</label>
                            <textarea
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              rows={3}
                              placeholder="Votre réponse au client…"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => sendReply(r.id)}
                              disabled={!replyText.trim() || replySaving}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold"
                            >
                              {replySaving ? "Envoi…" : "Envoyer"}
                            </button>
                            <button onClick={() => setReplyId(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-100">
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setReplyId(r.id); setReplyText(r.admin_response || ""); }}
                          className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                        >
                          <MessageSquare className="h-4 w-4" />
                          {r.admin_response ? "Modifier la réponse" : "Répondre"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── KYC TAB ── */}
        {tab === "kyc" && (
          <div>
            <h1 className="text-2xl font-extrabold mb-2">Vérifications</h1>
            <p className="text-slate-500 mb-6 text-sm">Approuve ou rejette les documents d'identité et d'entreprise.</p>

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

            <Section title="Identités clients (KYC)" icon={<User className="h-5 w-5" />}>
              {kyc.length === 0 ? (
                <p className="text-slate-400 text-sm py-4">Aucun document.</p>
              ) : kyc.map((item) => (
                <KYCCard
                  key={item.id}
                  item={item}
                  onApprove={(firstName, lastName) => reviewKYC(item.id, "VERIFIED", "", firstName, lastName)}
                  onReject={(reason) => reviewKYC(item.id, "REJECTED", reason)}
                />
              ))}
            </Section>

            <Section title="Documents entreprises (KYB)" icon={<Building2 className="h-5 w-5" />}>
              {kyb.length === 0 ? (
                <p className="text-slate-400 text-sm py-4">Aucun document.</p>
              ) : kyb.map((item) => (
                <KYBCard
                  key={item.id}
                  item={item}
                  onApprove={(legalName, regNumber) => reviewKYB(item.id, "VERIFIED", "", legalName, regNumber)}
                  onReject={(reason) => reviewKYB(item.id, "REJECTED", reason)}
                />
              ))}
            </Section>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
      <div className={`h-10 w-10 rounded-2xl ${bg} flex items-center justify-center mb-3`}>{icon}</div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      <div className="text-xs font-semibold text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 font-bold text-lg mb-4 text-slate-800">{icon} {title}</div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function KYCCard({ item, onApprove, onReject }: {
  item: KYCItem;
  onApprove: (firstName: string, lastName: string) => void;
  onReject: (reason: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState(item.extracted_data?.first_name ?? "");
  const [lastName,  setLastName]  = useState(item.extracted_data?.last_name  ?? "");
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");
  const docUrls = [item.id_front_url, item.id_back_url].filter(Boolean) as string[];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900">Client — {item.user_info?.username ?? `#${item.id}`}</div>
          {item.user_info?.email && <div className="text-sm text-slate-500">{item.user_info.email}</div>}
          <div className="text-xs text-slate-400 mt-1">
            Soumis le {new Date(item.submitted_at).toLocaleDateString("fr-FR")} à {new Date(item.submitted_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${STATUS_BADGE[item.status] ?? STATUS_BADGE.PENDING}`}>
          {item.status === "VERIFIED" ? <ShieldCheck className="h-3.5 w-3.5" /> : item.status === "REJECTED" ? <ShieldX className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {item.status}
        </div>
        {item.status === "PENDING" && !showForm && !rejectMode && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Approuver
            </button>
            <button onClick={() => setRejectMode(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-sm font-semibold">
              <XCircle className="h-4 w-4" /> Rejeter
            </button>
          </div>
        )}
      </div>

      {/* Formulaire d'approbation avec prénom/nom */}
      {showForm && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 grid gap-3">
          <div className="text-sm font-semibold text-emerald-800">Confirmer l'identité du client</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Prénom *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Nom *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom de famille"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onApprove(firstName, lastName); setShowForm(false); }}
              disabled={!firstName.trim() || !lastName.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold">
              Valider
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Formulaire de rejet */}
      {rejectMode && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 grid gap-3">
          <div className="text-sm font-semibold text-red-800">Raison du rejet</div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Ex : Document illisible, photo floue…"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => { onReject(reason); setRejectMode(false); }}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">
              Confirmer le rejet
            </button>
            <button onClick={() => setRejectMode(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
              Annuler
            </button>
          </div>
        </div>
      )}

      {docUrls.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {docUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-sm font-semibold text-slate-700 hover:text-blue-700 transition">
              <Eye className="h-4 w-4" />
              {docUrls.length > 1 ? (i === 0 ? "Recto" : "Verso") : "Voir le document"}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function KYBCard({ item, onApprove, onReject }: {
  item: KYBItem;
  onApprove: (legalName: string, regNumber: string) => void;
  onReject: (reason: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [legalName, setLegalName]   = useState(item.extracted_data?.company_name ?? item.agency_name ?? "");
  const [regNumber, setRegNumber]   = useState(item.extracted_data?.registration_number ?? "");
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason]         = useState("");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900">Agence — {item.agency_name ?? `#${item.id}`}</div>
          {item.extracted_data?.manager_name && <div className="text-sm text-slate-500">Gérant : {item.extracted_data.manager_name}</div>}
          <div className="text-xs text-slate-400 mt-1">
            Soumis le {new Date(item.submitted_at).toLocaleDateString("fr-FR")} à {new Date(item.submitted_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${STATUS_BADGE[item.status] ?? STATUS_BADGE.PENDING}`}>
          {item.status === "VERIFIED" ? <ShieldCheck className="h-3.5 w-3.5" /> : item.status === "REJECTED" ? <ShieldX className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {item.status}
        </div>
        {item.status === "PENDING" && !showForm && !rejectMode && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Approuver
            </button>
            <button onClick={() => setRejectMode(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-sm font-semibold">
              <XCircle className="h-4 w-4" /> Rejeter
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 grid gap-3">
          <div className="text-sm font-semibold text-emerald-800">Confirmer les informations de l'entreprise</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Raison sociale *</label>
              <input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Nom de l'entreprise"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">N° d'enregistrement</label>
              <input value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="SIRET / RC / …"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onApprove(legalName, regNumber); setShowForm(false); }}
              disabled={!legalName.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold">
              Valider
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
              Annuler
            </button>
          </div>
        </div>
      )}

      {rejectMode && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 grid gap-3">
          <div className="text-sm font-semibold text-red-800">Raison du rejet</div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Ex : Document expiré, illisible…"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => { onReject(reason); setRejectMode(false); }}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">
              Confirmer le rejet
            </button>
            <button onClick={() => setRejectMode(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
              Annuler
            </button>
          </div>
        </div>
      )}

      {item.document_url && (
        <div className="flex flex-wrap gap-3">
          <a href={item.document_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-sm font-semibold text-slate-700 hover:text-blue-700 transition">
            <Eye className="h-4 w-4" /> Voir le document
          </a>
        </div>
      )}
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
            <button onClick={onApprove} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Approuver
            </button>
            <button onClick={onReject} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-sm font-semibold">
              <XCircle className="h-4 w-4" /> Rejeter
            </button>
          </div>
        )}
      </div>
      {docUrls.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {docUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
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
