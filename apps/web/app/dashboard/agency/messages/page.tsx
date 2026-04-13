"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE, authHeader, fetchMe, logout } from "@/lib/api";
import {
  Send, MessageSquare, ChevronLeft, Search, Paperclip,
  Mic, File, X, Star, Check, CheckCheck, Play, Pause,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { Suspense } from "react";

type ConvSummary = {
  id: number; agency_id: number; agency_name: string;
  client_id: number; client_username: string; shipment_id: number | null;
  updated_at: string;
  last_message: { content: string; created_at: string; sender_username: string } | null;
  unread_count: number;
};
type Msg = {
  id: number; conversation: number; sender_id: number;
  sender_username: string; content: string; msg_type: string;
  file_url: string | null; created_at: string; is_read: boolean;
};
type ClientProfile = {
  id: number; username: string;
  reviews: { id: number; rating: number; comment: string; created_at: string; reviewer_username: string }[];
  avg_rating: number | null;
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

function msgTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  function toggle() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }
  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <audio ref={audioRef} src={src}
        onTimeUpdate={() => { if (audioRef.current) setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1) * 100); }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
        onEnded={() => setPlaying(false)} />
      <button onClick={toggle} className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 hover:bg-white/30">
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <div className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
        <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      {duration ? <span className="text-[10px] opacity-70 shrink-0">{Math.floor(duration)}s</span> : null}
    </div>
  );
}

export default function AgencyMessagesPage() {
  return <Suspense><AgencyMessagesContent /></Suspense>;
}

function AgencyMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [me, setMe] = useState<{ id: number; username: string } | null>(null);
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  // File attachment
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachPreview, setAttachPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Audio recording
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleLogout() { logout(); router.replace("/login"); }

  const loadConvs = useCallback(() => {
    fetch(`${API_BASE}/conversations/`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : []).then(data => { if (Array.isArray(data)) setConvs(data); }).catch(() => {});
  }, []);

  useEffect(() => {
    const convParam = searchParams.get("conv");
    if (convParam) { setSelectedId(Number(convParam)); setShowThread(true); }
    fetchMe().then((u) => {
      if (u.role !== "AGENCY") { router.replace("/trips"); return; }
      setMe({ id: u.id, username: u.username });
    }).catch(() => router.replace("/login"));
    // Charger les convs immédiatement sans attendre me
    loadConvs();
  }, [router, searchParams, loadConvs]);

  useEffect(() => {
    if (!me) return;
    const iv = setInterval(loadConvs, 5000);
    return () => clearInterval(iv);
  }, [me, loadConvs]);

  // Load client profile when conversation selected
  useEffect(() => {
    setClientProfile(null);
    if (!selectedId) return;
    const conv = convs.find(c => c.id === selectedId);
    if (!conv) return;
    fetch(`${API_BASE}/reviews/?user=${conv.client_id}`, { headers: authHeader() })
      .then(r => r.json())
      .then(reviews => {
        const avg = reviews.length ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : null;
        setClientProfile({ id: conv.client_id, username: conv.client_username, reviews, avg_rating: avg });
      }).catch(() => {});
  }, [selectedId, convs]);

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

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new (window.File)([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        sendFile(file, 'audio');
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch { alert("Accès au microphone refusé."); }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false); setRecordSeconds(0);
  }

  function cancelRecording() {
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current?.stop();
    audioChunksRef.current = [];
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false); setRecordSeconds(0);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAttachment(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setAttachPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else { setAttachPreview(null); }
    e.target.value = "";
  }

  function removeAttachment() { setAttachment(null); setAttachPreview(null); }

  async function sendFile(file: File, type: string) {
    if (!selectedId || sending) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('msg_type', type);
      form.append('content', '');
      const r = await fetch(`${API_BASE}/conversations/${selectedId}/messages/`, {
        method: "POST", headers: authHeader(), body: form,
      });
      if (r.ok) {
        const msg = await r.json();
        setMsgs(prev => [...prev, msg]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        loadConvs();
      }
    } finally { setSending(false); }
  }

  async function sendMsg() {
    if ((!input.trim() && !attachment) || !selectedId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      if (attachment) {
        const form = new FormData();
        form.append('file', attachment);
        form.append('msg_type', attachment.type.startsWith('image/') ? 'image' : 'document');
        form.append('content', content);
        const r = await fetch(`${API_BASE}/conversations/${selectedId}/messages/`, {
          method: "POST", headers: authHeader(), body: form,
        });
        if (r.ok) { const msg = await r.json(); setMsgs(prev => [...prev, msg]); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50); loadConvs(); }
        removeAttachment();
      } else {
        const r = await fetch(`${API_BASE}/conversations/${selectedId}/messages/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ content }),
        });
        if (r.ok) { const msg = await r.json(); setMsgs(prev => [...prev, msg]); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50); loadConvs(); }
      }
    } finally { setSending(false); inputRef.current?.focus(); }
  }

  function selectConv(id: number) { setSelectedId(id); setShowThread(true); setShowProfile(false); }

  const selectedConv = convs.find(c => c.id === selectedId);
  const totalUnread = convs.reduce((s, c) => s + c.unread_count, 0);
  const filteredConvs = convs.filter(c =>
    !search || c.client_username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="h-screen bg-[#f8f9fb] text-[#0a0a0a] flex flex-col overflow-hidden">
      {/* NAVBAR */}
      <header className="shrink-0 bg-white border-b border-gray-100 shadow-sm z-50">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
          <Link href="/dashboard/agency" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-black text-lg">L</div>
            <span className="font-black text-lg tracking-tight text-[#0a0a0a]">Luggo Agence</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/agency" className="hidden md:block px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-[#2563eb] hover:bg-blue-50 transition">Dashboard</Link>
            <NotificationBell />
            <button onClick={handleLogout} className="hidden sm:block px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-[#0a0a0a] hover:bg-gray-50 transition">Déconnexion</button>
          </div>
        </div>
      </header>

      {/* CHAT LAYOUT */}
      <div className="flex-1 flex overflow-hidden mx-auto w-full max-w-6xl">

        {/* SIDEBAR */}
        <div className={`w-full md:w-80 shrink-0 bg-white border-r border-gray-100 flex flex-col ${showThread ? "hidden md:flex" : "flex"}`}>
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Link href="/dashboard/agency" className="text-gray-400 hover:text-[#2563eb] transition text-sm">← Dashboard</Link>
              <div className="flex-1" />
              <h1 className="font-black text-base text-[#0a0a0a] flex items-center gap-2">
                Messages
                {totalUnread > 0 && (
                  <span className="h-5 w-5 rounded-full text-white text-[10px] font-black flex items-center justify-center"
                    style={{ backgroundColor: "#2563eb" }}>{totalUnread}</span>
                )}
              </h1>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un client…"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-[#0a0a0a] placeholder:text-gray-400 focus:outline-none focus:border-[#2563eb]/40 transition" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-center h-full">
                <MessageSquare className="h-12 w-12 text-gray-200" />
                <p className="text-gray-400 text-sm">Aucun message reçu.</p>
                <p className="text-xs text-gray-300">Les clients vous contacteront depuis les trajets.</p>
              </div>
            ) : filteredConvs.map(c => (
              <button key={c.id} onClick={() => selectConv(c.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition ${selectedId === c.id ? "bg-blue-50 border-l-[3px] border-l-[#2563eb]" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center font-black text-sm text-white bg-emerald-600">
                    {c.client_username.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-bold text-sm truncate ${c.unread_count > 0 ? "text-[#0a0a0a]" : "text-gray-700"}`}>{c.client_username}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{c.updated_at ? timeAgo(c.updated_at) : ""}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className={`text-xs truncate flex-1 ${c.unread_count > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                        {c.last_message ? (
                          <>
                            {c.last_message.sender_username === me?.username && <span className="text-[#2563eb]">Vous: </span>}
                            {c.last_message.content || "📎 Fichier"}
                          </>
                        ) : "Nouvelle conversation"}
                      </p>
                      {c.unread_count > 0 && (
                        <span className="h-5 min-w-5 px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0"
                          style={{ backgroundColor: "#2563eb" }}>{c.unread_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* THREAD */}
        <div className={`flex-1 flex flex-col min-w-0 ${showThread ? "flex" : "hidden md:flex"}`}>
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 bg-[#f0f4ff]">
              <MessageSquare className="h-16 w-16 text-gray-200" />
              <p className="text-gray-400 font-medium">Sélectionnez une conversation</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-3 shrink-0">
                <button onClick={() => setShowThread(false)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-50">
                  <ChevronLeft className="h-5 w-5 text-gray-500" />
                </button>
                <button onClick={() => setShowProfile(v => !v)} className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition">
                  <div className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center font-black text-white bg-emerald-600">
                    {selectedConv.client_username.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-[#0a0a0a]">{selectedConv.client_username}</div>
                    <div className="text-xs text-emerald-600">Voir le profil & avis</div>
                  </div>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 bg-[#f0f4ff]"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232563eb' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
                {msgs.length === 0 && (
                  <div className="text-center text-sm text-gray-400 mt-12">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    Aucun message
                  </div>
                )}
                {msgs.map((m, i) => {
                  const isMe = m.sender_id === me?.id;
                  const showTime = i === 0 || new Date(m.created_at).getTime() - new Date(msgs[i-1].created_at).getTime() > 5 * 60000;
                  return (
                    <div key={m.id}>
                      {showTime && (
                        <div className="text-center my-2">
                          <span className="text-[10px] text-gray-400 bg-white/70 px-3 py-1 rounded-full">{msgTime(m.created_at)}</span>
                        </div>
                      )}
                      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-0.5`}>
                        <div className={`max-w-[70%] rounded-2xl text-sm shadow-sm ${
                          isMe ? "text-white rounded-br-sm" : "bg-white text-[#0a0a0a] rounded-bl-sm"
                        }`} style={isMe ? { backgroundColor: "#2563eb" } : {}}>
                          {m.msg_type === "image" && m.file_url ? (
                            <div className="overflow-hidden rounded-2xl">
                              <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                                <img src={m.file_url} alt="Image" className="max-w-[220px] max-h-[220px] object-cover" />
                              </a>
                              {m.content && <p className="px-3 pt-1 pb-2 leading-relaxed">{m.content}</p>}
                            </div>
                          ) : m.msg_type === "audio" && m.file_url ? (
                            <div className="px-3 py-2.5"><AudioPlayer src={m.file_url} /></div>
                          ) : m.msg_type === "document" && m.file_url ? (
                            <div className="px-3 py-2.5">
                              <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                                className={`flex items-center gap-2 ${isMe ? "text-white" : "text-[#2563eb]"}`}>
                                <File className="h-4 w-4 shrink-0" />
                                <span className="text-xs font-semibold underline truncate max-w-[150px]">{m.file_url.split('/').pop()}</span>
                              </a>
                              {m.content && <p className={`mt-1 text-xs ${isMe ? "text-blue-100" : "text-gray-500"}`}>{m.content}</p>}
                            </div>
                          ) : (
                            <div className="px-4 py-2.5"><p className="leading-relaxed">{m.content}</p></div>
                          )}
                          <div className={`flex items-center justify-end gap-1 px-3 pb-1.5`}>
                            <span className={`text-[10px] ${isMe ? "text-blue-200" : "text-gray-400"}`}>{msgTime(m.created_at)}</span>
                            {isMe && (m.is_read ? <CheckCheck className="h-3 w-3 text-blue-200" /> : <Check className="h-3 w-3 text-blue-200" />)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div className="shrink-0 bg-white border-t border-gray-100 px-3 py-3">
                {attachment && (
                  <div className="mb-2 flex items-center gap-2 p-2 bg-blue-50 rounded-xl border border-blue-100">
                    {attachPreview
                      ? <img src={attachPreview} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                      : <File className="h-8 w-8 text-[#2563eb] shrink-0" />}
                    <span className="text-xs text-gray-600 flex-1 truncate">{attachment.name}</span>
                    <button onClick={removeAttachment} className="p-1 hover:bg-blue-100 rounded-lg"><X className="h-4 w-4 text-gray-400" /></button>
                  </div>
                )}
                {recording ? (
                  <div className="flex items-center gap-3 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="text-sm font-bold text-red-600 flex-1">
                      {Math.floor(recordSeconds / 60).toString().padStart(2, "0")}:{(recordSeconds % 60).toString().padStart(2, "0")}
                    </span>
                    <button onClick={cancelRecording} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500"><X className="h-4 w-4" /></button>
                    <button onClick={stopRecording}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold hover:bg-blue-700"
                      style={{ backgroundColor: "#2563eb" }}><Send className="h-3.5 w-3.5" /> Envoyer</button>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.zip" className="hidden" onChange={handleFileSelect} />
                    <button onClick={() => fileRef.current?.click()} className="p-2.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-[#2563eb] transition shrink-0">
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <div className="flex-1 relative">
                      <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                        placeholder="Écrire un message…" rows={1}
                        className="w-full resize-none px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#2563eb]/40 focus:bg-white focus:outline-none text-sm text-[#0a0a0a] placeholder:text-gray-400 max-h-32 overflow-y-auto transition"
                        style={{ lineHeight: "1.5" }} />
                    </div>
                    {input.trim() || attachment ? (
                      <button onClick={sendMsg} disabled={sending}
                        className="h-10 w-10 rounded-full text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-blue-700 transition"
                        style={{ backgroundColor: "#2563eb" }}><Send className="h-4 w-4" /></button>
                    ) : (
                      <button onClick={startRecording}
                        className="h-10 w-10 rounded-full bg-gray-100 hover:bg-[#2563eb] text-gray-500 hover:text-white flex items-center justify-center shrink-0 transition">
                        <Mic className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* PROFILE PANEL */}
        {showProfile && selectedConv && (
          <div className="hidden lg:flex w-72 shrink-0 bg-white border-l border-gray-100 flex-col overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-sm text-[#0a0a0a]">Profil client</span>
              <button onClick={() => setShowProfile(false)} className="p-1.5 rounded-lg hover:bg-gray-50"><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <div className="p-5 flex flex-col items-center text-center border-b border-gray-100">
              <div className="h-16 w-16 rounded-full flex items-center justify-center font-black text-2xl text-white mb-3 bg-emerald-600">
                {selectedConv.client_username.slice(0, 1).toUpperCase()}
              </div>
              <div className="font-black text-[#0a0a0a] text-base">{selectedConv.client_username}</div>
              <div className="text-xs text-gray-400 mt-0.5">Client Luggo</div>
              {clientProfile?.avg_rating && (
                <div className="flex items-center gap-1 mt-2">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`h-4 w-4 ${s <= Math.round(clientProfile.avg_rating!) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} />
                  ))}
                  <span className="text-sm font-bold text-[#0a0a0a] ml-1">{clientProfile.avg_rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className="p-4 flex-1">
              <p className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">
                Avis reçus ({clientProfile?.reviews.length ?? 0})
              </p>
              {!clientProfile || clientProfile.reviews.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Aucun avis pour ce client.</p>
              ) : (
                <div className="space-y-3">
                  {clientProfile.reviews.slice(0, 5).map(r => (
                    <div key={r.id} className="rounded-xl bg-gray-50 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#0a0a0a]">{r.reviewer_username}</span>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-xs text-gray-500 leading-relaxed">{r.comment}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
