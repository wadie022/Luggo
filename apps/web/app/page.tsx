"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, ArrowRight, Building2, CheckCircle2,
  MapPin, Package, Truck, Users, Star, Globe, CreditCard,
} from "lucide-react";
import { getAccessToken, getRole } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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
    <main className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-black text-lg leading-none">L</div>
            <span className="font-black text-xl tracking-tight text-[#0a0a0a]">Luggo</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/trips" className="hover:text-[#2563eb] transition">Trajets</Link>
            <Link href="/map" className="hover:text-[#2563eb] transition">Agences</Link>
            <Link href="/register?role=AGENCY" className="hover:text-[#2563eb] transition">Devenir agence</Link>
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="px-4 py-2 text-sm font-semibold text-[#2563eb] hover:bg-blue-50 rounded-full transition">
              Connexion
            </Link>
            <Link href="/register"
              className="px-5 py-2.5 text-sm font-bold text-white rounded-full transition shadow-md shadow-blue-200 hover:bg-blue-700"
              style={{ backgroundColor: "#2563eb" }}>
              S'inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero/slide-1.jpg"
            alt="Luggo transport"
            fill
            priority
            className="object-cover object-center"
          />
          {/* Dark gradient overlay — stronger on left */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-6xl px-5 w-full py-32">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold mb-6">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              Agences vérifiées · Suivi en temps réel
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] text-white mb-6">
              Des{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[#2563eb]">prix justes</span>
                <span className="absolute inset-x-0 bottom-1 h-3 bg-blue-500/20 rounded" />
              </span>
              {" "}pour vos envois<br />
              <span className="text-white/90">Europe ↔ Maroc</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-lg">
              Connectez-vous à des agences de transport certifiées. Réservez en ligne, déposez votre colis et suivez chaque étape en temps réel.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Link href="/trips"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-base text-white shadow-xl shadow-blue-900/30 hover:bg-blue-700 transition"
                style={{ backgroundColor: "#2563eb" }}>
                Voir les trajets <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-base bg-white text-[#0a0a0a] hover:bg-gray-100 transition shadow-lg">
                Devenir agence
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-5 text-sm text-white/60">
              {["France · Belgique · Espagne · Italie", "Suivi à chaque étape", "Livraison à domicile"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ backgroundColor: "#f0f4ff" }} className="py-24 px-5">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-xs font-bold tracking-widest text-[#2563eb] uppercase mb-3">Comment ça marche</p>
            <h2 className="text-3xl md:text-5xl font-black text-[#0a0a0a] tracking-tight">
              Simple, rapide, transparent
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-10">

            {/* Pour les clients */}
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100 transition hover:border-[#2563eb]/30 hover:shadow-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-[#2563eb] flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-black text-[#0a0a0a]">Pour les clients</h3>
              </div>
              <div className="space-y-5">
                {[
                  { n: "01", title: "Trouvez un trajet", desc: "Parcourez les trajets publiés par des agences vérifiées. Filtrez par ville, date et prix." },
                  { n: "02", title: "Réservez en ligne", desc: "Indiquez le poids et le contenu. L'agence confirme votre demande sous 24h." },
                  { n: "03", title: "Suivez votre colis", desc: "Déposez au bureau de départ. Notification à chaque étape jusqu'à la livraison." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 font-black text-sm text-white" style={{ backgroundColor: "#2563eb" }}>
                      {s.n}
                    </div>
                    <div>
                      <div className="font-bold text-[#0a0a0a] mb-0.5">{s.title}</div>
                      <div className="text-sm text-gray-500 leading-relaxed">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/register" className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white hover:bg-blue-700 transition"
                style={{ backgroundColor: "#2563eb" }}>
                Créer mon compte <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Pour les agences */}
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100 transition hover:border-[#2563eb]/30 hover:shadow-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-[#2563eb] flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-black text-[#0a0a0a]">Pour les agences</h3>
              </div>
              <div className="space-y-5">
                {[
                  { n: "01", title: "Créez votre profil", desc: "Inscrivez votre agence et complétez la vérification KYB. Processus simple et rapide." },
                  { n: "02", title: "Publiez vos trajets", desc: "Ajoutez vos trajets, fixez votre tarif au kilo et votre capacité disponible." },
                  { n: "03", title: "Gérez vos demandes", desc: "Acceptez les réservations, mettez à jour le statut et communiquez avec vos clients." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 font-black text-sm text-white" style={{ backgroundColor: "#2563eb" }}>
                      {s.n}
                    </div>
                    <div>
                      <div className="font-bold text-[#0a0a0a] mb-0.5">{s.title}</div>
                      <div className="text-sm text-gray-500 leading-relaxed">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/register" className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white hover:bg-blue-700 transition"
                style={{ backgroundColor: "#2563eb" }}>
                Inscrire mon agence <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-20 px-5 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { value: "6", label: "pays", desc: "France, Belgique, Espagne, Italie, Pays-Bas, Maroc", icon: <Globe className="h-7 w-7 text-[#2563eb]" /> },
              { value: "100%", label: "vérifiées", desc: "Chaque agence passe par une vérification complète", icon: <ShieldCheck className="h-7 w-7 text-[#2563eb]" /> },
              { value: "Prix", label: "transparent", desc: "Tarif affiché au kilo, aucune surprise à la livraison", icon: <CreditCard className="h-7 w-7 text-[#2563eb]" /> },
            ].map((s) => (
              <div key={s.label} className="text-center px-6 py-8 rounded-3xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition group">
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-[#2563eb] transition">
                    <span className="group-hover:text-white transition">{s.icon}</span>
                  </div>
                </div>
                <div className="text-5xl font-black text-[#2563eb] leading-none mb-1">
                  {s.value}
                </div>
                <div className="text-xl font-bold text-[#0a0a0a] mb-2">{s.label}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SÉCURITÉ ── */}
      <section style={{ backgroundColor: "#f0f4ff" }} className="py-24 px-5">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-xs font-bold tracking-widest text-[#2563eb] uppercase mb-3">Confiance & Sécurité</p>
            <h2 className="text-3xl md:text-5xl font-black text-[#0a0a0a] tracking-tight mb-4">
              Votre sécurité est<br />notre priorité
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Chaque acteur de la plateforme est vérifié. Vous envoyez en toute confiance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <ShieldCheck className="h-8 w-8 text-[#2563eb]" />,
                title: "KYC vérifié",
                desc: "Chaque client vérifie son identité avant sa première réservation. Vos colis sont entre de bonnes mains.",
                tag: "Identité vérifiée",
              },
              {
                icon: <Building2 className="h-8 w-8 text-[#2563eb]" />,
                title: "Agences certifiées",
                desc: "Toutes les agences passent par une vérification KYB complète avant d'être référencées sur Luggo.",
                tag: "Certification KYB",
              },
              {
                icon: <CreditCard className="h-8 w-8 text-[#2563eb]" />,
                title: "Prix transparent",
                desc: "Le tarif au kilo est affiché clairement. Aucune commission cachée, aucune surprise à la livraison.",
                tag: "Zéro frais caché",
              },
            ].map((card) => (
              <div key={card.title} className="rounded-3xl bg-white p-8 shadow-sm hover:shadow-md transition border border-white hover:border-blue-100 group">
                <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 group-hover:bg-[#2563eb] transition">
                  <span className="group-hover:[&_svg]:text-white transition">{card.icon}</span>
                </div>
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold text-[#2563eb] bg-blue-50 mb-3">
                  {card.tag}
                </div>
                <h3 className="text-xl font-black text-[#0a0a0a] mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENCY CTA ── */}
      <section className="py-24 px-5 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl overflow-hidden relative" style={{ backgroundColor: "#2563eb" }}>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 0%, transparent 60%)" }} />
            <div className="relative p-10 md:p-14 flex flex-col md:flex-row md:items-center gap-10">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-bold mb-5">
                  <Building2 className="h-3.5 w-3.5" /> Espace agence
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
                  Vous êtes une agence<br />de transport ?
                </h2>
                <p className="text-white/80 text-base leading-relaxed max-w-lg mb-6">
                  Publiez vos trajets, fixez votre tarif au kilo, gérez vos demandes et suivez votre capacité en temps réel.
                </p>
                <ul className="space-y-2.5 text-sm text-white/80">
                  {[
                    "Dashboard dédié avec gestion des colis",
                    "Notifications client automatiques à chaque étape",
                    "Carte interactive pour votre visibilité",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-white shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0">
                <Link href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white font-black text-base hover:bg-gray-50 transition shadow-xl"
                  style={{ color: "#2563eb" }}>
                  Inscrire mon agence <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ backgroundColor: "#f0f4ff" }} className="py-24 px-5">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-[#2563eb] uppercase mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#0a0a0a] tracking-tight">Questions fréquentes</h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "C'est quoi Luggo ?", a: "Luggo est une plateforme qui met en relation des agences de transport et des particuliers souhaitant envoyer des colis entre l'Europe et le Maroc." },
              { q: "Comment sont calculés les prix ?", a: "Le prix dépend du tarif de l'agence (€/kg) multiplié par le poids de votre colis. La livraison à domicile est une option payante en supplément." },
              { q: "Faut-il créer un compte ?", a: "Oui, un compte gratuit est nécessaire pour réserver un trajet. La vérification d'identité (KYC) est demandée avant votre première réservation." },
              { q: "Comment suivre mon colis ?", a: "Depuis votre espace \"Mes colis\", vous suivez chaque étape : accepté, déposé, en transit, arrivé, livré. Un email est envoyé à chaque changement de statut." },
            ].map((item, i) => (
              <details key={i} className="group rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none font-bold text-[#0a0a0a]">
                  <span>{item.q}</span>
                  <span className="text-[#2563eb] text-xl font-black group-open:rotate-45 transition-transform duration-200 inline-block shrink-0 ml-4">+</span>
                </summary>
                <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-50 pt-4">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-5 bg-white text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-black text-[#0a0a0a] tracking-tight mb-4">
            Prêt à envoyer<br />votre premier colis ?
          </h2>
          <p className="text-gray-500 mb-10 text-lg">Inscription gratuite, trajets disponibles immédiatement.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/trips"
              className="px-8 py-4 rounded-full font-bold text-base text-white hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              style={{ backgroundColor: "#2563eb" }}>
              Voir les trajets <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/register"
              className="px-8 py-4 rounded-full font-bold text-base border-2 border-[#2563eb] text-[#2563eb] hover:bg-blue-50 transition">
              Créer un compte gratuit
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ backgroundColor: "#1e3a5f" }} className="text-white">
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-8">

          {/* Top footer */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-9 w-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-black text-lg">L</div>
                <span className="font-black text-xl text-white">Luggo</span>
              </div>
              <p className="text-sm text-white/50 leading-relaxed max-w-[180px]">
                La plateforme de transport de colis Europe ↔ Maroc.
              </p>
            </div>

            {/* Clients */}
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-widest">Clients</h4>
              <ul className="space-y-2.5 text-sm text-white/50">
                <li><Link href="/trips" className="hover:text-white transition">Voir les trajets</Link></li>
                <li><Link href="/mes-colis" className="hover:text-white transition">Mes colis</Link></li>
                <li><Link href="/messages" className="hover:text-white transition">Messages</Link></li>
                <li><Link href="/reclamations" className="hover:text-white transition">Réclamations</Link></li>
              </ul>
            </div>

            {/* Agences */}
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-widest">Agences</h4>
              <ul className="space-y-2.5 text-sm text-white/50">
                <li><Link href="/register" className="hover:text-white transition">Rejoindre Luggo</Link></li>
                <li><Link href="/dashboard/agency" className="hover:text-white transition">Dashboard</Link></li>
                <li><Link href="/map" className="hover:text-white transition">Carte des agences</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-widest">Contact</h4>
              <ul className="space-y-2.5 text-sm text-white/50">
                <li><a href="mailto:contact@luggo.ma" className="hover:text-white transition">contact@luggo.ma</a></li>
                <li><Link href="/map" className="hover:text-white transition">Nos agences</Link></li>
              </ul>

              {/* Réseaux sociaux */}
              <div className="mt-6 flex gap-3">
                {[
                  { label: "Facebook", path: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" },
                  { label: "Instagram", path: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z" },
                ].map((social) => (
                  <button key={social.label}
                    aria-label={social.label}
                    className="h-9 w-9 rounded-xl bg-white/10 hover:bg-[#2563eb] flex items-center justify-center transition">
                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d={social.path} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-white/35">
            <span>© {new Date().getFullYear()} Luggo.ma — Tous droits réservés.</span>
            <div className="flex gap-5">
              <span className="hover:text-white/60 cursor-pointer transition">Mentions légales</span>
              <span className="hover:text-white/60 cursor-pointer transition">Politique de confidentialité</span>
              <span className="hover:text-white/60 cursor-pointer transition">CGU</span>
            </div>
          </div>
        </div>
      </footer>

    </main>
  );
}
