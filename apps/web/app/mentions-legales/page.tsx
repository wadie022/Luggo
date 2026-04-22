import Link from "next/link";

export const metadata = { title: "Mentions légales — Luggo" };

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base">L</div>
            <span className="font-black text-lg text-slate-900">Luggo</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-500 font-medium">Mentions légales</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-black text-slate-900 mb-2">Mentions légales</h1>
          <p className="text-sm text-slate-400 mb-10">Dernière mise à jour : avril 2026</p>

          <Section title="1. Éditeur du site">
            <p>Le site <strong>luggo.ma</strong> et l'application Luggo sont édités par :</p>
            <ul className="mt-3 space-y-1 text-slate-600">
              <li><strong>Dénomination :</strong> Luggo SAS</li>
              <li><strong>Forme juridique :</strong> Société par actions simplifiée</li>
              <li><strong>Siège social :</strong> France</li>
              <li><strong>Email :</strong> contact@luggo.ma</li>
            </ul>
          </Section>

          <Section title="2. Hébergement">
            <p>Le site est hébergé par :</p>
            <ul className="mt-3 space-y-1 text-slate-600">
              <li><strong>Frontend :</strong> Vercel Inc., 340 Pine Street, Suite 701, San Francisco, CA 94104, USA</li>
              <li><strong>Backend & Base de données :</strong> Railway Corp., San Francisco, CA, USA</li>
              <li><strong>Fichiers média :</strong> Cloudflare Inc. (R2 Storage)</li>
            </ul>
          </Section>

          <Section title="3. Directeur de la publication">
            <p>Le directeur de la publication est le représentant légal de Luggo SAS.</p>
          </Section>

          <Section title="4. Propriété intellectuelle">
            <p>
              L'ensemble des contenus présents sur la plateforme Luggo (textes, images, logos, interface,
              code source) est protégé par le droit de la propriété intellectuelle et reste la propriété
              exclusive de Luggo SAS. Toute reproduction ou représentation sans autorisation est interdite.
            </p>
          </Section>

          <Section title="5. Responsabilité">
            <p>
              Luggo s'efforce d'assurer l'exactitude et la mise à jour des informations publiées sur sa
              plateforme. Toutefois, Luggo ne peut garantir l'exactitude, la précision ou l'exhaustivité des
              informations mises à disposition. Luggo décline toute responsabilité pour les dommages résultant
              de l'utilisation de la plateforme.
            </p>
          </Section>

          <Section title="6. Contact">
            <p>
              Pour toute question relative aux mentions légales, vous pouvez nous contacter à l'adresse :
              <a href="mailto:contact@luggo.ma" className="text-blue-600 hover:underline ml-1">contact@luggo.ma</a>
            </p>
          </Section>
        </div>

        <Footer />
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">{title}</h2>
      <div className="text-slate-600 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function Footer() {
  return (
    <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-400 justify-center">
      <Link href="/mentions-legales" className="hover:text-blue-600 transition">Mentions légales</Link>
      <span>·</span>
      <Link href="/confidentialite" className="hover:text-blue-600 transition">Politique de confidentialité</Link>
      <span>·</span>
      <Link href="/cgu" className="hover:text-blue-600 transition">CGU</Link>
    </div>
  );
}
