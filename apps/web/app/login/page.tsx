"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_BASE, saveTokens, saveRole, fetchMe } from "@/lib/api";
import { Lock, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Connexion impossible. Vérifie tes identifiants.");
      saveTokens(data.access, data.refresh);
      const me = await fetchMe();
      saveRole(me.role);
      if (me.role === "ADMIN") router.push("/dashboard/admin");
      else if (me.role === "AGENCY") router.push("/dashboard/agency");
      else {
        if (me.kyc_status !== "VERIFIED") router.push("/profile/kyc");
        else router.push("/trips");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-5">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl">L</div>
            <span className="font-black text-2xl">Luggo</span>
          </Link>
        </div>

        <div className="rounded-3xl bg-[#111111] border border-white/[0.06] p-7 md:p-8">
          <h1 className="text-2xl font-black tracking-tight mb-1">Connexion</h1>
          <p className="text-white/45 text-sm mb-8">Accède à ton espace en quelques secondes.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <DarkField
              icon={<User className="h-4 w-4" />}
              label="Nom d'utilisateur"
              value={username}
              onChange={setUsername}
              placeholder="wadie"
            />
            <DarkField
              icon={<Lock className="h-4 w-4" />}
              label="Mot de passe"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />

            {errorMsg && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {errorMsg}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full mt-1 px-4 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-blue-900/40"
              type="submit"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-7 text-center text-sm text-white/40">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition">
              S'inscrire gratuitement
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          © {new Date().getFullYear()} Luggo.ma — Tous droits réservés.
        </p>
      </div>
    </main>
  );
}

function DarkField({
  label, value, onChange, placeholder, type = "text", icon,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase text-white/35 tracking-widest">{label}</span>
      <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-3 focus-within:border-blue-500/50 focus-within:bg-white/[0.06] transition">
        <span className="text-white/25">{icon}</span>
        <input
          type={type}
          className="w-full outline-none text-sm text-white bg-transparent placeholder:text-white/20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
        />
      </div>
    </label>
  );
}
