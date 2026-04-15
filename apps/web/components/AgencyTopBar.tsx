"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { logout } from "@/lib/api";

const navLinks = [
  { href: "/dashboard/agency", label: "Trajets" },
  { href: "/dashboard/agency/shipments", label: "Demandes" },
  { href: "/dashboard/agency/messages", label: "Messages" },
  { href: "/dashboard/agency/branches", label: "Adresses" },
  { href: "/dashboard/agency/profile", label: "Profil" },
];

export default function AgencyTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm print:hidden">
      <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
        <Link href="/dashboard/agency" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-black text-lg">L</div>
          <span className="font-black text-lg text-[#0a0a0a]">Luggo</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => {
            const isActive = pathname === l.href || (l.href !== "/dashboard/agency" && pathname.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? "text-[#2563eb] bg-blue-50"
                    : "text-gray-500 hover:text-[#2563eb] hover:bg-blue-50"
                }`}>
                {l.label}
              </Link>
            );
          })}
          <NotificationBell />
          <button onClick={handleLogout}
            className="ml-1 px-3 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-[#0a0a0a] hover:bg-gray-50 transition">
            Déconnexion
          </button>
        </nav>

        <div className="flex md:hidden items-center gap-2">
          <NotificationBell />
          <button onClick={() => setMobileOpen(v => !v)}
            className="p-2 rounded-xl text-gray-500 hover:text-[#0a0a0a] hover:bg-gray-50 transition">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-md px-5 py-3 flex flex-col gap-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-[#2563eb] hover:bg-blue-50 transition">
              {l.label}
            </Link>
          ))}
          <button onClick={handleLogout}
            className="text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition">
            Déconnexion
          </button>
        </div>
      )}
    </header>
  );
}
