'use client'

import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, BriefcaseBusiness, CircleDollarSign, FileCheck2, Loader2 } from 'lucide-react'
import { useAppStore, type ViewId } from '@/lib/store'
import { formatGNF } from '@/lib/constants'
import { Card, CardContent } from '@/components/ui/card'
import { PageHero } from '@/components/shared/page-hero'
import { cn } from '@/lib/utils'

type DashboardData = { title: string; subtitle: string; fallback: boolean; cards: Array<{ label: string; value: number; kind?: 'money'; view: ViewId; params?: Record<string, string>; tone?: string }> }

export default function RoleDashboardView() {
  const pathname = usePathname()
  const space = pathname.startsWith('/travail/') ? pathname.split('/')[2] : pathname.split('/')[1]
  const setView = useAppStore((state) => state.setView)
  const { data, isLoading, error } = useQuery<DashboardData>({ queryKey: ['role-dashboard', space], queryFn: async () => {
    const response = await fetch(`/api/role-dashboard?space=${space}`)
    if (!response.ok) throw new Error((await response.json()).error || 'Impossible de charger le tableau de bord')
    return response.json()
  }, staleTime: 30_000 })

  if (isLoading) return <div className="flex min-h-[45vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (error || !data) return <Card><CardContent className="p-8 text-center text-sm text-destructive">{error instanceof Error ? error.message : 'Données indisponibles'}</CardContent></Card>

  return <div className="space-y-6">
    <PageHero eyebrow="ESPACE MÉTIER" title={data.title} description={data.subtitle} />
    {data.fallback && <div className="flex gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="h-5 w-5 shrink-0" /><span>Aucun dossier ne vous est encore affecté. Les dossiers de votre agence sont affichés temporairement; demandez à l’administrateur de définir votre portefeuille.</span></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {data.cards.map((card, index) => <button key={card.label} type="button" onClick={() => setView(card.view, card.params)} className="text-left">
        <Card className={cn('h-full border-t-4 transition hover:-translate-y-0.5 hover:shadow-lg', card.tone === 'danger' ? 'border-t-red-500' : card.tone === 'warning' ? 'border-t-amber-500' : card.tone === 'success' ? 'border-t-emerald-500' : 'border-t-cyan-600')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{index % 3 === 0 ? <BriefcaseBusiness /> : index % 3 === 1 ? <FileCheck2 /> : <CircleDollarSign />}</div>
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</p><p className="mt-1 truncate text-xl font-bold">{card.kind === 'money' ? formatGNF(card.value) : card.value}</p></div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </button>)}
    </div>
  </div>
}
