"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package, Truck, MapPin, ShieldCheck, ArrowRight,
  Building2, CheckCircle2, Star, Globe, ChevronDown,
} from "lucide-react";
import { getAccessToken, getRole } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const role = getRole();
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
    <main className="min-h-screen bg-[#080808] text-white overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-[#080808]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg leading-none">L</div>
            <span className="font-black text-xl tracking-tight">Luggo</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/trips" className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition">Trajets</Link>
            <Link href="/map" className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition">Agences</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition">
              Connexion
            </Link>
            <Link href="/register" className="px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition">
              S'inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden px-5 text-center">
        {/* Glow blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-600/[0.07] blur-[160px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/10 via-transparent to-[#080808]" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8">
            <ShieldCheck className="h-3.5 w-3.5" />
            Agences vérifiées · Suivi en temps réel
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-[88px] font-black tracking-[-0.03em] leading-none mb-6">
            Envoyez vos colis<br />
            <span className="text-blue-500">Europe ↔ Maroc</span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            Connectez-vous à des agences vérifiées. Réservez, déposez, suivez chaque étape en temps réel.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/trips"
              className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base flex items-center justify-center gap-2 transition shadow-2xl shadow-blue-900/50"
            >
              Voir les trajets <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="px-8 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white font-semibold text-base transition"
            >
              Créer un compte gratuit
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-white/35">
            {["France · Belgique · Espagne · Italie", "Suivi à chaque étape", "Livraison à domicile"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/20">
          <ChevronDown className="h-6 w-6" />
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-5xl px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "200+", label: "Agences partenaires" },
            { value: "15K+", label: "Colis livrés" },
            { value: "8", label: "Pays couverts" },
            { value: "4.8★", label: "Note moyenne" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-black text-white mb-1">{s.value}</div>
              <div className="text-sm text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-28 px-5">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-3">Comment ça marche</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-[-0.02em]">
              3 étapes pour envoyer<br className="hidden md:block" /> votre colis
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: <MapPin className="h-6 w-6" />, step: "01", title: "Trouvez un trajet", desc: "Parcourez les trajets publiés par des agences vérifiées. Filtrez par ville, date et prix." },
              { icon: <Package className="h-6 w-6" />, step: "02", title: "Réservez en ligne", desc: "Indiquez le poids, le contenu et le mode de réception. L'agence confirme votre demande." },
              { icon: <Truck className="h-6 w-6" />, step: "03", title: "Suivez votre colis", desc: "Déposez au bureau de départ. Recevez une notification à chaque étape jusqu'à la livraison." },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl bg-[#111111] border border-white/[0.06] p-6 hover:border-blue-500/25 transition-all group cursor-default">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                    {item.icon}
                  </div>
                  <span className="text-5xl font-black text-white/[0.04] select-none">{item.step}</span>
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY LUGGO ── */}
      <section className="py-24 px-5 bg-white/[0.015] border-y border-white/[0.06]">
        <div className="mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-3">Pourquoi Luggo</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-[-0.02em] mb-8">
                La plateforme de confiance<br />pour vos envois
              </h2>
              <div className="space-y-5">
                {[
                  { icon: <ShieldCheck className="h-5 w-5 text-blue-500" />, title: "Agences 100% vérifiées", desc: "Chaque agence passe par une vérification KYB avant d'être listée." },
                  { icon: <Globe className="h-5 w-5 text-blue-500" />, title: "Réseau international", desc: "France, Belgique, Espagne, Italie, Maroc — et bien plus encore." },
                  { icon: <Star className="h-5 w-5 text-blue-500" />, title: "Avis clients vérifiés", desc: "Choisissez votre agence en toute confiance grâce aux notes." },
                ].map((f) => (
                  <div key={f.title} className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0 mt-0.5">
                      {f.icon}
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1">{f.title}</div>
                      <div className="text-sm text-white/45">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Livraison domicile", icon: <Truck className="h-6 w-6" /> },
                { label: "Suivi en temps réel", icon: <MapPin className="h-6 w-6" /> },
                { label: "Agences vérifiées", icon: <ShieldCheck className="h-6 w-6" /> },
                { label: "Messagerie intégrée", icon: <Package className="h-6 w-6" /> },
              ].map((f) => (
                <div key={f.label} className="rounded-2xl bg-[#111111] border border-white/[0.06] p-5 flex flex-col gap-3 hover:border-blue-500/20 transition-all">
                  <div className="text-blue-500">{f.icon}</div>
                  <div className="font-semibold text-sm text-white leading-snug">{f.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AGENCY CTA ── */}
      <section className="py-28 px-5">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700" />
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/[0.06] blur-3xl" />
            <div className="absolute -bottom-16 left-1/3 w-56 h-56 rounded-full bg-blue-900/40 blur-2xl" />
            <div className="relative p-8 md:p-12 flex flex-col md:flex-row md:items-center gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold mb-5">
                  <Building2 className="h-3.5 w-3.5" /> Espace agence
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-white mb-3 tracking-[-0.02em]">
                  Vous êtes une agence<br />de transport ?
                </h2>
                <p className="text-white/70 text-base leading-relaxed max-w-lg mb-5">
                  Publiez vos trajets, fixez votre tarif au kilo, gérez vos demandes et suivez votre capacité en temps réel.
                </p>
                <ul className="space-y-2 text-sm text-white/75">
                  {["Dashboard dédié avec gestion des colis", "Notifications client automatiques", "Carte interactive pour votre visibilité"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-white shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white text-blue-600 font-black text-base hover:bg-blue-50 transition shadow-2xl"
                >
                  Inscrire mon agence <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-5 bg-white/[0.015] border-t border-white/[0.06]">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12 tracking-[-0.02em]">Questions fréquentes</h2>
          <div className="space-y-2">
            {[
              { q: "C'est quoi Luggo ?", a: "Luggo est une plateforme qui met en relation des agences de transport et des particuliers souhaitant envoyer des colis entre l'Europe et le Maroc." },
              { q: "Comment sont calculés les prix ?", a: "Le prix dépend du tarif de l'agence (€/kg) multiplié par le poids de votre colis. La livraison à domicile est une option payante en supplément." },
              { q: "Faut-il créer un compte ?", a: "Oui, un compte gratuit est nécessaire pour réserver un trajet. La vérification d'identité (KYC) est demandée avant votre première réservation." },
              { q: "Comment suivre mon colis ?", a: "Depuis votre espace \"Mes colis\", vous suivez chaque étape : accepté, déposé, en transit, arrivé, livré. Un email est envoyé à chaque changement de statut." },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left rounded-2xl bg-[#111111] border border-white/[0.06] p-5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-white">{item.q}</span>
                  <ChevronDown className={`h-5 w-5 text-white/30 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
                </div>
                {openFaq === i && (
                  <p className="mt-3 text-sm text-white/50 leading-relaxed">{item.a}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-28 px-5 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-black tracking-[-0.02em] mb-4">
            Prêt à envoyer<br />votre premier colis ?
          </h2>
          <p className="text-white/40 mb-10 text-lg">Inscription gratuite, trajets disponibles immédiatement.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/trips"
              className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base flex items-center justify-center gap-2 transition shadow-2xl shadow-blue-900/50"
            >
              Voir les trajets <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="px-8 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white font-semibold text-base transition"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto max-w-6xl px-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">L</div>
            <span className="font-bold text-white">Luggo</span>
          </div>
          <div className="flex gap-6 text-sm text-white/40">
            <Link href="/trips" className="hover:text-white transition">Trajets</Link>
            <Link href="/map" className="hover:text-white transition">Agences</Link>
            <Link href="/login" className="hover:text-white transition">Connexion</Link>
            <a href="mailto:contact@luggo.ma" className="hover:text-white transition">contact@luggo.ma</a>
          </div>
          <span className="text-sm text-white/25">© {new Date().getFullYear()} Luggo.ma</span>
        </div>
      </footer>

    </main>
  );
}
