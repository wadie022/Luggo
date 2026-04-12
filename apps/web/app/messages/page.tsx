"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE, authHeader, fetchMe, logout } from "@/lib/api";
import { ArrowLeft, Send, MessageSquare, ChevronLeft } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type ConvSummary = {
  id: number; agency_id: number; agency_name: string;
  client_id: number; client_username: string; shipment_id: number | null;
  updated_at: string;
  last_message: { content: string; created_at: string; sender_username: string } | null;
  unread_count: number;
};
type Msg = {
  id: number; conversation: number; sender_id: number;
  sender_username: string; content: string; created_at: string; is_read: boolean;
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function MessagesPage() {
  return <Suspense><MessagesContent /></Suspense>;
}

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [me, setMe] = useState<{ id: number; username: string } | null>(null);
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [newAgencyId, setNewAgencyId] = useState<number | null>(null);
  const [newAgencyName, setNewAgencyName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleLogout() { logout(); router.replace("/login"); }

  useEffect(() => {
    const agencyParam = searchParams.get("agency");
    const nameParam = searchParams.get("name");
    if (agencyParam) { setNewAgencyId(Number(agencyParam)); setNewAgencyName(nameParam || ""); }
    fetchMe().then((u) => {
      if (u.role !== "CLIENT") { router.replace("/trips"); return; }
      setMe({ id: u.id, username: u.username });
    }).catch(() => router.replace("/login"));
  }, [router, searchParams]);

  useEffect(() => {
    if (!me) return;
    const load = () => fetch(`${API_BASE}/conversations/`, { headers: authHeader() })
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

  async function startConversation() {
    if (!newAgencyId || !input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const r = await fetch(`${API_BASE}/conversations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ agency_id: newAgencyId, content }),
      });
      if (r.ok) {
        const conv = await r.json();
        setConvs(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
        setSelectedId(conv.id);
        setShowThread(true);
        setNewAgencyId(null);
        setNewAgencyName("");
        const mr = await fetch(`${API_BASE}/conversations/${conv.id}/messages/`, { headers: authHeader() });
        if (mr.ok) setMsgs(await mr.json());
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } finally { setSending(false); }
  }

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

  return (
    <main className="min-h-screen bg-[#080808] text-white flex flex-col">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#080808]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
          <Link href="/trips" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">L</div>
            <span className="font-black text-lg tracking-tight">Luggo</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/trips" className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">Trajets</Link>
            <Link href="/mes-colis" className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">Mes colis</Link>
            <NotificationBell />
            <button onClick={handleLogout} className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="flex-1 mx-auto w-full max-w-5xl px-5 py-6 flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/trips" className="inline-flex items-center text-white/40 hover:text-white transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-bold tracking-widest text-blue-500 uppercase">Messagerie</p>
            <h1 className="text-xl font-black">Messages</h1>
          </div>
        </div>

        <div className="flex-1 flex border border-white/[0.06] rounded-2xl overflow-hidden bg-[#0d0d0d]" style={{ minHeight: 500 }}>

          {/* Conversation list */}
          <div className={`w-full md:w-80 border-r border-white/[0.06] flex flex-col ${showThread ? "hidden md:flex" : "flex"}`}>
            <div className="px-4 py-3 border-b border-white/[0.04] font-bold text-sm text-white/50">
              Conversations ({convs.length})
            </div>
            {convs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <MessageSquare className="h-10 w-10 text-white/10" />
                <p className="text-white/35 text-sm">Aucune conversation.</p>
                <p className="text-xs text-white/25">Contactez une agence depuis la page des trajets.</p>
                <Link href="/trips" className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition">
                  Voir les trajets
                </Link>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {convs.map(c => (
                  <button key={c.id} onClick={() => selectConv(c.id)}
                    className={`w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition ${
                      selectedId === c.id ? "bg-blue-600/10 border-l-2 border-l-blue-500" : ""
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm truncate">{c.agency_name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.unread_count > 0 && (
                          <span className="h-5 min-w-5 px-1 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                            {c.unread_count}
                          </span>
                        )}
                        <span className="text-[10px] text-white/25">{c.updated_at ? timeAgo(c.updated_at) : ""}</span>
                      </div>
                    </div>
                    {c.last_message && (
                      <p className="text-xs text-white/35 mt-0.5 truncate">
                        <span className="font-semibold">{c.last_message.sender_username === me?.username ? "Vous" : c.last_message.sender_username}:</span>{" "}
                        {c.last_message.content}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thread */}
          <div className={`flex-1 flex flex-col ${showThread || newAgencyId ? "flex" : "hidden md:flex"}`}>
            {newAgencyId ? (
              <>
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <div className="font-bold">{newAgencyName || "Nouvelle agence"}</div>
                  <div className="text-xs text-white/40">Démarrer une conversation</div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-white/30 text-sm">
                    <MessageSquare className="h-10 w-10 mx-auto mb-2 text-white/10" />
                    Envoyez votre premier message à cette agence
                  </div>
                </div>
                <div className="border-t border-white/[0.06] px-4 py-3 flex items-end gap-2">
                  <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); startConversation(); } }}
                    placeholder="Votre message… (Entrée pour envoyer)" rows={1} autoFocus
                    className="flex-1 resize-none px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 focus:outline-none text-sm text-white placeholder:text-white/25 max-h-32 transition" />
                  <button onClick={startConversation} disabled={!input.trim() || sending}
                    className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : !selectedConv ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-8">
                <MessageSquare className="h-12 w-12 text-white/10" />
                <p className="text-white/30 text-sm">Sélectionnez une conversation</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
                  <button onClick={() => setShowThread(false)} className="md:hidden p-1.5 rounded-lg hover:bg-white/[0.06] transition">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <div className="font-bold">{selectedConv.agency_name}</div>
                    <div className="text-xs text-white/40">Agence partenaire Luggo</div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
                  {msgs.length === 0 && (
                    <div className="text-center text-sm text-white/25 mt-8">Aucun message — écrivez le premier !</div>
                  )}
                  {msgs.map(m => {
                    const isMe = m.sender_id === me?.id;
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                          isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-white/[0.06] text-white rounded-bl-sm"
                        }`}>
                          <p className="leading-relaxed">{m.content}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? "text-blue-300" : "text-white/30"}`}>
                            {timeAgo(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="border-t border-white/[0.06] px-4 py-3 flex items-end gap-2">
                  <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                    placeholder="Écrire un message… (Entrée pour envoyer)" rows={1}
                    className="flex-1 resize-none px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 focus:outline-none text-sm text-white placeholder:text-white/25 max-h-32 overflow-y-auto transition"
                    style={{ lineHeight: "1.5" }} />
                  <button onClick={sendMsg} disabled={!input.trim() || sending}
                    className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition">
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
