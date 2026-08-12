'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  FileWarning,
  FolderOpen,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import type { ViewId } from '@/lib/store'
import { cn } from '@/lib/utils'

interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  category: string | null
  isRead: boolean
  link: string | null
  createdAt: string
}

interface NotificationsPayload {
  items: NotificationItem[]
  unreadCount: number
}

function formatRelativeDate(value: string) {
  const date = new Date(value)
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60_000)

  if (diffMinutes < 1) return 'A l’instant'
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `Il y a ${diffHours} h`

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getNotificationIcon(notification: NotificationItem) {
  if (notification.category === 'paiement') return CreditCard
  if (notification.category === 'document') return FileWarning
  if (notification.category === 'incident') return AlertTriangle
  if (notification.category === 'dossier') return FolderOpen
  if (notification.type === 'succes') return CheckCircle2
  return Info
}

function getNotificationTone(notification: NotificationItem) {
  if (notification.type === 'alerte' || notification.type === 'erreur') {
    return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
  }
  if (notification.type === 'avertissement') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
  }
  if (notification.type === 'succes') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
  }
  return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} className="p-5">
          <div className="flex gap-4">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function NotificationsView() {
  const queryClient = useQueryClient()
  const setUnreadCount = useAppStore((s) => s.setUnreadCount)
  const setView = useAppStore((s) => s.setView)

  const { data, isLoading, isError } = useQuery<NotificationsPayload>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications')
      if (!response.ok) throw new Error('Erreur de chargement')
      const payload = await response.json()
      setUnreadCount(payload.unreadCount)
      return payload
    },
    staleTime: 10_000,
  })

  const markReadMutation = useMutation({
    mutationFn: async ({
      id,
      isRead,
    }: {
      id: string
      isRead: boolean
    }) => {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead }),
      })
      if (!response.ok) throw new Error('Erreur de mise à jour')
      return response.json()
    },
    onSuccess: (payload) => {
      setUnreadCount(payload.unreadCount)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications = data?.items ?? []
  const [openError, setOpenError] = React.useState('')

  const handleOpen = async (notification: NotificationItem) => {
    setOpenError('')
    if (!notification.isRead) {
      try {
        await markReadMutation.mutateAsync({ id: notification.id, isRead: true })
      } catch {
        // Opening the target should still work even if marking the item read fails.
      }
    }

    if (!notification.link) return

    if (notification.link.startsWith('http://') || notification.link.startsWith('https://')) {
      window.open(notification.link, '_blank', 'noopener,noreferrer')
      return
    }

    const normalizedLink = notification.link.replace(/^\/+/, '/')
    const caseMatch = normalizedLink.match(/\/cases?\/([^/?#]+)/)
    if (caseMatch?.[1]) {
      setView('case-detail', { id: caseMatch[1] })
      return
    }

    const path = normalizedLink.split('?')[0].split('#')[0]
    const viewFromPath: Record<string, ViewId> = {
      '/invoices': 'invoices',
      '/documents': 'documents',
      '/incidents': 'incidents',
      '/reports': 'reports',
      '/settings': 'settings',
      '/audit': 'audit',
      '/clients': 'clients',
      '/shipping-trackers': 'shipping-trackers',
      '/dashboard': 'dashboard',
    }

    if (path in viewFromPath) {
      setView(viewFromPath[path])
      return
    }

    if (normalizedLink.includes('invoices')) setView('invoices')
    else if (normalizedLink.includes('documents')) setView('documents')
    else if (normalizedLink.includes('incidents')) setView('incidents')
    else if (normalizedLink.includes('reports')) setView('reports')
    else if (normalizedLink.includes('settings')) setView('settings')
    else if (normalizedLink.includes('audit')) setView('audit')
    else if (normalizedLink.includes('clients')) setView('clients')
    else if (normalizedLink.includes('shipping-trackers')) setView('shipping-trackers')
    else setOpenError('Lien de notification non pris en charge')
  }

  if (isLoading) return <NotificationsSkeleton />

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Bell size={48} strokeWidth={1.5} />
        <h2 className="text-xl font-semibold text-foreground">
          Erreur de chargement
        </h2>
        <p className="text-sm">Impossible de charger les notifications.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            Alertes opérationnelles, documents, factures et incidents.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {data?.unreadCount ?? 0} non lue(s)
        </Badge>
      </div>

      {openError ? (
        <p className="text-sm text-destructive">{openError}</p>
      ) : null}

      {notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell
            size={42}
            strokeWidth={1.5}
            className="mx-auto text-muted-foreground/40"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Aucune notification pour le moment.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification)
            return (
              <Card
                key={notification.id}
                className={cn(
                  'p-0 transition-all hover:border-primary/30 hover:shadow-md',
                  !notification.isRead && 'border-primary/30 bg-primary/5',
                )}
              >
                <CardContent className="flex gap-4 p-5">
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-lg',
                      getNotificationTone(notification),
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {notification.category ?? notification.type}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={12} />
                        {formatRelativeDate(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpen(notification)}
                    >
                      Ouvrir
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        markReadMutation.mutate({
                          id: notification.id,
                          isRead: !notification.isRead,
                        })
                      }
                    >
                      {notification.isRead ? 'Non lu' : 'Lu'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
