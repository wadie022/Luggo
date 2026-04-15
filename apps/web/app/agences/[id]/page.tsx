"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE, getRole } from "@/lib/api";
import {
  MapPin, Star, Package, Calendar, ArrowRight,
  Building2, CheckCircle2, MessageSquare, ChevronRight,
} from "lucide-react";
import ClientNavbar from "@/components/ClientNavbar";

const COUNTRY_NAMES: Record<string, string> = {
  FR: "France", BE: "Belgique", ES: "Espagne", IT: "Italie",
  NL: "Pays-Bas", CH: "Suisse", DE: "Allemagne", PT: "Portugal", MA: "Maroc",
};

type AgencyProfile = {
  id: number;
  legal_name: string;
  city: string;
  country: string;
  address: string;
  kyc_status: string;
  avg_rating: number | null;
  review_count: number;
  branches: {
    id: number; label: string; address: string;
    city: string; country: string; is_main: boolean;
  }[];
  trips: {
    id: number; origin_city: string; origin_country: string;
    dest_city: string; dest_country: string;
    departure_at: string; price_per_kg: number; capacity_kg: number;
  }[];
  reviews: {
    id: number; rating: number; comment: string;
    created_at: string; reviewer_username: string;
  }[];
};

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${sz} ${s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`}
        />
      ))}
    </div>
  );
}

export default function AgencyPublicPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [agency, setAgency] = useState<AgencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role = typeof window === "undefined" ? null : getRole();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/agencies/${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error("Agence introuvable.");
        return r.json();
      })
      .then(setAgency)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f9fb]">
        <ClientNavbar />
        <div className="flex items-center justify-center py-32">
          <p className="text-gray-400 animate-pulse">Chargement…</p>
        </div>
      </main>
    );
  }

  if (error || !agency) {
    return (
      <main className="min-h-screen bg-[#f8f9fb]">
        <ClientNavbar />
        <div className="mx-auto max-w-2xl px-5 py-20 text-center">
          <p className="text-gray-500">{error ?? "Agence introuvable."}</p>
          <Link href="/trips" className="mt-4 inline-block text-[#2563eb] font-semibold">
            ← Retour aux trajets
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9fb] text-[#0a0a0a]">
      <ClientNavbar />

      {/* HERO */}
      <section className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-5 py-10">
          <Link href="/trips" className="text-sm text-gray-400 hover:text-[#2563eb] transition mb-4 inline-block">
            ← Retour aux trajets
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-12 w-12 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center font-black text-xl shrink-0">
                  {agency.legal_name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight">{agency.legal_name}</h1>
                    {agency.kyc_status === "VERIFIED" && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {agency.city}, {COUNTRY_NAMES[agency.country] ?? agency.country}
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-3">
                {agency.avg_rating !== null ? (
                  <>
                    <Stars rating={agency.avg_rating} size="lg" />
                    <span className="text-lg font-black text-[#0a0a0a]">{agency.avg_rating.toFixed(1)}</span>
                    <span className="text-sm text-gray-400">({agency.review_count} avis)</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-400">Aucun avis pour le moment</span>
                )}
              </div>
            </div>

            {/* CTA contact */}
            {role !== "AGENCY" && (
              <button
                onClick={() =>
                  router.push(`/messages?agency=${agency.id}&name=${encodeURIComponent(agency.legal_name)}`)
                }
                className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition shrink-0"
                style={{ backgroundColor: "#2563eb" }}
              >
                <MessageSquare className="h-4 w-4" />
                Contacter l'agence
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-8 grid lg:grid-cols-3 gap-6">

        {/* LEFT: Trajets + Avis */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Trajets disponibles */}
          <div>
            <h2 className="text-base font-black text-[#0a0a0a] mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-[#2563eb]" />
              Trajets disponibles ({agency.trips.length})
            </h2>
            {agency.trips.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                <p className="text-gray-400 text-sm">Aucun trajet publié pour le moment.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {agency.trips.map((trip) => (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}/book`}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-[#2563eb]/20 hover:shadow-md transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-black text-[#0a0a0a]">
                        {trip.origin_city}
                        <ArrowRight className="h-3.5 w-3.5 text-[#2563eb]" />
                        {trip.dest_city}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(trip.departure_at).toLocaleDateString("fr-FR", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </span>
                        <span>{COUNTRY_NAMES[trip.origin_country] ?? trip.origin_country} → {COUNTRY_NAMES[trip.dest_country] ?? trip.dest_country}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xl font-black text-[#2563eb]">{trip.price_per_kg} €<span className="text-xs font-semibold text-gray-400">/kg</span></span>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#2563eb] transition" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Avis */}
          <div>
            <h2 className="text-base font-black text-[#0a0a0a] mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              Avis clients ({agency.review_count})
            </h2>
            {agency.reviews.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                <p className="text-gray-400 text-sm">Aucun avis pour le moment.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {agency.reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-xs font-black">
                          {r.reviewer_username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm">{r.reviewer_username}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Stars rating={r.rating} />
                        <span className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    {r.comment && (
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Adresses */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-[#0a0a0a] mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#2563eb]" />
              Nos adresses
            </h2>
            {agency.branches.length === 0 && !agency.address ? (
              <p className="text-sm text-gray-400">Aucune adresse renseignée.</p>
            ) : (
              <div className="grid gap-3">
                {agency.branches.length > 0
                  ? agency.branches.map((b) => (
                      <div key={b.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="font-semibold text-sm text-[#0a0a0a] flex items-center gap-1">
                          {b.label}
                          {b.is_main && (
                            <span className="ml-1 text-[10px] font-bold text-[#2563eb] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
                              Principale
                            </span>
                          )}
                        </div>
                        {b.address && (
                          <p className="text-xs text-gray-500 mt-0.5">{b.address}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {b.city}, {COUNTRY_NAMES[b.country] ?? b.country}
                        </p>
                      </div>
                    ))
                  : agency.address && (
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-sm text-gray-600">{agency.address}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {agency.city}, {COUNTRY_NAMES[agency.country] ?? agency.country}
                        </p>
                      </div>
                    )
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
