// ─── Ibrahima Gold Service Constants ───

export const APP_NAME = 'Ibrahima Gold Service'
export const APP_TAGLINE = "L'excellence dans chaque expédition"
export const APP_SUBTITLE = 'Plateforme intelligente de pilotage du transit, de la douane et de la logistique en Guinée'

export const CURRENCIES = [
  { code: 'GNF', name: 'Franc guinéen', symbol: 'FG', flag: '🇬🇳' },
  { code: 'USD', name: 'Dollar américain', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'XOF', name: 'Franc CFA BCEAO', symbol: 'F CFA', flag: '🌍' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export const CASE_TYPES = [
  { value: 'maritime', label: 'Maritime', icon: 'Ship' },
  { value: 'aerien', label: 'Aérien', icon: 'Plane' },
  { value: 'terrestre', label: 'Terrestre', icon: 'Truck' },
  { value: 'multimodal', label: 'Multimodal', icon: 'GitBranch' },
] as const

export const CASE_DIRECTIONS = [
  { value: 'import', label: 'Import' },
  { value: 'export', label: 'Export' },
  { value: 'transit', label: 'Transit' },
] as const

export const CASE_STATUSES = [
  { value: 'brouillon', label: 'Brouillon', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'demande_recue', label: 'Demande reçue', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'devis_en_preparation', label: 'Devis en préparation', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { value: 'devis_envoye', label: 'Devis envoyé', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'commande_confirme', label: 'Commande confirmée', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'dossier_ouvert', label: 'Dossier ouvert', color: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
  { value: 'documents_en_attente', label: 'Documents en attente', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'documents_conformes', label: 'Documents conformes', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'en_preparation', label: 'En préparation', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'en_transit', label: 'En transit', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  { value: 'arrive_au_port', label: 'Arrivé au port', color: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  { value: 'en_dedouanement', label: 'En dédouanement', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 'en_attente_paiement', label: 'En attente de paiement', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'mainlevee_obtenue', label: 'Mainlevée obtenue', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'sortie_autorise', label: 'Sortie autorisée', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'en_livraison', label: 'En livraison', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'livre', label: 'Livré', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
  { value: 'facturation_en_cours', label: 'Facturation en cours', color: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  { value: 'cloture', label: 'Clôturé', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  { value: 'suspendu', label: 'Suspendu / Bloqué', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  { value: 'annule', label: 'Annulé', color: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
] as const

export type CaseStatus = (typeof CASE_STATUSES)[number]['value']
export const CASE_STATUS_VALUES = new Set<string>(CASE_STATUSES.map((status) => status.value))

const CASE_STATUS_ALIASES: Record<string, CaseStatus> = {
  assigne: 'dossier_ouvert',
  'en transit': 'en_transit',
  'clôturé': 'cloture',
  cloturee: 'cloture',
}

export function normalizeCaseStatus(status: string): CaseStatus | null {
  const normalized = status.trim().toLowerCase()
  const value = CASE_STATUS_ALIASES[normalized] ?? normalized
  return CASE_STATUS_VALUES.has(value) ? value as CaseStatus : null
}

export const PRIORITIES = [
  { value: 'normale', label: 'Normale', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  { value: 'haute', label: 'Haute', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'urgente', label: 'Urgente', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  { value: 'critique', label: 'Critique', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
] as const

export const ROLES = [
  { value: 'dg', label: 'Directeur Général' },
  { value: 'do', label: 'Directeur des Opérations' },
  { value: 'daf', label: 'DAF' },
  { value: 'chef_maritime', label: 'Chef Maritime' },
  { value: 'chef_aerien', label: 'Chef Aérien' },
  { value: 'chef_terrestre', label: 'Chef Terrestre' },
  { value: 'agent', label: 'Agent Logistique' },
  { value: 'declarant', label: 'Déclarant en Douane' },
  { value: 'passeur', label: 'Passeur en Douane' },
  { value: 'livreur', label: 'Livreur / Transporteur' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'comptable', label: 'Comptable' },
  { value: 'caissier', label: 'Caissier' },
  { value: 'client', label: 'Client' },
  { value: 'admin', label: 'Administrateur SaaS' },
] as const

export const EXPENSE_STATUSES = [
  { value: 'cree', label: 'Créé' },
  { value: 'soumis', label: 'Soumis' },
  { value: 'en_validation', label: 'En validation' },
  { value: 'approuve', label: 'Approuvé' },
  { value: 'paye', label: 'Payé' },
  { value: 'justifie', label: 'Justifié' },
  { value: 'rapproche', label: 'Rapproché' },
  { value: 'rejete', label: 'Rejeté' },
] as const

export const INVOICE_STATUSES = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'emise', label: 'Émise' },
  { value: 'envoyee', label: 'Envoyée' },
  { value: 'payee', label: 'Payée' },
  { value: 'partiellement_payee', label: 'Partiellement payée' },
  { value: 'echue', label: 'Échue' },
  { value: 'annulee', label: 'Annulée' },
] as const

export const CUSTOMS_STATUSES = [
  { value: 'preparation', label: 'Préparation' },
  { value: 'declare_preparee', label: 'Déclaration préparée' },
  { value: 'deposee', label: 'Déposée' },
  { value: 'circuit', label: 'Circuit' },
  { value: 'controle', label: 'Contrôle' },
  { value: 'paiement', label: 'Paiement' },
  { value: 'mainlevee', label: 'Mainlevée' },
  { value: 'rejet', label: 'Rejet / Blocage' },
] as const

export const DOCUMENT_CATEGORIES = [
  { value: 'bl', label: 'Bill of Lading (BL)' },
  { value: 'awb', label: 'Air Waybill (AWB)' },
  { value: 'facture_commerciale', label: 'Facture commerciale' },
  { value: 'packing_list', label: 'Packing List' },
  { value: 'certificat_origine', label: 'Certificat d\'origine' },
  { value: 'declaration', label: 'Déclaration douanière' },
  { value: 'quitus', label: 'Quitus' },
  { value: 'bon_livraison', label: 'Bon de livraison' },
  { value: 'preuve_paiement', label: 'Preuve de paiement' },
  { value: 'autre', label: 'Autre' },
] as const

export const INCIDENT_TYPES = [
  { value: 'retard', label: 'Retard' },
  { value: 'document_incomplet', label: 'Document incomplet' },
  { value: 'dommage', label: 'Dommage' },
  { value: 'perte', label: 'Perte' },
  { value: 'paiement', label: 'Paiement' },
  { value: 'blocage_administratif', label: 'Blocage administratif' },
  { value: 'accident', label: 'Accident' },
  { value: 'autre', label: 'Autre' },
] as const

export const INCIDENT_STATUSES = [
  { value: 'ouvert', label: 'Ouvert', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'en_cours', label: 'En cours', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'resolu', label: 'Résolu', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'cloture', label: 'Clôturé', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
] as const

export function getIncidentStatus(status: string) {
  const normalized = status === 'clôturé' ? 'cloture' : status.trim().toLowerCase()
  return INCIDENT_STATUSES.find((item) => item.value === normalized)
}

export const SEVERITY_LEVELS = [
  { value: 'faible', label: 'Faible', color: 'bg-green-100 text-green-700' },
  { value: 'moyen', label: 'Moyen', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'eleve', label: 'Élevé', color: 'bg-orange-100 text-orange-700' },
  { value: 'critique', label: 'Critique', color: 'bg-red-100 text-red-700' },
] as const

export const PORTS = [
  'Port Autonome de Conakry',
  'Terminal à conteneurs (TCG)',
  'Terminal minéralier',
  'Aéroport international Ahmed Sékou Touré',
  'Port d\'Antwerp',
  'Port de Rotterdam',
  'Port de Shanghai',
  'Port de Marseille',
  'Aéroport de Paris CDG',
  'Aéroport d\'Istanbul',
] as const

export const SHIPPING_LINES = [
  'MAERSK', 'CMA CGM', 'MSC', 'Hapag-Lloyd', 'COSCO',
  'ONE', 'Evergreen', 'Yang Ming', 'PIL', 'Safmarine',
] as const

export const AIRLINES = [
  'Air France', 'Brussels Airlines', 'Ethiopian Airlines', 'Turkish Airlines',
  'Royal Air Maroc', 'Emirates', 'Kenya Airways', 'Camair-Co',
] as const

export function formatGNF(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M GNF`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K GNF`
  }
  return `${amount.toLocaleString('fr-FR')} GNF`
}

export function formatMoney(
  amount: number,
  currency: string = 'GNF',
  locale = 'fr-FR',
  compact = false,
): string {
  if (!Number.isFinite(amount)) return '—'
  if (compact && currency === 'GNF') return formatGNF(amount)

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency === 'GNF' ? 'GNF' : currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: currency === 'GNF' || currency === 'XOF' ? 0 : 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusLabel(status: string): string {
  const found = CASE_STATUSES.find((s) => s.value === status)
  return found ? found.label : status
}

export function getStatusColor(status: string): string {
  const found = CASE_STATUSES.find((s) => s.value === status)
  return found ? found.color : 'bg-gray-100 text-gray-700'
}

export function getPriorityLabel(priority: string): string {
  const found = PRIORITIES.find((p) => p.value === priority)
  return found ? found.label : priority
}

export function getPriorityColor(priority: string): string {
  const found = PRIORITIES.find((p) => p.value === priority)
  return found ? found.color : 'bg-gray-100 text-gray-700'
}
