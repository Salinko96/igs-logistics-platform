'use client'

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Sidebar, MobileSidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import DashboardView from '@/components/dashboard/dashboard-view'
import CasesList from '@/components/dossiers/cases-list'
import CaseNew from '@/components/dossiers/case-new'
import CaseDetail from '@/components/dossiers/case-detail'
import ClientsList from '@/components/crm/clients-list'
import ClientDetail from '@/components/crm/client-detail'
import ExpensesList from '@/components/expenses/expenses-list'
import InvoicesList from '@/components/invoices/invoices-list'
import IncidentsList from '@/components/incidents/incidents-list'
import ReportsView from '@/components/reports/reports-view'
import SettingsView from '@/components/settings/settings-view'
import DocumentsView from '@/components/documents/documents-view'
import NotificationsView from '@/components/notifications/notifications-view'
import AuditView from '@/components/audit/audit-view'
import ShippingTrackersView from '@/components/tracking/shipping-trackers-view'
import ClientPortalPage from '@/app/portail/page'
import SubscriptionView from '@/components/subscription/subscription-view'

const viewVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const viewTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.2,
} as const

function ViewRouter() {
  const currentView = useAppStore((s) => s.currentView)
  const viewParams = useAppStore((s) => s.viewParams)

  let view: React.ReactNode

  switch (currentView) {
    case 'dashboard':
      view = <DashboardView />
      break
    case 'cases':
      view = <CasesList filter={{ scope: viewParams.scope }} />
      break
    case 'case-new':
      view = <CaseNew />
      break
    case 'case-detail':
      view = <CaseDetail />
      break
    case 'clients':
      view = <ClientsList />
      break
    case 'crm':
      view = <ClientsList />
      break
    case 'client-detail':
      view = <ClientDetail />
      break
    case 'maritime':
      view = <CasesList filter={{ type: 'maritime' }} />
      break
    case 'aerien':
      view = <CasesList filter={{ type: 'aerien' }} />
      break
    case 'terrestre':
      view = <CasesList filter={{ type: 'terrestre' }} />
      break
    case 'shipping-trackers':
      view = <ShippingTrackersView />
      break
    case 'douane':
      view = <CasesList filter={{ status: 'en_dedouanement' }} />
      break
    case 'documents':
      view = <DocumentsView />
      break
    case 'expenses':
      view = <ExpensesList initialFilter={viewParams.filter} />
      break
    case 'invoices':
      view = <InvoicesList />
      break
    case 'incidents':
      view = <IncidentsList />
      break
    case 'reports':
      view = <ReportsView />
      break
    case 'settings':
      view = <SettingsView />
      break
    case 'subscription':
      view = <SubscriptionView />
      break
    case 'notifications':
      view = <NotificationsView />
      break
    case 'audit':
      view = <AuditView />
      break
    case 'portail-client':
      view = <ClientPortalPage />
      break
    default:
      view = <DashboardView />
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${currentView}:${JSON.stringify(viewParams)}`}
        variants={viewVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={viewTransition}
        className="h-full"
      >
        {view}
      </motion.div>
    </AnimatePresence>
  )
}

export function AppShell({ initialProfile, initialView = 'dashboard' }: { initialProfile?: any; initialView?: import('@/lib/store').ViewId }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const login = useAppStore((s) => s.login)
  const setView = useAppStore((s) => s.setView)

  React.useEffect(() => {
    if (initialProfile) {
      login(initialProfile)
      setView(initialView)
    }
  }, [initialProfile, initialView, login, setView])

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar - always visible, hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay - controlled by sidebarOpen from store */}
      <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto w-full max-w-[1600px]">
            <ViewRouter />
          </div>
        </main>
      </div>
    </div>
  )
}
