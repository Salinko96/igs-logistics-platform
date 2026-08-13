import { LegalNotice, LegalPage, LegalSection } from '@/components/legal/legal-page'
import { legalIdentity } from '@/lib/legal'

export const metadata = { title: 'Mentions légales | IGS Nexus' }

export default function LegalNoticePage() {
  return <LegalPage title="Mentions légales" description="Identification de l’éditeur, responsabilités et informations relatives à l’hébergement de la plateforme.">
    <LegalNotice>Les champs indiqués « Non renseigné » doivent être complétés avec les données officielles de l’éditeur avant toute commercialisation externe de la plateforme.</LegalNotice>
    <LegalSection title="Éditeur de la plateforme"><dl className="grid gap-2 sm:grid-cols-[180px_1fr]"><dt>Dénomination</dt><dd className="font-medium">{legalIdentity.publisherName}</dd><dt>Forme juridique</dt><dd>{legalIdentity.legalForm}</dd><dt>Capital social</dt><dd>{legalIdentity.capital}</dd><dt>RCCM</dt><dd>{legalIdentity.rccm}</dd><dt>NIF</dt><dd>{legalIdentity.taxId}</dd><dt>Siège</dt><dd>{legalIdentity.address}</dd><dt>Téléphone</dt><dd>{legalIdentity.phone}</dd><dt>Email</dt><dd>{legalIdentity.email.includes('@') ? <a href={`mailto:${legalIdentity.email}`} className="text-[#14554d] underline">{legalIdentity.email}</a> : legalIdentity.email}</dd></dl></LegalSection>
    <LegalSection title="Direction de la publication"><p>Directeur ou directrice de la publication : <strong>{legalIdentity.director}</strong>.</p></LegalSection>
    <LegalSection title="Hébergement"><p>L’application est hébergée par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Les données applicatives et fichiers sont traités au moyen de services cloud configurés par l’éditeur, notamment Supabase.</p></LegalSection>
    <LegalSection title="Propriété intellectuelle"><p>La structure, les logiciels, interfaces, textes, éléments graphiques, marques et bases de données de la plateforme sont protégés. Toute reproduction, adaptation ou exploitation non autorisée est interdite, sous réserve des droits appartenant aux clients sur leurs propres données et documents.</p></LegalSection>
    <LegalSection title="Responsabilité"><p>IGS Nexus est un outil d’assistance opérationnelle. Les utilisateurs restent responsables de l’exactitude des informations saisies, des déclarations douanières, des traitements fiscaux et de la validation des données provenant de services tiers. L’éditeur met en œuvre des mesures raisonnables de disponibilité et de sécurité sans garantir une absence absolue d’interruption.</p></LegalSection>
    <LegalSection title="Droit applicable"><p>Les présentes mentions sont soumises au droit de la République de Guinée. Les parties recherchent d’abord une solution amiable avant de saisir les juridictions compétentes de Conakry, sous réserve des règles impératives applicables.</p></LegalSection>
  </LegalPage>
}
