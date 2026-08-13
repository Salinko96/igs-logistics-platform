'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Locale = 'fr' | 'en'

const messages: Record<Locale, Record<string, string>> = {
  fr: {
    'nav.subscription': 'Abonnement plateforme',
    'nav.dashboard': 'Tableau de bord', 'nav.cases': 'Dossiers', 'nav.clients': 'Clients', 'nav.tracking': 'Tracking navires', 'nav.customs': 'Douane', 'nav.documents': 'Documents', 'nav.expenses': 'Débours', 'nav.invoices': 'Facturation', 'nav.incidents': 'Incidents', 'nav.reports': 'Rapports', 'nav.settings': 'Paramètres', 'section.transport': 'Transport', 'section.operations': 'Opérations', 'common.search': 'Rechercher...', 'common.logout': 'Déconnexion', 'common.profile': 'Mon profil', 'common.audit': 'Journal d’audit', 'common.notifications': 'Notifications', 'common.theme': 'Basculer le thème', 'common.language': 'Langue', 'common.user': 'Utilisateur', 'view.case': 'Dossier', 'view.customs': 'Douane & Conformité', 'view.expenses': 'Débours & Caisse', 'view.incidents': 'Incidents & Réclamations', 'view.reports': 'Rapports & KPI', 'view.notifications': 'Notifications', 'screen.overview': 'Vue d’ensemble', 'screen.cases': 'Dossiers', 'screen.clients': 'Clients', 'screen.invoices': 'Facturation & Recouvrement', 'screen.expenses': 'Débours & Caisse', 'screen.documents': 'Documents', 'action.newCase': 'Nouveau dossier', 'action.newClient': 'Nouveau client', 'action.newExpense': 'Nouveau débours', 'auth.email': 'Adresse email', 'auth.password': 'Mot de passe', 'auth.login': 'Se connecter', 'auth.loggingIn': 'Connexion...', 'auth.loginError': 'Identifiants invalides', 'type.maritime': 'Maritime', 'type.aerien': 'Aérien', 'type.terrestre': 'Terrestre', 'type.multimodal': 'Multimodal',
  },
  en: {
    'nav.subscription': 'Platform subscription',
    'nav.dashboard': 'Dashboard', 'nav.cases': 'Cases', 'nav.clients': 'Clients', 'nav.tracking': 'Vessel tracking', 'nav.customs': 'Customs', 'nav.documents': 'Documents', 'nav.expenses': 'Expenses', 'nav.invoices': 'Billing', 'nav.incidents': 'Incidents', 'nav.reports': 'Reports', 'nav.settings': 'Settings', 'section.transport': 'Transport', 'section.operations': 'Operations', 'common.search': 'Search...', 'common.logout': 'Sign out', 'common.profile': 'My profile', 'common.audit': 'Audit log', 'common.notifications': 'Notifications', 'common.theme': 'Toggle theme', 'common.language': 'Language', 'common.user': 'User', 'view.case': 'Case', 'view.customs': 'Customs & Compliance', 'view.expenses': 'Expenses & Cash', 'view.incidents': 'Incidents & Claims', 'view.reports': 'Reports & KPIs', 'view.notifications': 'Notifications', 'screen.overview': 'Overview', 'screen.cases': 'Cases', 'screen.clients': 'Clients', 'screen.invoices': 'Billing & Collections', 'screen.expenses': 'Expenses & Cash', 'screen.documents': 'Documents', 'action.newCase': 'New case', 'action.newClient': 'New client', 'action.newExpense': 'New expense', 'auth.email': 'Email address', 'auth.password': 'Password', 'auth.login': 'Sign in', 'auth.loggingIn': 'Signing in...', 'auth.loginError': 'Invalid credentials', 'type.maritime': 'Maritime', 'type.aerien': 'Air', 'type.terrestre': 'Land', 'type.multimodal': 'Multimodal',
  },
}

type I18nContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: string) => string }
const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')
  useEffect(() => {
    const task = window.setTimeout(() => {
      const stored = window.localStorage.getItem('igs-locale')
      const cookie = document.cookie.match(/(?:^|; )igs-locale=(fr|en)/)?.[1]
      const preferred = stored === 'en' || stored === 'fr' ? stored : cookie
      if (preferred === 'en' || preferred === 'fr') setLocaleState(preferred)
    }, 0)
    return () => window.clearTimeout(task)
  }, [])
  const setLocale = (next: Locale) => {
    setLocaleState(next)
    window.localStorage.setItem('igs-locale', next)
    document.cookie = `igs-locale=${next}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.lang = next
  }
  const value = useMemo(() => ({ locale, setLocale, t: (key: string) => messages[locale][key] ?? messages.fr[key] ?? key }), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n doit être utilisé dans I18nProvider')
  return context
}
