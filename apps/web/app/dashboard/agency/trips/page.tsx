"use client";

import Link from "next/link";

export default function AgencyPublishTripPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Top />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-extrabold">Publier un trajet</h1>
        <p className="mt-2 text-slate-600">
          Ici on fera le formulaire pour créer un trajet (POST /api/trips/ en tant qu’agence).
        </p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-700">
            ✅ Page branchée. Prochaine étape: formulaire + envoi token (Authorization).
          </p>
        </div>

        <div className="mt-6">
          <Link className="text-blue-700 font-semibold" href="/dashboard/agency">
            ← Retour dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

function Top() {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard/agency" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold">
            L
          </div>
          <span className="font-bold text-white">Luggo</span>
        </Link>
        <span className="text-sm text-slate-300">Espace Agence</span>
      </div>
    </header>
  );
}
