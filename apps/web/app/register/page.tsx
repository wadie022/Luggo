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
      const loginRes = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) throw new Error("Inscription OK, mais login auto impossible. Va sur /login.");
      saveTokens(loginData.access, loginData.refresh);
      const me = await fetchMe();
      saveRole(me.role);
      if (me.role === "ADMIN") router.push("/dashboard/admin");
      else if (me.role === "AGENCY") {
        if (me.kyc_status !== "VERIFIED") router.push("/dashboard/agency/kyb");
        else router.push("/dashboard/agency");
      } else {
        router.push("/profile/kyc");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="h-11 w-11 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center font-black text-xl">L</div>
            <span className="font-black text-2xl text-[#0a0a0a]">Luggo</span>
          </Link>
        </div>

        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-7 md:p-8">
          <h1 className="text-2xl font-black tracking-tight mb-1 text-[#0a0a0a]">Inscription</h1>
          <p className="text-gray-500 text-sm mb-7">Choisis ton type de compte et c'est parti.</p>

          <form onSubmit={handleRegister} className="space-y-4">

            {/* Role selector */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-gray-50 border border-gray-200">
              <button
                type="button"
                onClick={() => setRole("CLIENT")}
                className={`rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${
                  role === "CLIENT"
                    ? "bg-[#2563eb] text-white shadow-md shadow-blue-200"
                    : "text-gray-500 hover:text-[#0a0a0a]"
                }`}
              >
                <User className="h-4 w-4" />
                Client
              </button>
              <button
                type="button"
                onClick={() => setRole("AGENCY")}
                className={`rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${
                  role === "AGENCY"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                    : "text-gray-500 hover:text-[#0a0a0a]"
                }`}
              >
                <Building2 className="h-4 w-4" />
                Agence
              </button>
            </div>

            <LightField icon={<User className="h-4 w-4" />} label="Nom d'utilisateur" value={username} onChange={setUsername} placeholder="wadie" />
            <LightField icon={<Mail className="h-4 w-4" />} label="Email" type="email" value={email} onChange={setEmail} placeholder="wadie@email.com" />
            <LightField icon={<Lock className="h-4 w-4" />} label="Mot de passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

            {errorMsg && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {errorMsg}
              </div>
            )}
            {apiErrors && (
              <pre className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 overflow-auto">
                {JSON.stringify(apiErrors, null, 2)}
              </pre>
            )}

            <button
              disabled={loading}
              className={`w-full mt-1 px-4 py-3.5 rounded-full font-bold text-sm transition shadow-lg disabled:opacity-50 text-white ${
                role === "AGENCY"
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                  : "hover:bg-blue-700 shadow-blue-200"
              }`}
              style={role !== "AGENCY" ? { backgroundColor: "#2563eb" } : {}}
              type="submit"
            >
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          </form>

          <div className="mt-7 text-center text-sm text-gray-500">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-[#2563eb] hover:text-blue-700 font-semibold transition">
              Se connecter
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Luggo.ma — Tous droits réservés.
        </p>
      </div>
    </main>
  );
}

function LightField({
  label, value, onChange, placeholder, type = "text", icon,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase text-gray-500 tracking-widest">{label}</span>
      <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-3 focus-within:border-[#2563eb]/50 focus-within:bg-white transition">
        <span className="text-gray-400">{icon}</span>
        <input
          type={type}
          className="w-full outline-none text-sm text-[#0a0a0a] bg-transparent placeholder:text-gray-400"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
        />
      </div>
    </label>
  );
}
