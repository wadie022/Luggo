"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, authHeader, fetchMe, getRole } from "@/lib/api";
import { ShieldCheck, ShieldX, Clock, Upload, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import ClientNavbar from "@/components/ClientNavbar";

type KYCStatus = "PENDING" | "VERIFIED" | "REJECTED";

type KYCData = {
  status: KYCStatus;
  rejection_reason?: string;
  extracted_data?: {
    document_type?: string;
    last_name?: string;
    first_name?: string;
    date_of_birth?: string;
    id_number?: string;
    expiry_date?: string;
    country?: string;
  };
  submitted_at?: string;
  verified_at?: string;
};

const STATUS_CONFIG = {
  VERIFIED: {
    icon: <ShieldCheck className="h-6 w-6" />,
    label: "Vérifié",
    cls: "bg-emerald-50 border-emerald-200 text-emerald-700",
    iconCls: "bg-emerald-100 text-emerald-700",
  },
  REJECTED: {
    icon: <ShieldX className="h-6 w-6" />,
    label: "Rejeté",
    cls: "bg-red-50 border-red-200 text-red-700",
    iconCls: "bg-red-100 text-red-700",
  },
  PENDING: {
    icon: <Clock className="h-6 w-6" />,
    label: "En attente",
    cls: "bg-amber-50 border-amber-200 text-amber-700",
    iconCls: "bg-amber-100 text-amber-700",
  },
};

export default function KYCPage() {
  const router = useRouter();
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef  = useRef<HTMLInputElement>(null);

  const [loading, setLoading]         = useState(true);
  const [kycData, setKycData]         = useState<KYCData | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview]   = useState<string | null>(null);

  const role = typeof window === "undefined" ? null : getRole();


  useEffect(() => {
    fetchMe().catch(() => router.replace("/login"));
    fetch(`${API_BASE}/kyc/status/`, { headers: authHeader() })
      .then((r) => r.json())
      .then(setKycData)
      .catch(() => setKycData({ status: "PENDING" }))
      .finally(() => setLoading(false));
  }, [router]);

  function previewFile(file: File, setter: (url: string) => void) {
    const reader = new FileReader();
    reader.onload = (e) => setter(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const front = frontRef.current?.files?.[0];
    if (!front) { setErrorMsg("Le recto est obligatoire."); return; }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const form = new FormData();
    form.append("id_front", front);
    const back = backRef.current?.files?.[0];
    if (back) form.append("id_back", back);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${API_BASE}/kyc/upload/`, {
        method: "POST",
        headers: authHeader(),
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Erreur lors de l'upload.");
      setKycData(data as KYCData);
      if ((data as KYCData).status === "VERIFIED") {
        setSuccessMsg("Identité vérifiée avec succès !");
      } else {
        setSuccessMsg("Document soumis. En attente de vérification.");
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setErrorMsg("Délai dépassé (30s). Vérifie ta connexion et réessaie.");
      } else {
        setErrorMsg(err.message || "Erreur lors de l'upload.");
      }
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

  const cfg = STATUS_CONFIG[kycData?.status ?? "PENDING"];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <ClientNavbar />

      <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        <Link href={role === "AGENCY" ? "/dashboard/agency" : "/trips"} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>

        <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">Vérification d'identité</div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Mon KYC</h1>
        <p className="text-slate-600 mb-8">
          Télécharge une pièce d'identité valide (CNI, passeport, permis). La vérification est automatique.
        </p>

        {/* Statut actuel */}
        <div className={`rounded-3xl border p-5 flex items-center gap-4 mb-8 ${cfg.cls}`}>
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${cfg.iconCls}`}>
            {cfg.icon}
          </div>
          <div>
            <div className="font-bold text-lg">Statut : {cfg.label}</div>
            {kycData?.status === "REJECTED" && kycData.rejection_reason && (
              <p className="text-sm mt-1">{kycData.rejection_reason}</p>
            )}
            {kycData?.status === "VERIFIED" && kycData.verified_at && (
              <p className="text-sm mt-1">Vérifié le {new Date(kycData.verified_at).toLocaleDateString("fr-FR")}</p>
            )}
          </div>
        </div>

        {/* CTA si VERIFIED */}
        {kycData?.status === "VERIFIED" && (
          <div className="mb-6 flex justify-end">
            <Link href="/trips" className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm">
              Continuer vers les trajets →
            </Link>
          </div>
        )}

        {/* Données extraites si VERIFIED */}
        {kycData?.status === "VERIFIED" && kycData.extracted_data && Object.keys(kycData.extracted_data).length > 0 && (
          <div className="rounded-3xl border border-emerald-200 bg-white shadow-sm p-6 mb-8">
            <div className="flex items-center gap-2 font-bold text-emerald-700 mb-4">
              <CheckCircle2 className="h-5 w-5" /> Informations extraites
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              {kycData.extracted_data.last_name && <InfoRow label="Nom" value={kycData.extracted_data.last_name} />}
              {kycData.extracted_data.first_name && <InfoRow label="Prénom" value={kycData.extracted_data.first_name} />}
              {kycData.extracted_data.date_of_birth && <InfoRow label="Date de naissance" value={kycData.extracted_data.date_of_birth} />}
              {kycData.extracted_data.id_number && <InfoRow label="N° document" value={kycData.extracted_data.id_number} />}
              {kycData.extracted_data.document_type && <InfoRow label="Type" value={kycData.extracted_data.document_type} />}
              {kycData.extracted_data.expiry_date && <InfoRow label="Expiration" value={kycData.extracted_data.expiry_date} />}
              {kycData.extracted_data.country && <InfoRow label="Pays" value={kycData.extracted_data.country} />}
            </div>
          </div>
        )}

        {/* Formulaire upload (toujours visible pour re-soumettre) */}
        {kycData?.status !== "VERIFIED" && (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
            <h2 className="font-bold text-slate-900 mb-5">
              {kycData?.status === "REJECTED" ? "Soumettre à nouveau" : "Soumettre votre pièce d'identité"}
            </h2>

            {errorMsg && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4 flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />{errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />{successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid gap-5">
              {/* Recto */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                  Recto <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => frontRef.current?.click()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/30 transition p-6 flex flex-col items-center gap-2"
                >
                  {frontPreview ? (
                    <img src={frontPreview} alt="Recto" className="max-h-40 rounded-xl object-contain" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-400" />
                      <span className="text-sm text-slate-500">Clique pour sélectionner le recto</span>
                      <span className="text-xs text-slate-400">JPG, PNG — max 5 Mo</span>
                    </>
                  )}
                </div>
                <input
                  ref={frontRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && previewFile(e.target.files[0], setFrontPreview)}
                />
              </div>

              {/* Verso */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                  Verso <span className="text-slate-400">(optionnel)</span>
                </label>
                <div
                  onClick={() => backRef.current?.click()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/30 transition p-6 flex flex-col items-center gap-2"
                >
                  {backPreview ? (
                    <img src={backPreview} alt="Verso" className="max-h-40 rounded-xl object-contain" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-400" />
                      <span className="text-sm text-slate-500">Clique pour sélectionner le verso</span>
                    </>
                  )}
                </div>
                <input
                  ref={backRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && previewFile(e.target.files[0], setBackPreview)}
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
                Tes documents sont analysés automatiquement par IA. Ils ne sont pas partagés avec des tiers.
              </p>
            </form>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-10 mt-10">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2"><LogoL small /><span className="font-semibold">Luggo</span></div>
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

function LogoL({ small }: { small?: boolean }) {
  const size = small ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className={`${size} rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold shadow-sm`}>L</div>
  );
}
