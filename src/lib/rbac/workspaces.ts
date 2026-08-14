import type { ViewId } from '@/lib/store'

export const COMMERCIAL_VIEWS: Record<string, ViewId> = {
  clients: 'clients', devis: 'quotes', dossiers: 'cases', facturation: 'invoices',
}
export const EXPLOITANT_VIEWS: Record<string, ViewId> = {
  dossiers: 'cases', maritime: 'maritime', tracking: 'shipping-trackers', aerien: 'aerien',
  terrestre: 'terrestre', douane: 'douane', documents: 'documents', incidents: 'incidents', debours: 'expenses', facturation: 'invoices',
}
export const COMPTABLE_VIEWS: Record<string, ViewId> = {
  debours: 'expenses', facturation: 'invoices', encaissements: 'payments', rapports: 'reports', dossiers: 'cases',
}
