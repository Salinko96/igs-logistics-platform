'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FolderOpen,
  Building2,
  Ship,
  Plane,
  Truck,
  Radar,
  Shield,
  FileText,
  Wallet,
  Receipt,
  AlertTriangle,
  BarChart3,
  Settings,
  BadgeDollarSign,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppStore, type ViewId } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { pathForView } from '@/lib/navigation'
import { useQueryClient } from '@tanstack/react-query'

interface NavItem {
  id: ViewId
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'nav.dashboard', icon: LayoutDashboard },
  { id: 'cases', label: 'nav.cases', icon: FolderOpen },
  { id: 'clients', label: 'nav.clients', icon: Building2 },
]

const transportItems: NavItem[] = [
  { id: 'maritime', label: 'Maritime', icon: Ship },
  { id: 'shipping-trackers', label: 'nav.tracking', icon: Radar },
  { id: 'aerien', label: 'A\u00e9rien', icon: Plane },
  { id: 'terrestre', label: 'Terrestre', icon: Truck },
]

const financeItems: NavItem[] = [
  { id: 'douane', label: 'nav.customs', icon: Shield },
  { id: 'documents', label: 'nav.documents', icon: FileText },
  { id: 'expenses', label: 'nav.expenses', icon: Wallet },
  { id: 'invoices', label: 'nav.invoices', icon: Receipt },
  { id: 'incidents', label: 'nav.incidents', icon: AlertTriangle },
  { id: 'reports', label: 'nav.reports', icon: BarChart3 },
  { id: 'settings', label: 'nav.settings', icon: Settings },
  { id: 'subscription', label: 'nav.subscription', icon: BadgeDollarSign },
]

function NavItemButton({
  item,
  collapsed,
  onClick,
  onPrefetch,
}: {
  item: NavItem
  collapsed: boolean
  onClick: () => void
  onPrefetch: () => void
}) {
  const { t } = useI18n()
  const currentView = useAppStore((s) => s.currentView)
  const isActive = currentView === item.id
  const Icon = item.icon

  const button = (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
        collapsed && 'justify-center px-2',
        isActive
          ? 'bg-primary text-primary-foreground shadow-[0_10px_22px_rgb(255_90_0/0.20)]'
          : 'text-[var(--sidebar-foreground)] hover:bg-white/[0.055] hover:text-white'
      )}
    >
      {/* Brand accent for active item */}
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-white/70" />
      )}
      <Icon
        className={cn(
          'shrink-0 transition-colors duration-200',
          isActive ? 'text-primary-foreground' : 'text-[#9bb0ab] group-hover:text-white'
        )}
        size={20}
      />
      {!collapsed && <span className="truncate">{t(item.label)}</span>}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p>{t(item.label)}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return button
}

function NavSection({
  title,
  items,
  collapsed,
  onNavigate,
}: {
  title?: string
  items: NavItem[]
  collapsed: boolean
  onNavigate?: (viewId: ViewId) => void
}) {
  const setView = useAppStore((s) => s.setView)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = useI18n()

  const handleNav = (viewId: ViewId) => {
    setView(viewId)
    const path = pathForView(viewId)
    if (path) router.push(path)
    onNavigate?.(viewId)
  }

  const prefetchView = (viewId: ViewId) => {
    const path = pathForView(viewId)
    if (path) router.prefetch(path)
    if (viewId === 'documents') void queryClient.prefetchQuery({ queryKey: ['documents', 'all', '', 1], queryFn: async () => (await fetch('/api/documents?page=1&pageSize=12')).json(), staleTime: 60_000 })
    if (viewId === 'expenses') void queryClient.prefetchQuery({ queryKey: ['expenses'], queryFn: async () => (await fetch('/api/expenses')).json(), staleTime: 60_000 })
    if (viewId === 'subscription') void queryClient.prefetchQuery({ queryKey: ['saas-subscription'], queryFn: async () => (await fetch('/api/saas/subscription')).json(), staleTime: 60_000 })
    if (viewId === 'shipping-trackers') void queryClient.prefetchQuery({ queryKey: ['shipping-trackers'], queryFn: async () => (await fetch('/api/shipping-trackers')).json(), staleTime: 60_000 })
  }

  return (
    <div className="space-y-1">
      {!collapsed && title && (
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#8fa19d]">
          {title ? t(title) : null}
        </p>
      )}
      {collapsed && title && (
        <Separator className="my-2 bg-white/[0.055]" />
      )}
      {items.map((item) => (
        <NavItemButton
          key={item.id}
          item={item}
          collapsed={collapsed}
          onClick={() => handleNav(item.id)}
          onPrefetch={() => prefetchView(item.id)}
        />
      ))}
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, currentProfile, logout } =
    useAppStore()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
  }

  const filteredFinanceItems = financeItems.filter(item => {
    if (['expenses', 'settings', 'subscription', 'audit'].includes(item.id)) {
      return currentProfile?.role === 'ADMIN'
    }
    return true
  })

  const initials = currentProfile
    ? `${currentProfile.firstName[0]}${currentProfile.lastName[0]}`.toUpperCase()
    : 'IG'

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-white/[0.08] bg-[var(--sidebar)] shadow-[12px_0_36px_rgb(2_6_23/0.12)] transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo area */}
      <div className="relative flex h-[72px] shrink-0 items-center gap-3 px-4">
        <div className="absolute inset-x-0 top-0 h-px bg-primary/80" />
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white p-1.5 shadow-lg shadow-black/20">
            <img src="/igs-icon.png" alt="IGS" className="h-full w-full rounded-md object-cover" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-bold tracking-tight text-white">
                Ibrahima Gold Service
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-primary">
                Logistics Platform
              </span>
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-white/[0.055]" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-5">
          <NavSection items={navItems} collapsed={sidebarCollapsed} />
          <NavSection
            title="section.transport"
            items={transportItems}
            collapsed={sidebarCollapsed}
          />
          <NavSection
            title="section.operations"
            items={filteredFinanceItems}
            collapsed={sidebarCollapsed}
          />
        </div>
      </ScrollArea>

      {/* Bottom section */}
      <div className="shrink-0 space-y-2 pb-4">
        <Separator className="bg-white/[0.055]" />

        {/* User section */}
        <div
          className={cn(
            'flex items-center gap-3 px-3 py-2',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          <Avatar className="h-8 w-8 shrink-0 border border-primary/40">
            {currentProfile?.avatarUrl && (
              <AvatarImage
                src={currentProfile.avatarUrl}
                alt={currentProfile.firstName}
              />
            )}
            <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-slate-200">
                {currentProfile
                  ? `${currentProfile.firstName} ${currentProfile.lastName}`
                  : 'Utilisateur'}
              </span>
              <span className="truncate text-[11px] text-[#8fa19d]">
                {currentProfile?.role || 'Admin'}
              </span>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 rounded-md p-1.5 text-[#8fa19d] transition-colors hover:bg-white/[0.055] hover:text-white"
            aria-label="Déconnexion"
          >
            <LogOut size={16} />
          </button>
          )}
        </div>

        {/* Collapse toggle */}
        <div className="flex justify-center px-3">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-[11px] text-[#8fa19d] transition-colors hover:bg-white/[0.055] hover:text-white"
          >
            {sidebarCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span>R\u00e9duire</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}

export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { currentProfile, logout } = useAppStore()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
  }

  const filteredFinanceItems = financeItems.filter(item => {
    if (['expenses', 'settings', 'subscription', 'audit'].includes(item.id)) {
      return currentProfile?.role === 'ADMIN'
    }
    return true
  })

  const initials = currentProfile
    ? `${currentProfile.firstName[0]}${currentProfile.lastName[0]}`.toUpperCase()
    : 'IG'

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity duration-300 md:hidden',
        open
          ? 'visible opacity-100'
          : 'invisible opacity-0 pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Sidebar panel */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-[292px] bg-[var(--sidebar)] shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
          <div className="flex h-full flex-col">
          {/* Logo area */}
          <div className="relative flex h-[72px] shrink-0 items-center justify-between px-4">
            <div className="absolute inset-x-0 top-0 h-px bg-primary/80" />
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white p-1.5 shadow-lg shadow-black/20">
                <img src="/igs-icon.png" alt="IGS" className="h-full w-full rounded-md object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="truncate text-sm font-bold tracking-tight text-white">
                  Ibrahima Gold Service
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-primary">
                  Logistics Platform
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md p-2 text-[#9bb0ab] transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Fermer le menu"
            >
              <X size={20} />
            </button>
          </div>

          <Separator className="bg-white/[0.055]" />

          {/* Navigation - auto-close on navigate */}
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="space-y-5">
              <NavSection
                items={navItems}
                collapsed={false}
                onNavigate={() => onOpenChange(false)}
              />
              <NavSection
                title="section.transport"
                items={transportItems}
                collapsed={false}
                onNavigate={() => onOpenChange(false)}
              />
              <NavSection
                title="section.operations"
                items={filteredFinanceItems}
                collapsed={false}
                onNavigate={() => onOpenChange(false)}
              />
            </div>
          </ScrollArea>

          {/* Bottom user section */}
          <div className="shrink-0 pb-4">
            <Separator className="bg-white/[0.055]" />
            <div className="flex items-center gap-3 px-3 py-3">
              <Avatar className="h-8 w-8 shrink-0 border border-primary/40">
                {currentProfile?.avatarUrl && (
                  <AvatarImage
                    src={currentProfile.avatarUrl}
                    alt={currentProfile.firstName}
                  />
                )}
                <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-medium text-slate-200">
                  {currentProfile
                    ? `${currentProfile.firstName} ${currentProfile.lastName}`
                    : 'Utilisateur'}
                </span>
                <span className="truncate text-[11px] text-[#8fa19d]">
                  {currentProfile?.role || 'Admin'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 rounded-md p-1.5 text-[#8fa19d] transition-colors hover:bg-white/[0.055] hover:text-white"
                aria-label="Déconnexion"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
