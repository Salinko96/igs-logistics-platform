import { LegalPage, LegalSection } from '@/components/legal/legal-page'

export const metadata = { title: 'Politique cookies | IGS Nexus' }

export default function CookiesPage() {
  return <LegalPage title="Politique relative aux cookies" description="Cookies strictement nécessaires, préférences et mesure d’audience optionnelle sur IGS Nexus.">
    <LegalSection title="Cookies nécessaires"><p>Les cookies d’authentification Supabase, de sécurité, de session, de langue et d’état de l’interface sont indispensables au fonctionnement demandé. Ils ne sont pas utilisés à des fins publicitaires et ne peuvent pas être désactivés depuis le gestionnaire de consentement.</p></LegalSection>
    <LegalSection title="Mesure d’audience"><p>Lorsque cette fonction est activée par l’éditeur, Vercel Analytics mesure de façon agrégée la fréquentation et les performances. Ce traceur n’est chargé qu’après votre accord. Le refus n’empêche pas l’utilisation de la plateforme.</p></LegalSection>
    <LegalSection title="Durée du choix"><p>Votre préférence de consentement est conservée dans votre navigateur pendant six mois. Vous pouvez la modifier à tout moment avec le bouton « Gérer les cookies » disponible en bas de la page.</p></LegalSection>
    <LegalSection title="Paramétrage du navigateur"><p>Vous pouvez aussi supprimer ou bloquer les cookies depuis votre navigateur. Le blocage des cookies nécessaires peut empêcher la connexion, la 2FA et la conservation des préférences.</p></LegalSection>
  </LegalPage>
}
