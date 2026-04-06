"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { API_BASE, authHeader } from "@/lib/api";

type Notif = {
  id: number;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationBell() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    try {
      const res = await fetch(`${API_BASE}/notifications/`, { headers: authHeader() });
      if (!res.ok) return;
      const data: Notif[] = await res.json();
      setNotifs(data);
      setUnread(data.filter((n) => !n.is_read).length);
    } catch {}
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // refresh toutes les 30s
    return () => clearInterval(interval);
  }, []);

  // fermer au clic en dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markRead(id: number) {
    await fetch(`${API_BASE}/notifications/${id}/read/`, {
      method: "PATCH",
      headers: authHeader(),
    });
  }

  async function markAllRead() {
    await fetch(`${API_BASE}/notifications/read-all/`, {
      method: "PATCH",
      headers: authHeader(),
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  }

  async function handleClick(notif: Notif) {
    if (!notif.is_read) {
      await markRead(notif.id);
      setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (notif.link) router.push(notif.link);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `Il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)}j`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-200 hover:bg-slate-800 transition"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-sm">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Aucune notification
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition border-b border-slate-100 last:border-0 flex gap-3 items-start ${
                    !n.is_read ? "bg-blue-50/50" : ""
                  }`}
                >
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                  {n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 leading-tight">{n.title}</div>
                    {n.message && (
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
                    )}
                    <div className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
