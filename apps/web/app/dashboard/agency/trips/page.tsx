"use client";

import Link from "next/link";

export default function AgencyPublishTripPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-extrabold">Publier un trajet</h1>
        <p className="mt-2 text-slate-600">
          Ici on fera le formulaire pour créer un trajet (POST /api/trips/ en tant qu'agence).
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
