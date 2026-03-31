"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, MapPin, Search } from "lucide-react";
import { getRole, logout } from "@/lib/api";

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

    if (!email) {
      setErrorMsg("Merci de saisir ton email.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `http://127.0.0.1:8000/api/shipments/?email=${encodeURIComponent(email.trim())}`
      );
      if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
      const data = (await res.json()) as Shipment[];
      setShipments(data);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
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
              <Link
                href="/dashboard/agency"
                className="px-3 py-2 rounded-xl text-sm font-semibold text-emerald-300 hover:bg-slate-800"
              >
                Dashboard agence
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">
            Suivi de colis
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            Mes colis
          </h1>
          <p className="text-slate-600 text-lg max-w-xl mb-8">
            Entre l&apos;adresse email utilisée lors de ta demande pour retrouver
            tous tes colis Luggo.
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="flex-1 flex flex-col">
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton.email@example.com"
                required
                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 invisible">.</label>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 shadow-sm text-sm flex items-center gap-2"
              >
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
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
            {errorMsg}
          </div>
        )}

        {!loading && hasSearched && shipments.length === 0 && !errorMsg && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">
              Aucun colis trouvé pour cet email.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {shipments.map((s) => (
            <article
              key={s.id}
              className="rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-blue-50/60 to-white flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold tracking-tight">
                    Colis n°{s.id}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <MapPin className="h-3 w-3" />
                    Trajet #{s.trip}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold border ${
                    STATUS_STYLE[s.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {s.status}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 grid gap-2 text-sm flex-1">
                <Row label="Nom">{s.customer_name}</Row>
                <Row label="Email">{s.customer_email}</Row>
                <Row label="Téléphone">{s.customer_phone}</Row>
                <div className="mt-1 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
                  <span className="text-slate-600">Poids</span>
                  <span className="text-xl font-extrabold text-blue-700">{s.weight_kg} kg</span>
                </div>
                {s.description && (
                  <Row label="Description">{s.description}</Row>
                )}
              </div>

              {/* Footer */}
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
            <LogoL small />
            <span className="font-semibold">Luggo</span>
          </div>
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()} Luggo.ma — Tous droits réservés.
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ---------- Sub-components ---------- */

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
    <div
      className={`${size} rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold shadow-sm`}
    >
      L
    </div>
  );
}
