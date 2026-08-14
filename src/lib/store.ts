import { create } from 'zustand'

// ─── Navigation Store ───
export type ViewId =
  | 'dashboard'
  | 'role-dashboard'
  | 'cases'
  | 'case-detail'
  | 'case-new'
  | 'clients'
  | 'quotes'
  | 'quote-new'
  | 'payments'
  | 'client-detail'
  | 'crm'
  | 'maritime'
  | 'aerien'
  | 'terrestre'
  | 'shipping-trackers'
  | 'douane'
  | 'documents'
  | 'expenses'
  | 'invoices'
  | 'incidents'
  | 'reports'
  | 'settings'
  | 'subscription'
  | 'notifications'
  | 'audit'
  | 'portail-client'
  | 'landing'

interface AppState {
  // Navigation
  currentView: ViewId
  viewParams: Record<string, string>
  sidebarOpen: boolean
  sidebarCollapsed: boolean

  // Auth simulation
  isAuthenticated: boolean
  currentProfile: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    avatarUrl?: string
  } | null

  // Notifications
  unreadCount: number

  // Actions
  setView: (view: ViewId, params?: Record<string, string>) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  login: (profile: AppState['currentProfile']) => void
  logout: () => void
  setUnreadCount: (count: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'landing',
  viewParams: {},
  sidebarOpen: false,
  sidebarCollapsed: false,
  isAuthenticated: false,
  currentProfile: null,
  unreadCount: 0,

  setView: (view, params = {}) =>
    set({ currentView: view, viewParams: params }),
  toggleSidebar: () =>
    set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),
  login: (profile) =>
    set({ isAuthenticated: true, currentProfile: profile, currentView: 'dashboard' }),
  logout: () =>
    set({ isAuthenticated: false, currentProfile: null, currentView: 'landing' }),
  setUnreadCount: (count) => set({ unreadCount: count }),
}))
