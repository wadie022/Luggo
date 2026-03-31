"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_BASE, saveTokens, saveRole, fetchMe } from "@/lib/api";
import { Mail, Lock, User, Building2 } from "lucide-react";

type Role = "CLIENT" | "AGENCY";

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("CLIENT");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<any>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setApiErrors(null);

    try {
      // 1) register
      const res = await fetch(`${API_BASE}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApiErrors(data);
        throw new Error(data.detail || "Inscription impossible. Vérifie les champs.");
      }

      // 2) login auto
      const loginRes = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) {
        throw new Error("Inscription OK, mais login auto impossible. Va sur /login.");
      }

      saveTokens(loginData.access, loginData.refresh);

      // 3) role auto via /me
      const me = await fetchMe(loginData.access);
      saveRole(me.role);

      // 4) redirect
      if (me.role === "AGENCY") router.push("/dashboard/agency");
      else router.push("/trips");
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold">
              L
            </div>
            <span className="font-bold text-lg">Luggo</span>
          </Link>

          <Link href="/login" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            J’ai déjà un compte
          </Link>
        </div>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Inscription</h1>
        <p className="mt-2 text-slate-600 text-sm">
          Choisis ton type de compte. Ensuite tu es connecté et redirigé automatiquement.
        </p>

        <form onSubmit={handleRegister} className="mt-6 grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("CLIENT")}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition ${
                role === "CLIENT"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <User className="h-4 w-4" />
              Client
            </button>
            <button
              type="button"
              onClick={() => setRole("AGENCY")}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition ${
                role === "AGENCY"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Building2 className="h-4 w-4" />
              Agence
            </button>
          </div>

          <Field
            icon={<User className="h-4 w-4" />}
            label="Nom d’utilisateur"
            value={username}
            onChange={setUsername}
            placeholder="wadie"
          />

          <Field
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="wadie@email.com"
          />

          <Field
            icon={<Lock className="h-4 w-4" />}
            label="Mot de passe"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
          />

          {errorMsg && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {errorMsg}
            </div>
          )}

          {apiErrors && (
            <pre className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 overflow-auto">
              {JSON.stringify(apiErrors, null, 2)}
            </pre>
          )}

          <button
            disabled={loading}
            className="rounded-2xl bg-slate-900 text-white font-semibold px-4 py-3 hover:bg-slate-800 disabled:opacity-60"
            type="submit"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 focus-within:ring-2 focus-within:ring-blue-500">
        <span className="text-slate-400">{icon}</span>
        <input
          type={type}
          className="w-full outline-none text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
        />
      </div>
    </label>
  );
}
