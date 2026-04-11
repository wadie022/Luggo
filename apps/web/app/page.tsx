"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Truck, MapPin, ShieldCheck, ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { getAccessToken, getRole } from "@/lib/api";
import "swiper/css";
import "swiper/css/pagination";

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const role  = getRole();
    if (token && role) {
      if (role === "AGENCY") router.replace("/dashboard/agency");
      else if (role === "ADMIN") router.replace("/dashboard/admin");
      else router.replace("/trips");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-white text-slate-900">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-lg">L</div>
            <span className="font-bold tracking-tight text-lg">Luggo</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Connexion
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
              S'inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative">
        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          loop
          pagination={{ clickable: true }}
          className="w-full"
        >
          {["/images/hero/slide-1.jpg", "/images/hero/slide-2.jpg", "/images/hero/slide-3.jpg"].map((src, idx) => (
            <SwiperSlide key={idx}>
              <div className="relative h-[80vh] min-h-[540px] w-full overflow-hidden">
                <Image src={src} alt="Luggo transport" fill priority={idx === 0} className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/10" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Contenu hero par-dessus le slider */}
        <div className="absolute inset-0 z-10 flex items-center pointer-events-none">
          <div className="mx-auto max-w-5xl px-4 w-full">
            <div className="max-w-xl pointer-events-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-5">
                <ShieldCheck className="h-3.5 w-3.5" /> Agences vérifiées · Suivi en temps réel
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-slate-900">
                Envoyez vos colis<br />
                <span className="text-blue-600">Europe ↔ Maroc</span>
              </h1>

              <p className="mt-4 text-base md:text-lg text-slate-600 leading-relaxed">
                Connectez-vous à des agences vérifiées. Réservez, déposez, suivez chaque étape en temps réel.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/trips"
                  className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-md shadow-blue-100 flex items-center justify-center gap-2"
                >
                  Voir les trajets <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-3.5 rounded-2xl border border-slate-200 bg-white/90 hover:bg-white text-slate-800 font-semibold text-base text-center"
                >
                  Créer un compte gratuit
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-500">
                {["France · Belgique · Espagne · Italie", "Suivi à chaque étape", "Livraison à domicile"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase text-center mb-3">Comment ça marche</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-12">3 étapes pour envoyer votre colis</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <MapPin className="h-6 w-6 text-blue-600" />,
                step: "01",
                title: "Trouvez un trajet",
                desc: "Parcourez les trajets publiés par des agences vérifiées. Filtrez par ville, date et prix.",
              },
              {
                icon: <Package className="h-6 w-6 text-blue-600" />,
                step: "02",
                title: "Réservez en ligne",
                desc: "Indiquez le poids, le contenu et le mode de réception. L'agence confirme votre demande.",
              },
              {
                icon: <Truck className="h-6 w-6 text-blue-600" />,
                step: "03",
                title: "Suivez votre colis",
                desc: "Déposez au bureau de départ. Recevez une notification à chaque étape jusqu'à la livraison.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-11 w-11 rounded-2xl bg-blue-50 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-3xl font-extrabold text-slate-100">{item.step}</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENCY SECTION ── */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="rounded-3xl bg-slate-900 text-white p-8 md:p-12 flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-blue-600 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-blue-400">Espace agence</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Vous êtes une agence de transport ?</h2>
            <p className="text-slate-300 text-base leading-relaxed max-w-lg">
              Publiez vos trajets, fixez votre tarif au kilo, gérez vos demandes et suivez votre capacité en temps réel.
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-slate-300">
              {[
                "Dashboard dédié avec gestion des colis",
                "Notifications client automatiques à chaque étape",
                "Carte interactive pour votre visibilité",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="shrink-0">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base"
            >
              Inscrire mon agence <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-slate-50 border-t border-slate-100 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10">Questions fréquentes</h2>
          <div className="grid gap-3">
            {[
              {
                q: "C'est quoi Luggo ?",
                a: "Luggo est une plateforme qui met en relation des agences de transport et des particuliers souhaitant envoyer des colis entre l'Europe et le Maroc.",
              },
              {
                q: "Comment sont calculés les prix ?",
                a: "Le prix dépend du tarif de l'agence (€/kg) multiplié par le poids de votre colis. La livraison à domicile est une option payante en supplément.",
              },
              {
                q: "Faut-il créer un compte ?",
                a: "Oui, un compte gratuit est nécessaire pour réserver un trajet. La vérification d'identité (KYC) est demandée avant votre première réservation.",
              },
              {
                q: "Comment suivre mon colis ?",
                a: "Depuis votre espace \"Mes colis\", vous suivez chaque étape : accepté, déposé, en transit, arrivé, livré. Un email est envoyé à chaque changement de statut.",
              },
            ].map((item, i) => (
              <details key={i} className="group rounded-2xl border border-slate-200 bg-white p-5 cursor-pointer">
                <summary className="list-none font-semibold text-slate-900 flex items-center justify-between">
                  <span>{item.q}</span>
                  <span className="text-blue-500 text-lg group-open:rotate-45 transition-transform inline-block">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-500 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Prêt à envoyer votre premier colis ?</h2>
        <p className="text-slate-500 mb-8">Inscription gratuite, trajets disponibles immédiatement.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/trips" className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base flex items-center justify-center gap-2">
            Voir les trajets <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/register" className="px-6 py-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold text-base">
            Créer un compte
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm">L</div>
            <span className="font-semibold text-slate-600">Luggo</span>
          </div>
          <div className="flex gap-6">
            <Link href="/trips" className="hover:text-slate-700">Trajets</Link>
            <Link href="/login" className="hover:text-slate-700">Connexion</Link>
            <a href="mailto:contact@luggo.ma" className="hover:text-slate-700">contact@luggo.ma</a>
          </div>
          <span>© {new Date().getFullYear()} Luggo.ma</span>
        </div>
      </footer>

    </main>
  );
}
