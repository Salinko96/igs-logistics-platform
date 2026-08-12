import type { ViewId } from '@/lib/store'

export const VIEW_PATHS: Partial<Record<ViewId, string>> = {
  dashboard: '/dashboard',
  cases: '/dossiers',
  clients: '/clients',
  maritime: '/maritime',
  'shipping-trackers': '/tracking',
  aerien: '/aerien',
  terrestre: '/terrestre',
  douane: '/douane',
  documents: '/documents',
  expenses: '/debours',
  invoices: '/facturation',
  incidents: '/incidents',
  reports: '/rapports',
  settings: '/parametres',
  subscription: '/abonnement',
  notifications: '/notifications',
  audit: '/journal-activite',
}

export const SECTION_VIEWS: Record<string, ViewId> = Object.fromEntries(
  Object.entries(VIEW_PATHS)
    .filter(([, path]) => path !== '/dashboard')
    .map(([view, path]) => [path!.slice(1), view as ViewId]),
)

export function pathForView(view: ViewId) {
  return VIEW_PATHS[view]
}
