'use client'

import { useQuery } from '@tanstack/react-query'
import { Activity, ArrowLeft, FileClock, Hash, User } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHero } from '@/components/shared/page-hero'

type AuditItem = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  details: string | null
  profileId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

type ProfileItem = {
  id: string
  firstName: string
  lastName: string
}

export default function AuditView() {
  const setView = useAppStore((s) => s.setView)

  const { data, isLoading, isError } = useQuery<{ items: AuditItem[] }>({
    queryKey: ['audit'],
    queryFn: async () => {
      const response = await fetch('/api/audit')
      if (!response.ok) throw new Error('Impossible de charger les logs')
      return response.json()
    },
  })
  const { data: profiles = [] } = useQuery<ProfileItem[]>({
    queryKey: ['audit-profiles'],
    queryFn: async () => {
      const response = await fetch('/api/profiles')
      if (!response.ok) throw new Error('Impossible de charger les profils')
      return response.json()
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-3 h-3 w-full" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Activity className="size-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Impossible de charger l’audit</h1>
        <Button type="button" variant="outline" onClick={() => setView('dashboard')}>
          <ArrowLeft className="mr-2 size-4" />
          Retour
        </Button>
      </div>
    )
  }

  const items = data?.items ?? []
  const profileNames = new Map(
    profiles.map((profile) => [profile.id, `${profile.firstName} ${profile.lastName}`]),
  )

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Traçabilité et conformité" title="Journal d’audit" description="Consultez l’historique complet des actions sensibles réalisées sur la plateforme." actions={<Badge className="border-white/20 bg-white/10 px-3 py-2 text-white hover:bg-white/10">{items.length} entrée(s)</Badge>} />

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Aucun log d’audit disponible pour le moment.
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileClock className="size-4" />
                  {item.action}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Hash className="size-3.5" />
                    {item.entityType}
                  </span>
                  <span>{item.entityId || '—'}</span>
                  {item.profileId ? (
                    <span className="inline-flex items-center gap-1.5">
                      <User className="size-3.5" />
                      {profileNames.get(item.profileId) ?? item.profileId}
                    </span>
                  ) : null}
                </div>
                <span>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</span>
              </CardContent>
              {item.details ? (
                <div className="border-t px-6 py-3 text-sm text-muted-foreground">
                  {item.details}
                </div>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
