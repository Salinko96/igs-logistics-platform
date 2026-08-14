export const APP_ROLES = ['ADMIN', 'COMMERCIAL', 'EXPLOITANT', 'COMPTABLE', 'AGENT', 'CLIENT'] as const
export type AppRole = (typeof APP_ROLES)[number]
export type PermissionAction = 'create' | 'read' | 'update' | 'validate' | 'delete' | 'remind'
export type PermissionResource =
  | 'dashboard_global' | 'dashboard_role' | 'clients' | 'devis' | 'dossiers'
  | 'transport' | 'douane_sydonia' | 'documents' | 'incidents' | 'debours'
  | 'facturation' | 'encaissements' | 'rapports_ops' | 'rapports_finance'
  | 'parametres' | 'abonnement' | 'utilisateurs'

const CRUD: PermissionAction[] = ['create', 'read', 'update', 'validate', 'delete']
const RU: PermissionAction[] = ['read', 'update']
const R: PermissionAction[] = ['read']

export const PERMISSIONS: Record<AppRole, Partial<Record<PermissionResource, PermissionAction[]>>> = {
  ADMIN: Object.fromEntries([
    'dashboard_global', 'dashboard_role', 'clients', 'devis', 'dossiers', 'transport',
    'douane_sydonia', 'documents', 'incidents', 'debours', 'facturation',
    'encaissements', 'rapports_ops', 'rapports_finance', 'parametres', 'abonnement',
    'utilisateurs',
  ].map((resource) => [resource, CRUD])) as Record<PermissionResource, PermissionAction[]>,
  COMMERCIAL: {
    dashboard_role: R, clients: ['create', 'read', 'update'], devis: CRUD,
    dossiers: ['create', 'read'], transport: R, douane_sydonia: R,
    documents: ['create', 'read'], incidents: R, debours: R,
    facturation: ['read', 'remind'], encaissements: R,
    rapports_ops: R, rapports_finance: R,
  },
  EXPLOITANT: {
    dashboard_role: R, clients: R, devis: R, dossiers: RU, transport: RU,
    douane_sydonia: RU, documents: CRUD, incidents: CRUD, debours: R,
    rapports_ops: R,
  },
  COMPTABLE: {
    dashboard_role: R, clients: R, devis: R, dossiers: R, transport: R,
    douane_sydonia: R, documents: R, incidents: R, debours: CRUD,
    facturation: CRUD, encaissements: CRUD, rapports_ops: R, rapports_finance: CRUD,
  },
  // Compatibilité des comptes historiques, sans leur donner les réglages SaaS/admin.
  AGENT: {
    dashboard_role: R, clients: CRUD, devis: R, dossiers: CRUD, transport: CRUD,
    douane_sydonia: CRUD, documents: CRUD, incidents: CRUD, debours: RU,
    facturation: RU, encaissements: RU, rapports_ops: R,
  },
  CLIENT: { dossiers: R, documents: R, facturation: R },
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && APP_ROLES.includes(value as AppRole)
}

export function can(role: AppRole | string | null | undefined, action: PermissionAction, resource: PermissionResource) {
  return isAppRole(role) && Boolean(PERMISSIONS[role][resource]?.includes(action))
}

export function getHomePath(role: AppRole | string | null | undefined) {
  if (role === 'COMMERCIAL') return '/commercial'
  if (role === 'EXPLOITANT') return '/exploitant'
  if (role === 'COMPTABLE') return '/comptable'
  if (role === 'CLIENT') return '/portail'
  return '/dashboard'
}

export function getRoleLabel(role: AppRole | string | null | undefined) {
  return ({ ADMIN: 'Admin', COMMERCIAL: 'Commercial', EXPLOITANT: 'Exploitant', COMPTABLE: 'Comptable', AGENT: 'Agent', CLIENT: 'Client' } as Record<string, string>)[role || ''] || 'Utilisateur'
}

export function getWorkspaceLabel(role: AppRole | string | null | undefined) {
  return ({ ADMIN: 'IGS Admin', COMMERCIAL: 'IGS Commercial', EXPLOITANT: 'IGS Exploitation', COMPTABLE: 'IGS Comptabilité', AGENT: 'IGS Opérations' } as Record<string, string>)[role || ''] || 'IGS Logistics'
}

export const ROLE_VIEW_PATHS: Partial<Record<AppRole, Partial<Record<string, string>>>> = {
  COMMERCIAL: { dashboard: '/commercial', clients: '/commercial/clients', quotes: '/commercial/devis', cases: '/commercial/dossiers', invoices: '/commercial/facturation' },
  EXPLOITANT: { dashboard: '/exploitant', cases: '/exploitant/dossiers', maritime: '/exploitant/maritime', 'shipping-trackers': '/exploitant/tracking', aerien: '/exploitant/aerien', terrestre: '/exploitant/terrestre', douane: '/exploitant/douane', documents: '/exploitant/documents', incidents: '/exploitant/incidents', expenses: '/exploitant/debours' },
  COMPTABLE: { dashboard: '/comptable', expenses: '/comptable/debours', invoices: '/comptable/facturation', payments: '/comptable/encaissements', reports: '/comptable/rapports', cases: '/comptable/dossiers' },
}

export function pathForRoleView(role: AppRole | string | null | undefined, view: string, fallback?: string) {
  return isAppRole(role) ? ROLE_VIEW_PATHS[role]?.[view] || fallback : fallback
}

export const ROUTE_ACCESS: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: '/commercial', roles: ['COMMERCIAL', 'ADMIN'] },
  { prefix: '/exploitant', roles: ['EXPLOITANT', 'ADMIN'] },
  { prefix: '/comptable', roles: ['COMPTABLE', 'ADMIN'] },
  { prefix: '/parametres', roles: ['ADMIN'] },
  { prefix: '/abonnement', roles: ['ADMIN'] },
  { prefix: '/journal-activite', roles: ['ADMIN'] },
  { prefix: '/dashboard', roles: ['ADMIN', 'AGENT'] },
  { prefix: '/facturation', roles: ['ADMIN', 'AGENT', 'COMMERCIAL', 'COMPTABLE'] },
  { prefix: '/debours', roles: ['ADMIN', 'AGENT', 'EXPLOITANT', 'COMPTABLE'] },
  { prefix: '/douane', roles: ['ADMIN', 'AGENT', 'EXPLOITANT'] },
  { prefix: '/tracking', roles: ['ADMIN', 'AGENT', 'EXPLOITANT'] },
  { prefix: '/maritime', roles: ['ADMIN', 'AGENT', 'EXPLOITANT'] },
  { prefix: '/aerien', roles: ['ADMIN', 'AGENT', 'EXPLOITANT'] },
  { prefix: '/terrestre', roles: ['ADMIN', 'AGENT', 'EXPLOITANT'] },
  { prefix: '/incidents', roles: ['ADMIN', 'AGENT', 'EXPLOITANT'] },
]

export function canAccessPath(role: AppRole | string | null | undefined, pathname: string) {
  if (!isAppRole(role)) return false
  const rule = ROUTE_ACCESS.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  return !rule || rule.roles.includes(role)
}
