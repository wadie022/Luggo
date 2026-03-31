"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { motion } from "framer-motion";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

import {
  User,
  Building2,
  Search,
  MapPin,
  Package,
  Truck,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Timer,
  Scale,
  PlusCircle,
  CreditCard,
  ShieldCheck,
  Home,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const slides = useMemo(
    () => [
      {
        title: "Expédiez vos bagages Europe ↔ Maroc",
        subtitle:
          "Trouvez un trajet, réservez, déposez. Une plateforme simple pour connecter agences de transport et clients.",
        cta1: { label: "Voir les trajets", href: "/trips" },
        cta2: { label: "Se connecter", href: "/login" },
        image: "/images/hero/slide-1.jpg",
      },
      {
        title: "Des agences vérifiées, des trajets en temps réel",
        subtitle:
          "Les agences publient leurs trajets et capacités. Les clients réservent en quelques clics.",
        cta1: { label: "Créer un compte", href: "/register" },
        cta2: { label: "Découvrir", href: "#how" },
        image: "/images/hero/slide-2.jpg",
      },
      {
        title: "Tarifs transparents",
        subtitle:
          "Le prix vient de l’agence (€/kg) + frais de service Luggo + livraison en option.",
        cta1: { label: "Voir les tarifs", href: "#pricing" },
        cta2: { label: "FAQ", href: "#faq" },
        image: "/images/hero/slide-3.jpg",
      },
    ],
    []
  );

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoL />
            <span className="font-bold tracking-tight text-lg text-white">Luggo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-200">
            <a className="hover:text-white" href="#how">
              Fonctionnement
              </a>
            <a className="hover:text-slate-900" href="#pricing">
              Tarifs
            </a>
            <a className="hover:text-slate-900" href="#faq">
              FAQ
            </a>
            <a className="hover:text-slate-900" href="#contact">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              Connexion
            </Link>

            <Link
              href="/register"
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              Inscription
            </Link>
          </div>
        </div>
      </header>

      {/* HERO / SLIDER */}
      <section className="relative">
        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          loop
          pagination={{ clickable: true }}
          className="w-full"
        >
          {slides.map((s, idx) => (
            <SwiperSlide key={idx}>
              <div className="relative h-[78vh] min-h-[520px] w-full overflow-hidden">
                <Image
                  src={s.image}
                  alt="Luggo transport"
                  fill
                  priority={idx === 0}
                  className="object-cover"
                />

                {/* overlay = pour contraste */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/75 to-white/10" />

                <div className="relative z-10 mx-auto max-w-6xl px-4 h-full flex items-center">
                  <div className="max-w-2xl">
                    <motion.h1
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                      className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight"
                    >
                      {s.title}
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.05 }}
                      className="mt-4 text-base md:text-lg text-slate-700 leading-relaxed"
                    >
                      {s.subtitle}
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.1 }}
                      className="mt-7 flex flex-col sm:flex-row gap-3"
                    >
                      <Link
                        href={s.cta1.href}
                        className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm text-center"
                      >
                        {s.cta1.label}
                      </Link>
                      <Link
                        href={s.cta2.href}
                        className="px-5 py-3 rounded-2xl bg-white/90 border border-slate-200 text-slate-900 font-semibold hover:bg-white shadow-sm text-center"
                      >
                        {s.cta2.label}
                      </Link>
                    </motion.div>

                    <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <MiniStat label="Pays" value="FR · BE · ES · CH · IT · MA" />
                      <MiniStat label="Trajets" value="publiés par agences" />
                      <MiniStat label="Tarifs" value="agence + service" />
                      <MiniStat label="Livraison" value="option en plus" />
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* TRUST STRIP (couleurs) */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-10 grid md:grid-cols-3 gap-4">
          <FeatureCard
            tone="blue"
            title="Agences & clients"
            desc="Luggo connecte les agences de transport et les clients sur une seule plateforme."
          />
          <FeatureCard
            tone="emerald"
            title="Simple & rapide"
            desc="Trouvez un trajet, envoyez la demande, l’agence valide. (MVP : dépôt en agence)"
          />
          <FeatureCard
            tone="slate"
            title="Transparence"
            desc="Prix = tarif agence (€/kg) + frais de service Luggo + livraison (si option)."
          />
        </div>
      </section>

      {/* HOW IT WORKS (bien coloré) */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <SectionTitle
          eyebrow="Fonctionnement"
          title="Client & Agence : deux parcours clairs"
          desc="Tout le monde se connecte. Ensuite, chacun arrive dans son espace (Client ou Agence)."
        />

        <div className="mt-10 grid lg:grid-cols-2 gap-6">
          {/* CLIENT */}
          <div className="rounded-3xl border border-blue-200 bg-gradient-to-b from-blue-50/80 to-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-600">Espace</div>
                  <h3 className="text-xl font-extrabold">Client</h3>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Connexion requise
              </span>
            </div>

            <div className="mt-6 grid gap-3">
              <FlowItem
                tone="blue"
                icon={<ShieldCheck className="h-5 w-5" />}
                title="1) Inscription / Connexion"
                text="Tu te connectes pour accéder aux trajets et suivre tes demandes."
              />
              <FlowItem
                tone="blue"
                icon={<Search className="h-5 w-5" />}
                title="2) Accès aux trajets & agences proches"
                text="Tu recherches un trajet (départ/destination). Tu vois les agences et leurs prix."
              />
              <FlowItem
                tone="blue"
                icon={<MapPin className="h-5 w-5" />}
                title="3) Sélection"
                text="Tu choisis une agence/traject selon la date, capacité restante et €/kg."
              />
              <FlowItem
                tone="blue"
                icon={<Package className="h-5 w-5" />}
                title="4) Demande d’envoi"
                text="Tu remplis poids, contact, description… puis tu envoies la demande."
              />

              <div className="mt-2 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  <Home className="h-5 w-5 text-blue-700" />
                  Option Livraison (en plus)
                </div>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Tu choisis :
                </p>
                <ul className="mt-2 text-sm text-slate-700 grid gap-2">
                  <li className="flex gap-2">
                    <span className="mt-[7px] h-2 w-2 rounded-full bg-blue-600" />
                    <span>
                      <b>Dépôt par toi-même</b> (tu gères dépôt / récupération)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-[7px] h-2 w-2 rounded-full bg-blue-600" />
                    <span>
                      <b>Livraison à domicile</b> : récupération chez toi + livraison finale (frais en plus)
                    </span>
                  </li>
                </ul>
              </div>

              <FlowItem
                tone="blue"
                icon={<CreditCard className="h-5 w-5" />}
                title="5) Tarifs & confirmation"
                text="Total = (prix agence €/kg × poids) + frais Luggo + livraison (si option)."
              />
            </div>
          </div>

          {/* AGENCE */}
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-600">Espace</div>
                  <h3 className="text-xl font-extrabold">Agence</h3>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Connexion requise
              </span>
            </div>

            <div className="mt-6 grid gap-3">
              <FlowItem
                tone="emerald"
                icon={<ShieldCheck className="h-5 w-5" />}
                title="1) Connexion agence"
                text="Accès au dashboard : trajets, demandes, capacité, statut."
              />
              <FlowItem
                tone="emerald"
                icon={<PlusCircle className="h-5 w-5" />}
                title="2) Publier un trajet"
                text="Départ, destination, dates, capacité, prix au kg, statut."
              />
              <FlowItem
                tone="emerald"
                icon={<ClipboardList className="h-5 w-5" />}
                title="3) Gérer les demandes"
                text="En attente → accepter/refuser selon capacité disponible."
              />

              <div className="grid md:grid-cols-3 gap-3">
                <MiniKpi
                  tone="slate"
                  icon={<Timer className="h-4 w-4" />}
                  label="En attente"
                  value="à valider"
                />
                <MiniKpi
                  tone="emerald"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Acceptées"
                  value="confirmées"
                />
                <MiniKpi
                  tone="rose"
                  icon={<XCircle className="h-4 w-4" />}
                  label="Refusées"
                  value="fermées"
                />
              </div>

              <FlowItem
                tone="emerald"
                icon={<Scale className="h-5 w-5" />}
                title="4) Capacité en temps réel"
                text="Suivi kg demandés/acceptés et capacité restante par trajet."
              />
              <FlowItem
                tone="emerald"
                icon={<Truck className="h-5 w-5" />}
                title="5) Transport & livraison"
                text="Dépôt en agence ou livraison (si l’option est choisie par le client)."
              />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900 text-lg">
                Très simple : Client → Agence → Transport
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Le client envoie une demande, l’agence valide, et la capacité (kg) se met à jour.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              Client <ArrowRight className="h-4 w-4" /> Agence <ArrowRight className="h-4 w-4" /> Transport
            </div>
          </div>
        </div>
      </section>

      {/* PRICING (coloré) */}
      <section id="pricing" className="bg-gradient-to-b from-blue-50/40 to-white border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <SectionTitle
            eyebrow="Tarifs"
            title="Comment sont calculés les prix ?"
            desc="Le prix affiché vient de l’agence (€/kg) + frais de service Luggo + livraison (option)."
          />

          <div className="mt-10 grid md:grid-cols-3 gap-4">
            <FeatureCard
              tone="blue"
              title="1) Tarif agence"
              desc="Chaque agence définit son prix par kg (ex: 5€/kg). C’est la base."
            />
            <FeatureCard
              tone="slate"
              title="2) Frais de service Luggo"
              desc="Support, gestion, suivi, amélioration produit."
            />
            <FeatureCard
              tone="emerald"
              title="3) Livraison (option)"
              desc="Pickup + drop-off à domicile → frais supplémentaires."
            />
          </div>

          <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm text-sm text-slate-700">
            <div className="font-semibold text-slate-900">Exemple :</div>
            <div className="mt-2">
              Agence : 5€/kg • Poids : 10kg → 50€ <br />
              Frais Luggo : 3€ → Total = 53€ <br />
              Livraison (option) : +8€ → <span className="font-semibold">Total = 61€</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ (gris) */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-16">
        <SectionTitle
          eyebrow="FAQ"
          title="Questions fréquentes"
          desc="Tout ce que tes utilisateurs vont te demander."
        />

        <div className="mt-8 grid gap-3">
          {[
            {
              q: "Est-ce que je dois me connecter ?",
              a: "Oui. Client ou agence : tout le monde se connecte. Ensuite tu es redirigé vers ton espace.",
            },
            {
              q: "Client : comment envoyer un colis ?",
              a: "Tu choisis un trajet, tu remplis le formulaire, puis tu envoies la demande. L’agence accepte/refuse.",
            },
            {
              q: "Client : c’est quoi l’option livraison ?",
              a: "En option : on récupère chez toi et on livre à l’adresse finale. Sinon tu gères dépôt/récupération toi-même.",
            },
            {
              q: "Agence : qu’est-ce que je vois ?",
              a: "Demandes en attente/acceptées/refusées + capacité (kg) utilisée/restante par trajet.",
            },
            {
              q: "Tarifs : comment ça marche ?",
              a: "Total = (€/kg agence × poids) + frais Luggo + livraison (si option).",
            },
          ].map((item, idx) => (
            <details
              key={idx}
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm hover:bg-slate-100 transition"
            >
              <summary className="cursor-pointer list-none font-semibold text-slate-900 flex items-center justify-between">
                <span>{item.q}</span>
                <span className="text-slate-400 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-16 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl font-bold">Contact</h3>
            <p className="mt-2 text-slate-600">
              Tu veux inscrire une agence ? Demander une démo ? Écris-nous.
            </p>

            <div className="mt-6 grid gap-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                Email : <span className="font-semibold">contact@luggo.ma</span>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                Zone : France, Belgique, Espagne, Suisse, Italie ↔ Maroc
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="font-semibold">Recevoir des news</div>
            <p className="text-sm text-slate-600 mt-1">
              On te notifie dès qu’on ouvre l’accès aux premières agences.
            </p>
            <form className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                className="flex-1 px-3 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ton email"
                type="email"
              />
              <button
                type="button"
                className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                S’inscrire
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoL small />
            <span className="font-semibold">Luggo</span>
          </div>
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()} Luggo.ma — Tous droits réservés.
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ---------- Components ---------- */

function LogoL({ small }: { small?: boolean }) {
  const size = small ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className={`${size} rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold shadow-sm`}>
      L
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight">
        {title}
      </h2>
      <p className="mt-3 text-slate-600 max-w-2xl">{desc}</p>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  tone = "slate",
}: {
  title: string;
  desc: string;
  tone?: "blue" | "emerald" | "slate";
}) {
  const cls =
    tone === "blue"
      ? "bg-blue-50/70 border-blue-200 hover:bg-blue-50"
      : tone === "emerald"
      ? "bg-emerald-50/70 border-emerald-200 hover:bg-emerald-50"
      : "bg-slate-50 border-slate-200 hover:bg-slate-100";

  return (
    <div className={`rounded-3xl border p-6 shadow-sm hover:shadow-md transition ${cls}`}>
      <div className="text-lg font-bold">{title}</div>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{desc}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
      <div className="text-[11px] uppercase text-slate-500 font-semibold">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function FlowItem({
  icon,
  title,
  text,
  tone = "slate",
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone?: "blue" | "emerald" | "slate";
}) {
  const iconBox =
    tone === "blue"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : tone === "emerald"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${iconBox}`}>
        {icon}
      </div>
      <div>
        <div className="font-semibold text-slate-900">{title}</div>
        <div className="text-sm text-slate-600 mt-1 leading-relaxed">{text}</div>
      </div>
    </div>
  );
}

function MiniKpi({
  icon,
  label,
  value,
  tone = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "rose";
}) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : tone === "rose"
      ? "bg-rose-50 border-rose-200 text-rose-800"
      : "bg-slate-50 border-slate-200 text-slate-700";

  return (
    <div className={`rounded-2xl border p-3 ${cls}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}
