"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, fetchMe, authHeader } from "@/lib/api";

type TripPayload = {
  origin_country: string;
  origin_city: string;
  dest_country: string;
  dest_city: string;
  departure_at: string; // ISO
  arrival_eta?: string | null; // ISO
  capacity_kg: number;
  price_per_kg: number;
  home_delivery_price: number;
  status?: string;
};

export default function Page() {
  const router = useRouter();

  const [loadingBoot, setLoadingBoot] = useState(true);

  // form
  const [originCountry, setOriginCountry] = useState("FR");
  const [originCity, setOriginCity] = useState("");
  const [destCountry, setDestCountry] = useState("MA");
  const [destCity, setDestCity] = useState("");
  const [departureAt, setDepartureAt] = useState(""); // datetime-local
  const [arrivalEta, setArrivalEta] = useState(""); // datetime-local (optional)
  const [capacityKg, setCapacityKg] = useState<number>(20);
  const [pricePerKg, setPricePerKg] = useState<number>(5);
  const [status, setStatus] = useState<"PUBLISHED" | "CLOSED">("PUBLISHED");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<any>(null);
  const [citySuggestions, setCitySuggestions] = useState<{ name: string; country: string }[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const cityDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // boot check (must be agency)
  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        if (me.role !== "AGENCY") {
          router.push("/trips");
          return;
        }
      } catch {
        router.push("/login");
        return;
      } finally {
        setLoadingBoot(false);
      }
    })();
  }, [router]);

  async function searchCity(query: string) {
    setOriginCity(query);
    if (cityDebounce.current) clearTimeout(cityDebounce.current);
    if (query.length < 2) { setCitySuggestions([]); return; }
    cityDebounce.current = setTimeout(async () => {
      setCitySearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1&featuretype=city`,
          { headers: { "Accept-Language": "fr" } }
        );
        const data = await res.json();
        const seen = new Set<string>();
        const results: { name: string; country: string }[] = [];
        for (const r of data) {
          const city = r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || r.name;
          const country = r.address?.country_code?.toUpperCase() || "";
          const key = `${city}-${country}`;
          if (city && !seen.has(key)) { seen.add(key); results.push({ name: city, country }); }
        }
        setCitySuggestions(results);
      } catch {
        setCitySuggestions([]);
      } finally {
        setCitySearching(false);
      }
    }, 350);
  }

  function toISO(dtLocal: string) {
    return dtLocal ? new Date(dtLocal).toISOString() : "";
  }

  const canSubmit = useMemo(() => {
    return (
      originCountry.trim().length === 2 &&
      destCountry.trim().length === 2 &&
      originCity.trim().length >= 2 &&
      destCity.trim().length >= 2 &&
      departureAt.trim().length > 0 &&
      capacityKg > 0 &&
      pricePerKg > 0
    );
  }, [
    originCountry,
    destCountry,
    originCity,
    destCity,
    departureAt,
    capacityKg,
    pricePerKg,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    setErrorMsg(null);
    setApiErrors(null);

    try {
      const payload: TripPayload = {
        origin_country: originCountry.toUpperCase(),
        origin_city: originCity.trim(),
        dest_country: destCountry.toUpperCase(),
        dest_city: destCity.trim(),
        departure_at: toISO(departureAt),
        arrival_eta: arrivalEta ? toISO(arrivalEta) : null,
        capacity_kg: Number(capacityKg),
        price_per_kg: Number(pricePerKg),
        home_delivery_price: 8,
        status,
      };

      const res = await fetch(`${API_BASE}/trips/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setApiErrors(data);
        throw new Error(data?.detail || "Impossible de publier le trajet.");
      }

      setSuccess("Trajet publié avec succès ✅");
      setTimeout(() => router.push("/dashboard/agency"), 700);
    } catch (e: any) {
      setErrorMsg(e.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingBoot) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-700">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">Publier un trajet</h1>
            <p className="mt-2 text-slate-600">
              Crée un trajet visible côté client. Les demandes arriveront ensuite
              dans “Demandes”.
            </p>
          </div>
          <Link className="text-blue-700 font-semibold" href="/dashboard/agency">
            ← Retour dashboard
          </Link>
        </div>

        <div className="mt-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <Field label="Pays d'origine (ISO)">
                <input
                  value={originCountry}
                  onChange={(e) => setOriginCountry(e.target.value)}
                  maxLength={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="FR"
                  required
                />
              </Field>

              <Field label="Ville d'origine">
                <div className="relative">
                  <input
                    value={originCity}
                    onChange={(e) => searchCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Paris"
                    autoComplete="off"
                    required
                  />
                  {citySearching && (
                    <p className="mt-1 text-xs text-blue-400">Recherche…</p>
                  )}
                  {citySuggestions.length > 0 && (
                    <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {citySuggestions.map((s, i) => (
                        <li
                          key={i}
                          onClick={() => {
                            setOriginCity(s.name);
                            if (s.country) setOriginCountry(s.country);
                            setCitySuggestions([]);
                          }}
                          className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between"
                        >
                          <span>{s.name}</span>
                          <span className="text-xs text-slate-400 font-semibold">{s.country}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Field>

              <Field label="Pays de destination (ISO)">
                <input
                  value={destCountry}
                  onChange={(e) => setDestCountry(e.target.value)}
                  maxLength={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="MA"
                  required
                />
              </Field>

              <Field label="Ville de destination">
                <input
                  value={destCity}
                  onChange={(e) => setDestCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Casablanca"
                  required
                />
              </Field>

              <Field label="Départ">
                <input
                  type="datetime-local"
                  value={departureAt}
                  onChange={(e) => setDepartureAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </Field>

              <Field label="Arrivée estimée (optionnel)">
                <input
                  type="datetime-local"
                  value={arrivalEta}
                  onChange={(e) => setArrivalEta(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Capacité (kg)">
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={capacityKg}
                  onChange={(e) => setCapacityKg(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </Field>

              <Field label="Prix par kg (€)">
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </Field>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1 uppercase text-slate-500">
                  Statut
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus("PUBLISHED")}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                      status === "PUBLISHED"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    PUBLISHED
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("CLOSED")}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                      status === "CLOSED"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    CLOSED
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                {errorMsg && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMsg}
                  </div>
                )}
                {success && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {success}
                  </div>
                )}
                {apiErrors && (
                  <pre className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-2xl p-3 whitespace-pre-wrap">
                    {JSON.stringify(apiErrors, null, 2)}
                  </pre>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="mt-4 w-full px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold shadow-sm"
                >
                  {submitting ? "Publication..." : "Publier le trajet"}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="text-sm font-semibold text-slate-900">Conseils</div>
            <ul className="mt-3 grid gap-2 text-sm text-slate-600">
              <li>• Codes pays ISO : FR, BE, ES, CH, IT, MA.</li>
              <li>• Le prix client = prix agence + frais service (UI après).</li>
              <li>• La capacité sera liée aux demandes acceptées (après).</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard/agency" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold">
            L
          </div>
          <span className="font-bold text-white">Luggo</span>
        </Link>

        <Link
          href="/dashboard/agency"
          className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          Dashboard
        </Link>
      </div>
    </header>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1 uppercase text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}
