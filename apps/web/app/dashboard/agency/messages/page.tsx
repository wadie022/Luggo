"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe, logout } from "@/lib/api";
import { Send, MessageSquare, ChevronLeft } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type ConvSummary = {
  id: number;
  agency_id: number;
  agency_name: string;
  client_id: number;
  client_username: string;
  shipment_id: number | null;
  updated_at: string;
  last_message: { content: string; created_at: string; sender_username: string } | null;
  unread_count: number;
};

type Msg = {
  id: number;
  conversation: number;
  sender_id: number;
  sender_username: string;
  content: string;
  created_at: string;
  is_read: boolean;
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function AgencyMessagesPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: number; username: string } | null>(null);
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleLogout() { logout(); router.replace("/login"); }

  useEffect(() => {
    fetchMe().then((u) => {
      if (u.role !== "AGENCY") { router.replace("/trips"); return; }
      setMe({ id: u.id, username: u.username });
    }).catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    if (!me) return;
    const load = () =>
      fetch(`${API_BASE}/conversations/`, { headers: authHeader() })
        .then(r => r.json()).then(setConvs).catch(() => {});
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [me]);

  useEffect(() => {
    if (selectedId === null) { setMsgs([]); return; }
    const load = async () => {
      const r = await fetch(`${API_BASE}/conversations/${selectedId}/messages/`, { headers: authHeader() });
      if (r.ok) {
        const data: Msg[] = await r.json();
        setMsgs(prev => {
          if (prev.length !== data.length) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          return data;
        });
      }
    };
    load();
    fetch(`${API_BASE}/conversations/${selectedId}/read/`, { method: "PATCH", headers: authHeader() }).catch(() => {});
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, [selectedId]);

  useEffect(() => {
    if (msgs.length) setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
  }, [selectedId]);

  async function sendMsg() {
    if (!input.trim() || !selectedId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const r = await fetch(`${API_BASE}/conversations/${selectedId}/messages/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ content }),
      });
      if (r.ok) {
        const msg = await r.json();
        setMsgs(prev => [...prev, msg]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        fetch(`${API_BASE}/conversations/`, { headers: authHeader() }).then(r => r.json()).then(setConvs).catch(() => {});
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function selectConv(id: number) { setSelectedId(id); setShowThread(true); }

  const selectedConv = convs.find(c => c.id === selectedId);
  const totalUnread = convs.reduce((s, c) => s + c.unread_count, 0);

  return (
    <main className="min-h-screen bg-white text-slate-900 flex flex-col">
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard/agency" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold">L</div>
            <span className="font-bold text-white">Luggo Agence</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/agency" className="hidden md:block px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">Dashboard</Link>
            <NotificationBell />
            <button onClick={handleLogout} className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard/agency" className="text-sm text-slate-500 hover:text-slate-900">← Dashboard</Link>
          <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase">Messagerie</div>
          <h1 className="text-xl font-extrabold">Messages clients</h1>
          {totalUnread > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">{totalUnread} non lus</span>
          )}
        </div>

        <div className="flex-1 flex border border-slate-200 rounded-3xl overflow-hidden" style={{ minHeight: 500 }}>

          {/* Conversation list */}
          <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col ${showThread ? "hidden md:flex" : "flex"}`}>
            <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-700">
              Clients ({convs.length})
            </div>
            {convs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <MessageSquare className="h-10 w-10 text-slate-300" />
                <p className="text-slate-500 text-sm">Aucun message reçu pour le moment.</p>
                <p className="text-xs text-slate-400">Les clients peuvent vous contacter depuis la page des trajets.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {convs.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectConv(c.id)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition ${selectedId === c.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-slate-900 truncate">{c.client_username}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.unread_count > 0 && (
                          <span className="h-5 min-w-5 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {c.unread_count}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">{c.updated_at ? timeAgo(c.updated_at) : ""}</span>
                      </div>
                    </div>
                    {c.last_message && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        <span className="font-medium">{c.last_message.sender_username === me?.username ? "Vous" : c.last_message.sender_username}:</span>{" "}
                        {c.last_message.content}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message thread */}
          <div className={`flex-1 flex flex-col ${showThread ? "flex" : "hidden md:flex"}`}>
            {!selectedConv ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-8">
                <MessageSquare className="h-12 w-12 text-slate-200" />
                <p className="text-slate-400 text-sm">Sélectionnez une conversation</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                  <button onClick={() => setShowThread(false)} className="md:hidden p-1 rounded-lg hover:bg-slate-100">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <div className="font-semibold text-slate-900">{selectedConv.client_username}</div>
                    <div className="text-xs text-slate-500">Client Luggo</div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
                  {msgs.length === 0 && (
                    <div className="text-center text-sm text-slate-400 mt-8">Aucun message</div>
                  )}
                  {msgs.map(m => {
                    const isMe = m.sender_id === me?.id;
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-slate-100 text-slate-900 rounded-bl-sm"}`}>
                          <p className="leading-relaxed">{m.content}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? "text-blue-200" : "text-slate-400"}`}>{timeAgo(m.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="border-t border-slate-200 px-4 py-3 flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                    placeholder="Écrire un message… (Entrée pour envoyer)"
                    rows={1}
                    className="flex-1 resize-none px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
                  />
                  <button
                    onClick={sendMsg}
                    disabled={!input.trim() || sending}
                    className="h-10 w-10 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
