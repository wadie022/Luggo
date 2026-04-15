"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { fetchMe, getRole, logout } from "@/lib/api";

const navLinks = [
  { href: "/trips", label: "Trajets" },
  { href: "/mes-colis", label: "Mes colis" },
  { href: "/messages", label: "Messages" },
  { href: "/map", label: "Carte" },
  { href: "/reclamations", label: "Réclamations" },
];

export default function ClientNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const role = typeof window === "undefined" ? null : getRole();

  useEffect(() => {
    fetchMe()
      .then((me) => {
        setAvatarUrl(me.avatar_url ?? null);
        setUsername(me.username ?? "");
      })
      .catch(() => {});
  }, []);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-black text-lg">L</div>
          <span className="font-black text-lg tracking-tight text-[#0a0a0a]">Luggo</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {navLinks.map((l) => {
            const isActive = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link key={l.href} href={l.href}
                className={`px-3 py-2 rounded-xl font-semibold transition ${
                  isActive
                    ? "font-bold text-[#2563eb] bg-blue-50"
                    : "text-gray-500 hover:text-[#2563eb] hover:bg-blue-50"
                }`}>
                {l.label}
              </Link>
            );
          })}
        </nav>

        {menuOpen && (
          <div className="md:hidden absolute top-[57px] left-0 right-0 bg-white border-b border-gray-100 shadow-md px-5 py-4 flex flex-col gap-1 z-50">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                className={`px-3 py-2.5 rounded-xl font-semibold ${
                  pathname === l.href ? "text-[#2563eb] bg-blue-50" : "text-gray-600 hover:bg-gray-50"
                }`}>
                {l.label}
              </Link>
            ))}
            {role === "AGENCY" && (
              <Link href="/dashboard/agency" onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-emerald-600 font-bold hover:bg-emerald-50">
                Dashboard agence
              </Link>
            )}
            <Link href="/profile" onClick={() => setMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50">
              Mon profil
            </Link>
            <button onClick={() => { handleLogout(); setMenuOpen(false); }}
              className="text-left px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50">
              Déconnexion
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {role === "AGENCY" && (
            <Link href="/dashboard/agency"
              className="hidden md:block px-3 py-2 rounded-xl text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition">
              Dashboard
            </Link>
          )}
          <button onClick={handleLogout}
            className="hidden md:block px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-[#0a0a0a] hover:bg-gray-50 transition">
            Déconnexion
          </button>
          <NotificationBell />
          <Link href="/profile" className="flex items-center">
            <div className="h-9 w-9 rounded-full overflow-hidden bg-[#2563eb] flex items-center justify-center ring-2 ring-gray-100 hover:ring-[#2563eb]/30 transition">
              {avatarUrl
                ? <img src={avatarUrl} alt="Profil" className="h-full w-full object-cover" />
                : <span className="text-white text-xs font-black">{username.slice(0, 2).toUpperCase() || "?"}</span>
              }
            </div>
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-xl text-gray-500 hover:text-[#0a0a0a] hover:bg-gray-50">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
