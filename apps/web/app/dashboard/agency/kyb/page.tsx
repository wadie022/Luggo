"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe } from "@/lib/api";
import {
  ShieldCheck, ShieldX, Clock, Upload, ArrowLeft,
  CheckCircle2, XCircle, Building2,
} from "lucide-react";

type KYBStatus = "PENDING" | "VERIFIED" | "REJECTED";

type KYBData = {
  status: KYBStatus;
  rejection_reason?: string;
  extracted_data?: {
    document_type?: string;
    company_name?: string;
    registration_number?: string;
    legal_form?: string;
    address?: string;
    manager_name?: string;
    country?: string;
  };
  submitted_at?: string;
  verified_at?: string;
};

const STATUS_CONFIG = {
  VERIFIED: {
    icon: <ShieldCheck className="h-6 w-6" />,
    label: "Entreprise vérifiée",
    cls: "bg-emerald-50 border-emerald-200 text-emerald-700",
    iconCls: "bg-emerald-100 text-emerald-700",
  },
  REJECTED: {
    icon: <ShieldX className="h-6 w-6" />,
    label: "Document rejeté",
    cls: "bg-red-50 border-red-200 text-red-700",
    iconCls: "bg-red-100 text-red-700",
  },
  PENDING: {
    icon: <Clock className="h-6 w-6" />,
    label: "En attente de vérification",
    cls: "bg-amber-50 border-amber-200 text-amber-700",
    iconCls: "bg-amber-100 text-amber-700",
  },
};

export default function AgencyKYBPage() {
  const router = useRouter();
  const docRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [kybData, setKybData] = useState<KYBData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);


  useEffect(() => {
    async function boot() {
      try {
        const me = await fetchMe();
        if (me.role !== "AGENCY") { router.replace("/trips"); return; }
      } catch {
        router.replace("/login"); return;
      }
      try {
        const res = await fetch(`${API_BASE}/agency/kyb/status/`, { headers: authHeader() });
        const data = await res.json();
        setKybData(data);
      } catch {
        setKybData({ status: "PENDING" });
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, [router]);

  function previewFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = docRef.current?.files?.[0];
    if (!file) { setErrorMsg("Le document est obligatoire."); return; }

    setSubmitting(true);
    setErrorMsg(null);

    const form = new FormData();
    form.append("document", file);

    try {
      const res = await fetch(`${API_BASE}/agency/kyb/upload/`, {
        method: "POST",
        headers: authHeader(),
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Erreur lors de l'upload.");
      setKybData(data as KYBData);
      setPreview(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-500">Chargement…</p>
      </main>
    );
  }

  const cfg = STATUS_CONFIG[kybData?.status ?? "PENDING"];

  return (
    <main className="min-h-screen bg-white text-slate-900">

      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/dashboard/agency" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour au dashboard
        </Link>

        <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">Vérification d'entreprise</div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Vérification KYB</h1>
        <p className="text-slate-600 mb-8">
          Télécharge un document officiel de ton entreprise : <strong>Kbis</strong> (France/Belgique) ou <strong>Registre de Commerce</strong> (Maroc).
          La vérification est automatique par IA.
        </p>

        {/* Statut actuel */}
        <div className={`rounded-3xl border p-5 flex items-center gap-4 mb-8 ${cfg.cls}`}>
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${cfg.iconCls}`}>
            {cfg.icon}
          </div>
          <div>
            <div className="font-bold text-lg">Statut : {cfg.label}</div>
            {kybData?.status === "REJECTED" && kybData.rejection_reason && (
              <p className="text-sm mt-1">{kybData.rejection_reason}</p>
            )}
            {kybData?.status === "VERIFIED" && kybData.verified_at && (
              <p className="text-sm mt-1">Vérifié le {new Date(kybData.verified_at).toLocaleDateString("fr-FR")}</p>
            )}
          </div>
        </div>

        {/* Données extraites si VERIFIED */}
        {kybData?.status === "VERIFIED" && kybData.extracted_data && Object.keys(kybData.extracted_data).length > 0 && (
          <div className="rounded-3xl border border-emerald-200 bg-white shadow-sm p-6 mb-8">
            <div className="flex items-center gap-2 font-bold text-emerald-700 mb-4">
              <CheckCircle2 className="h-5 w-5" /> Informations extraites
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              {kybData.extracted_data.company_name && <InfoRow label="Raison sociale" value={kybData.extracted_data.company_name} />}
              {kybData.extracted_data.registration_number && <InfoRow label="N° d'immatriculation" value={kybData.extracted_data.registration_number} />}
              {kybData.extracted_data.legal_form && <InfoRow label="Forme juridique" value={kybData.extracted_data.legal_form} />}
              {kybData.extracted_data.manager_name && <InfoRow label="Gérant / Représentant" value={kybData.extracted_data.manager_name} />}
              {kybData.extracted_data.document_type && <InfoRow label="Type de document" value={kybData.extracted_data.document_type} />}
              {kybData.extracted_data.country && <InfoRow label="Pays" value={kybData.extracted_data.country} />}
              {kybData.extracted_data.address && (
                <div className="md:col-span-2 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                  <div className="text-xs font-semibold uppercase text-slate-400">Adresse du siège</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{kybData.extracted_data.address}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Formulaire upload */}
        {kybData?.status !== "VERIFIED" && (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="h-5 w-5 text-slate-600" />
              <h2 className="font-bold text-slate-900">
                {kybData?.status === "REJECTED" ? "Soumettre un nouveau document" : "Soumettre votre document d'entreprise"}
              </h2>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 mb-5">
              <strong>Documents acceptés :</strong> Kbis (France / Belgique), extrait du Registre de Commerce (Maroc),
              ou tout document officiel d'immatriculation d'entreprise en cours de validité.
            </div>

            {errorMsg && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4 flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />{errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                  Document officiel <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => docRef.current?.click()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/30 transition p-8 flex flex-col items-center gap-2"
                >
                  {preview ? (
                    <img src={preview} alt="Document" className="max-h-52 rounded-xl object-contain" />
                  ) : (
                    <>
                      <Building2 className="h-10 w-10 text-slate-300" />
                      <span className="text-sm text-slate-500 font-medium">Clique pour sélectionner ton document</span>
                      <span className="text-xs text-slate-400">Kbis · Registre de Commerce · JPG, PNG — max 5 Mo</span>
                    </>
                  )}
                </div>
                <input
                  ref={docRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && previewFile(e.target.files[0])}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold shadow-sm transition flex items-center justify-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {submitting ? "Vérification en cours…" : "Soumettre et vérifier"}
              </button>

              <p className="text-xs text-slate-400 text-center">
                Ton document est analysé automatiquement par IA. Il n'est pas partagé avec des tiers.
              </p>
            </form>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-10 mt-10">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm">L</div>
            <span className="font-semibold">Luggo</span>
          </div>
          <div className="text-sm text-slate-500">© {new Date().getFullYear()} Luggo.ma — Tous droits réservés.</div>
        </div>
      </footer>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
      <div className="text-xs font-semibold uppercase text-slate-400">{label}</div>
      <div className="font-semibold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}
