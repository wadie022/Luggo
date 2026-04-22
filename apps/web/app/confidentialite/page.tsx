import Link from "next/link";

export const metadata = { title: "Politique de confidentialité — Luggo" };

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base">L</div>
            <span className="font-black text-lg text-slate-900">Luggo</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-500 font-medium">Politique de confidentialité</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-black text-slate-900 mb-2">Politique de confidentialité</h1>
          <p className="text-sm text-slate-400 mb-10">Dernière mise à jour : avril 2026</p>

          <Section title="1. Responsable du traitement">
            <p>
              Luggo SAS est responsable du traitement de vos données personnelles collectées via la
              plateforme luggo.ma et l'application Luggo, conformément au Règlement Général sur la
              Protection des Données (RGPD).
            </p>
          </Section>

          <Section title="2. Données collectées">
            <p>Nous collectons les données suivantes :</p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside text-slate-600">
              <li><strong>Données d'identification :</strong> nom d'utilisateur, adresse email, mot de passe chiffré</li>
              <li><strong>Données KYC :</strong> document d'identité (carte nationale, passeport) — clients uniquement</li>
              <li><strong>Données KYB :</strong> documents d'entreprise (Kbis, RC) — agences uniquement</li>
              <li><strong>Données de colis :</strong> poids, description, adresse de livraison</li>
              <li><strong>Données de paiement :</strong> traitées par Stripe, non stockées par Luggo</li>
              <li><strong>Données de connexion :</strong> adresse IP, navigateur, date/heure de connexion</li>
            </ul>
          </Section>

          <Section title="3. Finalités du traitement">
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Création et gestion de votre compte</li>
              <li>Vérification d'identité (KYC/KYB)</li>
              <li>Traitement et suivi de vos expéditions</li>
              <li>Communication avec vous (emails transactionnels, notifications)</li>
              <li>Amélioration de nos services et sécurité de la plateforme</li>
              <li>Respect de nos obligations légales</li>
            </ul>
          </Section>

          <Section title="4. Base légale">
            <p>Le traitement de vos données repose sur :</p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside">
              <li><strong>L'exécution du contrat</strong> : gestion de votre compte et de vos colis</li>
              <li><strong>L'obligation légale</strong> : vérification d'identité (KYC/KYB)</li>
              <li><strong>L'intérêt légitime</strong> : sécurité, lutte contre la fraude</li>
              <li><strong>Votre consentement</strong> : communications marketing</li>
            </ul>
          </Section>

          <Section title="5. Conservation des données">
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Données de compte : pendant la durée de votre inscription + 3 ans après suppression</li>
              <li>Documents KYC/KYB : 5 ans à compter de la vérification</li>
              <li>Données de transactions : 10 ans (obligation comptable)</li>
              <li>Logs de connexion : 12 mois</li>
            </ul>
          </Section>

          <Section title="6. Partage des données">
            <p>Vos données ne sont jamais vendues. Elles peuvent être partagées avec :</p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside">
              <li><strong>Les agences de transport</strong> : uniquement les données nécessaires à l'expédition</li>
              <li><strong>Stripe</strong> : traitement sécurisé des paiements</li>
              <li><strong>Resend</strong> : envoi d'emails transactionnels</li>
              <li><strong>Railway / Cloudflare</strong> : hébergement et stockage</li>
              <li><strong>Autorités compétentes</strong> : sur demande légale uniquement</li>
            </ul>
          </Section>

          <Section title="7. Vos droits">
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside">
              <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
              <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements</li>
              <li><strong>Droit à la limitation</strong> : limiter le traitement de vos données</li>
            </ul>
            <p className="mt-3">
              Pour exercer vos droits, contactez-nous à :
              <a href="mailto:privacy@luggo.ma" className="text-blue-600 hover:underline ml-1">privacy@luggo.ma</a>
            </p>
          </Section>

          <Section title="8. Cookies">
            <p>
              La plateforme utilise uniquement des cookies techniques indispensables au fonctionnement
              (authentification, préférences de session). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
            </p>
          </Section>

          <Section title="9. Sécurité">
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger
              vos données : chiffrement HTTPS, tokens JWT, stockage sécurisé des documents, accès restreints.
            </p>
          </Section>

          <Section title="10. Contact DPO">
            <p>
              Pour toute question relative à la protection de vos données personnelles :
              <a href="mailto:privacy@luggo.ma" className="text-blue-600 hover:underline ml-1">privacy@luggo.ma</a>
            </p>
            <p className="mt-2">
              Vous pouvez également introduire une réclamation auprès de la CNIL (Commission Nationale de
              l'Informatique et des Libertés) : <a href="https://www.cnil.fr" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
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
