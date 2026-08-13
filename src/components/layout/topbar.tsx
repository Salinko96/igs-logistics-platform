'use client'

import React from 'react'
import {
  Search,
  Moon,
  Sun,
  Bell,
  Menu,
  LogOut,
  Settings,
  User,
  FolderOpen,
  Building2,
  FileText,
  Loader2,
  Activity,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/lib/store'
import { readJson } from '@/lib/http'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

const viewNames: Record<string, string> = {
  dashboard: 'nav.dashboard',
  cases: 'nav.cases',
  'case-detail': 'view.case',
  clients: 'nav.clients',
  maritime: 'Maritime',
  'shipping-trackers': 'nav.tracking',
  aerien: 'A\u00e9rien',
  terrestre: 'Terrestre',
  douane: 'view.customs',
  documents: 'nav.documents',
  expenses: 'view.expenses',
  invoices: 'nav.invoices',
  incidents: 'view.incidents',
  reports: 'view.reports',
  settings: 'nav.settings',
  subscription: 'nav.subscription',
  notifications: 'view.notifications',
  audit: 'common.audit',
}

interface SearchPayload {
  cases: Array<{
    id: string
    reference: string
    status: string
    type: string
    client: { name: string }
  }>
  clients: Array<{
    id: string
    name: string
    sector: string | null
    city: string
    contacts: Array<{ firstName: string; lastName: string }>
  }>
  documents: Array<{
    id: string
    name: string
    status: string
    category: string
    case: { id: string; reference: string } | null
  }>
}

export function MobileSidebarTrigger() {
  const { sidebarOpen, toggleSidebar } = useAppStore()
  // On mobile we toggle the mobile sidebar overlay
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden'
      )}
      aria-label="Menu"
    >
      <Menu size={20} />
    </button>
  )
}

export function Topbar() {
  const { currentView, unreadCount, currentProfile, setView, logout, setUnreadCount } =
    useAppStore()
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  const [mounted, setMounted] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
  }
  const [results, setResults] = React.useState<SearchPayload | null>(null)
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchError, setSearchError] = React.useState('')

  React.useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0)
    return () => window.clearTimeout(id)
  }, [])

  React.useEffect(() => {
    let cancelled = false

    async function loadUnreadCount() {
      try {
        const response = await fetch('/api/notifications')
        if (!response.ok) return
        const payload = await readJson<{ unreadCount?: number }>(response)
        if (!cancelled && typeof payload.unreadCount === 'number') {
          setUnreadCount(payload.unreadCount)
        }
      } catch {
        // Keep the last known badge value if the network is unavailable.
      }
    }

    loadUnreadCount()

    return () => {
      cancelled = true
    }
  }, [setUnreadCount])

  React.useEffect(() => {
    const query = search.trim()

    if (query.length < 2) {
      return
    }

    const controller = new AbortController()
    const id = window.setTimeout(async () => {
      setIsSearching(true)
      setSearchError('')
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Recherche indisponible')
        const payload = await response.json().catch(() => null)
        if (!payload || !Array.isArray(payload.cases) || !Array.isArray(payload.clients) || !Array.isArray(payload.documents)) {
          throw new Error('Recherche indisponible')
        }
        setResults(payload)
        setSearchOpen(true)
      } catch (error) {
        if (!controller.signal.aborted) {
          setResults({ cases: [], clients: [], documents: [] })
          setSearchError('Recherche indisponible')
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false)
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(id)
    }
  }, [search])

  const currentViewName = t(viewNames[currentView] || 'nav.dashboard')
  const totalResults =
    (results?.cases.length ?? 0) +
    (results?.clients.length ?? 0) +
    (results?.documents.length ?? 0)

  const closeSearch = () => {
    setSearchOpen(false)
    setSearch('')
    setResults(null)
    setSearchError('')
  }

  const initials = currentProfile
    ? `${currentProfile.firstName[0]}${currentProfile.lastName[0]}`.toUpperCase()
    : 'IG'

  return (
    <header className='flex h-14 shrink-0 items-center gap-4 border-b border-border/80 bg-card/88 px-4 shadow-[0_1px_0_rgb(15_23_42/0.03)] backdrop-blur-xl md:px-6'>
      {/* Mobile hamburger */}
      <MobileSidebarTrigger />

      {/* Breadcrumb */}
      <nav className='hidden items-center gap-1.5 text-sm sm:flex'>
        <span className='text-muted-foreground'>IGS Operations</span>
        <span className='text-muted-foreground/40'>/</span>
        <span className='font-medium text-foreground'>{currentViewName}</span>
      </nav>
      {/* Mobile breadcrumb - just show page name */}
      <span className='text-sm font-medium text-foreground sm:hidden'>
        {currentViewName}
      </span>

      {/* Spacer */}
      <div className='flex-1' />

      {/* Search */}
      <div className='relative hidden md:block'>
        <Search
          className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
          size={15}
        />
        <input
          type='text'
          placeholder={t('common.search')}
          value={search}
          onChange={(event) => {
            const nextSearch = event.target.value
            setSearch(nextSearch)
            if (nextSearch.trim().length < 2) {
              setSearchOpen(false)
              setResults(null)
              setSearchError('')
              setIsSearching(false)
            } else {
              setSearchOpen(true)
            }
          }}
          onFocus={() => search.trim().length >= 2 && setSearchOpen(true)}
          className='h-9 w-[300px] rounded-md border border-border bg-background/70 pl-9 pr-16 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:bg-card'
        />
        {isSearching ? (
          <Loader2 className='absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground' />
        ) : (
          <kbd className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline-flex'>
            <span className='text-xs'>⌘</span>K
          </kbd>
        )}

        {searchOpen && search.trim().length >= 2 && (
          <div className='absolute right-0 top-11 z-50 w-[430px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-[0_22px_55px_rgb(15_23_42/0.16)]'>
            {searchError ? (
              <div className='px-4 py-6 text-center text-sm text-destructive'>
                {searchError}
              </div>
            ) : totalResults === 0 && !isSearching ? (
              <div className='px-4 py-6 text-center text-sm text-muted-foreground'>
                Aucun résultat pour « {search.trim()} ».
              </div>
            ) : (
              <div className='max-h-[480px] overflow-y-auto p-2'>
                <SearchGroup title='Dossiers' icon={<FolderOpen size={14} />}>
                  {results?.cases.map((item) => (
                    <SearchItem
                      key={item.id}
                      title={item.reference}
                      description={`${item.client.name} · ${item.type} · ${item.status}`}
                      onClick={() => {
                        setView('case-detail', { id: item.id })
                        closeSearch()
                      }}
                    />
                  ))}
                </SearchGroup>

                <SearchGroup title='Clients' icon={<Building2 size={14} />}>
                  {results?.clients.map((item) => {
                    const contact = item.contacts[0]
                    return (
                      <SearchItem
                        key={item.id}
                        title={item.name}
                        description={[
                          item.sector,
                          item.city,
                          contact
                            ? `${contact.firstName} ${contact.lastName}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        onClick={() => {
                          setView('client-detail', { id: item.id })
                          closeSearch()
                        }}
                      />
                    )
                  })}
                </SearchGroup>

                <SearchGroup title='Documents' icon={<FileText size={14} />}>
                  {results?.documents.map((item) => (
                    <SearchItem
                      key={item.id}
                      title={item.name}
                      description={[
                        item.category,
                        item.status,
                        item.case?.reference,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      onClick={() => {
                        if (item.case?.id) {
                          setView('case-detail', { id: item.case.id })
                        } else {
                          setView('documents')
                        }
                        closeSearch()
                      }}
                    />
                  ))}
                </SearchGroup>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dark mode toggle */}
      <LanguageSwitcher />
      <button
        type="button"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className='inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
        aria-label={t('common.theme')}
      >
        {mounted && theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        {!mounted && <Moon size={18} />}
      </button>

      {/* Notifications */}
      <button
        type="button"
        onClick={() => setView('notifications')}
        className='relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
        aria-label={t('common.notifications')}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <Badge className='absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white hover:bg-red-600'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </button>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className='flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-accent'>
            <Avatar className='h-7 w-7 border border-border'>
              {currentProfile?.avatarUrl && (
                <AvatarImage
                  src={currentProfile.avatarUrl}
                  alt={currentProfile.firstName}
                />
              )}
              <AvatarFallback className='bg-primary/10 text-[10px] font-semibold text-primary'>
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56'>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1'>
              <p className='text-sm font-medium'>
                {currentProfile
                  ? `${currentProfile.firstName} ${currentProfile.lastName}`
                  : t('common.user')}
              </p>
              <p className='text-xs text-muted-foreground'>
                {currentProfile?.email || 'user@igsnexus.com'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {currentProfile?.role === 'ADMIN' && (
            <>
              <DropdownMenuItem onClick={() => setView('settings')}>
                <User className='mr-2 size-4' />
                {t('common.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('settings')}>
                <Settings className='mr-2 size-4' />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('audit')}>
                <Activity className='mr-2 size-4' />
                {t('common.audit')}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className='text-destructive focus:text-destructive'
          >
            <LogOut className='mr-2 size-4' />
            {t('common.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

function SearchGroup({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  if (React.Children.count(children) === 0) return null

  return (
    <section className='py-1'>
      <div className='flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
        {icon}
        {title}
      </div>
      <div className='space-y-1'>{children}</div>
    </section>
  )
}

function SearchItem({
  title,
  description,
  onClick,
}: {
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='block w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent focus:bg-accent focus:outline-none'
    >
      <span className='block truncate text-sm font-medium text-foreground'>
        {title}
      </span>
      <span className='block truncate text-xs text-muted-foreground'>
        {description}
      </span>
    </button>
  )
}
