import Link from "next/link";

export const metadata = { title: "Conditions Générales d'Utilisation — Luggo" };

export default function CguPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base">L</div>
            <span className="font-black text-lg text-slate-900">Luggo</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-500 font-medium">CGU</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-black text-slate-900 mb-2">Conditions Générales d'Utilisation</h1>
          <p className="text-sm text-slate-400 mb-10">Dernière mise à jour : avril 2026</p>

          <Section title="1. Objet">
            <p>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation
              de la plateforme Luggo (site web luggo.ma et application mobile), service de mise en relation
              entre des clients souhaitant envoyer des colis et des agences de transport spécialisées sur
              les trajets Europe ↔ Maroc.
            </p>
          </Section>

          <Section title="2. Acceptation des CGU">
            <p>
              L'utilisation de la plateforme Luggo implique l'acceptation pleine et entière des présentes
              CGU. Tout utilisateur qui ne souhaite pas accepter les CGU doit renoncer à l'utilisation
              de la plateforme.
            </p>
          </Section>

          <Section title="3. Inscription et compte utilisateur">
            <ul className="space-y-1.5 list-disc list-inside">
              <li>L'inscription est gratuite et ouverte à toute personne physique majeure.</li>
              <li>Chaque utilisateur ne peut créer qu'un seul compte. Les comptes multiples sont interdits.</li>
              <li>L'utilisateur s'engage à fournir des informations exactes et à les maintenir à jour.</li>
              <li>Les identifiants de connexion sont personnels et confidentiels. L'utilisateur est responsable de leur sécurité.</li>
              <li>Luggo se réserve le droit de suspendre ou supprimer tout compte en cas de violation des CGU.</li>
            </ul>
          </Section>

          <Section title="4. Vérification d'identité (KYC/KYB)">
            <p>
              Pour accéder à certaines fonctionnalités (réservation de colis, publication de trajets),
              une vérification d'identité est requise :
            </p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside">
              <li><strong>Clients (KYC) :</strong> fourniture d'un document d'identité officiel valide.</li>
              <li><strong>Agences (KYB) :</strong> fourniture d'un justificatif d'entreprise (Kbis, RC ou équivalent).</li>
            </ul>
            <p className="mt-2">
              Luggo se réserve le droit de refuser ou révoquer toute vérification en cas de document
              frauduleux ou incomplet.
            </p>
          </Section>

          <Section title="5. Obligations des clients">
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Ne soumettre que des colis dont le contenu est licite et conforme aux réglementations douanières.</li>
              <li>Déclarer avec exactitude le poids, la nature et la valeur des colis.</li>
              <li>Respecter les délais de dépôt convenus avec l'agence.</li>
              <li>Ne pas utiliser la plateforme pour expédier des objets dangereux, illicites ou soumis à des restrictions (drogues, armes, contrefaçons, etc.).</li>
            </ul>
          </Section>

          <Section title="6. Obligations des agences">
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Publier des trajets réels avec des informations exactes (dates, prix, capacité).</li>
              <li>Traiter les colis des clients avec soin et diligence.</li>
              <li>Respecter les délais de livraison annoncés.</li>
              <li>Répondre aux messages des clients dans un délai raisonnable.</li>
              <li>Assumer la responsabilité des colis confiés à partir de leur dépôt jusqu'à leur livraison.</li>
            </ul>
          </Section>

          <Section title="7. Tarification et paiement">
            <p>
              Les tarifs sont fixés par les agences (€/kg) et affichés clairement sur chaque trajet.
              Le paiement est sécurisé par Stripe. Luggo peut prélever une commission sur les transactions.
              Tout paiement effectué est définitif, sauf en cas de litige reconnu par Luggo.
            </p>
          </Section>

          <Section title="8. Annulation et remboursement">
            <p>
              En cas d'annulation d'un trajet par l'agence, le client sera remboursé intégralement.
              En cas d'annulation par le client après acceptation du colis par l'agence, aucun remboursement
              ne sera accordé sauf accord exprès de l'agence. Les litiges peuvent être soumis via la
              fonctionnalité de réclamation de la plateforme.
            </p>
          </Section>

          <Section title="9. Contenu interdit">
            <p>Il est strictement interdit d'utiliser la plateforme pour :</p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside">
              <li>Publier des informations fausses, trompeuses ou frauduleuses</li>
              <li>Harceler, menacer ou insulter d'autres utilisateurs</li>
              <li>Tenter d'accéder à des zones non autorisées de la plateforme</li>
              <li>Expédier des marchandises illicites ou contrefaites</li>
              <li>Usurper l'identité d'un autre utilisateur ou d'une agence</li>
            </ul>
          </Section>

          <Section title="10. Responsabilité de Luggo">
            <p>
              Luggo agit en tant qu'intermédiaire technique entre clients et agences. Luggo ne peut être
              tenu responsable des dommages, pertes ou retards survenus sur les colis une fois ceux-ci
              remis à l'agence. La responsabilité de Luggo est en tout état de cause limitée au montant
              des frais de service payés.
            </p>
          </Section>

          <Section title="11. Propriété intellectuelle">
            <p>
              La plateforme, son interface, son code source, ses logos et contenus sont la propriété
              exclusive de Luggo SAS. Toute reproduction est interdite sans autorisation préalable écrite.
            </p>
          </Section>

          <Section title="12. Modification des CGU">
            <p>
              Luggo se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs
              seront informés par email des modifications substantielles. La poursuite de l'utilisation
              de la plateforme après notification vaut acceptation des nouvelles CGU.
            </p>
          </Section>

          <Section title="13. Droit applicable et juridiction">
            <p>
              Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux
              français seront seuls compétents. Avant tout recours judiciaire, nous vous invitons
              à nous contacter à <a href="mailto:contact@luggo.ma" className="text-blue-600 hover:underline">contact@luggo.ma</a> pour
              une résolution amiable.
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
