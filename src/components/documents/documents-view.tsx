'use client'

import { useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { DOCUMENT_CATEGORIES } from '@/lib/constants'
import { useI18n } from '@/lib/i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileUploadDropzone } from '@/components/documents/file-upload-dropzone'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Upload,
  Search,
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileCheck,
  FileQuestion,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Sparkles,
} from 'lucide-react'
import { PaginationFooter } from '@/components/shared/pagination-footer'
import { ListPageSkeleton } from '@/components/shared/list-page-skeleton'
import type { PaginationMeta } from '@/lib/pagination'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { PageHero } from '@/components/shared/page-hero'

// ─── Types ───

interface DocumentItem {
  id: string
  name: string
  category: string
  status: string
  fileSize: number | null
  createdAt: string
  case: { reference: string } | null
  fileUrl?: string
}

interface DocumentAnalysisResult {
  name: string
  category: string
  notes: string
  confidence: number
  source: 'pdf_text' | 'filename'
  caseId?: string
  caseReference?: string
  warning?: string
}

// ─── Helpers ───

function getCategoryLabel(value: string): string {
  const found = DOCUMENT_CATEGORIES.find((c) => c.value === value)
  return found ? found.label : value
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'valide':
      return <CheckCircle2 size={16} className="text-green-600" />
    case 'en_attente':
      return <Clock size={16} className="text-amber-500" />
    case 'rejete':
      return <AlertCircle size={16} className="text-red-500" />
    default:
      return <FileQuestion size={16} className="text-muted-foreground" />
  }
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    valide: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    en_attente:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    rejete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    recu: 'Reçu',
    valide: 'Validé',
    conforme: 'Conforme',
    en_attente: 'En attente',
    en_verification: 'En vérification',
    rejete: 'Rejeté',
    non_conforme: 'Non conforme',
  }
  return map[status] ?? status
}

function getDocIcon(category: string) {
  switch (category) {
    case 'bl':
    case 'awb':
      return <FileCheck size={24} className="text-primary" />
    case 'facture_commerciale':
    case 'preuve_paiement':
      return <FileSpreadsheet size={24} className="text-emerald-600" />
    case 'declaration':
      return <FileText size={24} className="text-amber-600" />
    default:
      return <File size={24} className="text-muted-foreground" />
  }
}

// ─── Document Card ───

interface DocumentCardProps {
  doc: DocumentItem
}

function DocumentCard({ doc }: DocumentCardProps) {
  const uploadedAt = new Date(doc.createdAt).toLocaleDateString('fr-FR')
  const sizeLabel =
    doc.fileSize != null
      ? doc.fileSize >= 1024 * 1024
        ? `${(doc.fileSize / (1024 * 1024)).toFixed(1)} Mo`
        : `${Math.max(1, Math.round(doc.fileSize / 1024))} Ko`
      : '—'
  const fileContent = [
    `Document: ${doc.name}`,
    `Catégorie: ${getCategoryLabel(doc.category)}`,
    `Statut: ${getStatusLabel(doc.status)}`,
    `Taille: ${sizeLabel}`,
    `Dossier: ${doc.case?.reference ?? 'Sans dossier'}`,
    `Date de chargement: ${uploadedAt}`,
  ].join('\n')
  const hasFileUrl = Boolean(doc.fileUrl && doc.fileUrl.trim())

  const openSignedDocument = async (download = false) => {
    if (hasFileUrl) {
      const response = await fetch(`/api/documents/${doc.id}/signed-url`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.signedUrl) return
      if (download) {
        const link = document.createElement('a')
        link.href = payload.signedUrl
        link.rel = 'noopener noreferrer'
        link.download = doc.name
        link.click()
      } else window.open(payload.signedUrl, '_blank', 'noopener,noreferrer')
      return
    }
    window.open(
      `data:text/plain;charset=utf-8,${encodeURIComponent(fileContent)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  const handlePreview = () => { void openSignedDocument(false) }

  const handleDownload = () => {
    if (hasFileUrl) {
      void openSignedDocument(true)
      return
    }

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${doc.name}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="group p-6 transition-all duration-200 hover:shadow-lg hover:border-primary/20">
      <CardContent className="p-0">
        <div className="mb-4 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted/50">
            {getDocIcon(doc.category)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {doc.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {sizeLabel} · {uploadedAt}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {getCategoryLabel(doc.category)}
          </Badge>
          <Badge
            variant="secondary"
            className={`text-xs ${getStatusColor(doc.status)}`}
          >
            {getStatusLabel(doc.status)}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FolderOpen size={13} className="shrink-0" />
          <span className="font-mono">{doc.case?.reference ?? 'Sans dossier'}</span>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handlePreview}
          >
            <Eye size={14} />
            Voir
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleDownload}
          >
            <Download size={14} />
            Télécharger
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───

export default function DocumentsView() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    category: '',
    caseId: '',
    notes: '',
  })

  const analyzeSelectedFile = async (file: File) => {
    setAnalyzing(true)
    setAnalysis(null)
    setCreateError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/documents/analyze', { method: 'POST', body })
      const payload = await response.json().catch(() => ({})) as DocumentAnalysisResult & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Analyse automatique indisponible')

      setAnalysis(payload)
      setForm((current) => ({
        name: payload.name || current.name,
        category: payload.category !== 'autre' ? payload.category : current.category,
        caseId: payload.caseId || current.caseId,
        notes: payload.notes
          ? current.notes && !current.notes.includes(payload.notes)
            ? `${current.notes}\n${payload.notes}`
            : payload.notes
          : current.notes,
      }))
    } catch (error) {
      setAnalysis({
        name: '',
        category: 'autre',
        notes: '',
        confidence: 0,
        source: 'filename',
        warning: error instanceof Error ? error.message : 'Analyse automatique indisponible',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const { data: cases = [] } = useQuery<Array<{ id: string; reference: string }>>({
    queryKey: ['document-cases'],
    queryFn: async () => {
      const response = await fetch('/api/cases?compact=true&pageSize=100')
      if (!response.ok) throw new Error('Impossible de charger les dossiers')
      const payload = await response.json()
      return payload.items
    },
  })

  const {
    data,
    isLoading,
    isFetching,
    isError,
  } = useQuery<{ items: DocumentItem[]; pagination: PaginationMeta; summary: { validated: number; pending: number; rejected: number } }>({
    queryKey: ['documents', categoryFilter, debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '12' })
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      const response = await fetch(`/api/documents?${params}`)
      if (!response.ok) throw new Error('Impossible de charger les documents')
      return response.json()
    },
    placeholderData: keepPreviousData,
  })
  const documents = data?.items ?? []

  if (isLoading) {
    return <ListPageSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <FileQuestion size={40} />
        <p className="text-sm">Impossible de charger les documents.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Title Row ─── */}
      <PageHero eyebrow="Espace documentaire" title={t('screen.documents')} description="Classement, conformité et suivi sécurisé des documents de transit." actions={<Button type="button" onClick={() => setCreateOpen(true)}>
          <Upload size={16} className="mr-2" />
          Charger un document
        </Button>} />

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open && createBusy) return
          setCreateOpen(open)
          if (!open && !createBusy) {
            setCreateError(null)
            setAnalysis(null)
            setAnalyzing(false)
            setForm({ name: '', category: '', caseId: '', notes: '' })
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Charger un document</DialogTitle>
            <DialogDescription>
              Ajoutez le fichier : son nom, sa catégorie, ses références et son dossier seront proposés automatiquement avant enregistrement.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label>Fichier à analyser</Label>
              <FileUploadDropzone
                caseId={form.caseId || null}
                category={form.category || 'autre'}
                documentName={form.name}
                notes={form.notes}
                autoUpload={false}
                disabled={createBusy || analyzing}
                uploadButtonLabel={analyzing ? 'Analyse en cours...' : 'Vérifier et enregistrer'}
                onFileSelected={analyzeSelectedFile}
                onUploadStart={() => {
                  setCreateBusy(true)
                  setCreateError(null)
                }}
                onUploadComplete={() => {
                  setCreateBusy(false)
                  setCreateOpen(false)
                  setAnalysis(null)
                  setForm({ name: '', category: '', caseId: '', notes: '' })
                  void queryClient.invalidateQueries({ queryKey: ['documents'] })
                }}
                onError={(message) => {
                  setCreateBusy(false)
                  setCreateError(message)
                }}
              />
              {analyzing ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                  <Sparkles className="size-4 animate-pulse" />
                  Lecture du document et recherche du dossier associé...
                </div>
              ) : analysis ? (
                <div className={`rounded-lg border px-3 py-2 text-sm ${analysis.confidence > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  <p className="flex items-center gap-2 font-medium">
                    <Sparkles className="size-4" />
                    {analysis.confidence > 0 ? `Préremplissage terminé · confiance ${analysis.confidence}%` : 'Préremplissage manuel nécessaire'}
                  </p>
                  {analysis.caseReference ? <p className="mt-1 text-xs">Dossier détecté : {analysis.caseReference}</p> : null}
                  {analysis.warning ? <p className="mt-1 text-xs">{analysis.warning}</p> : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">PDF, PNG ou JPG. Les suggestions restent modifiables avant l’enregistrement.</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="document-name">Nom du document</Label>
                <Input
                  id="document-name"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Facultatif, nom du fichier par défaut"
                  disabled={createBusy || analyzing}
                />
              </div>
              <div className="grid gap-2">
                <Label>Catégorie</Label>
                <Select
                  value={form.category || undefined}
                  onValueChange={(value) => setForm((s) => ({ ...s, category: value }))}
                  disabled={createBusy || analyzing}
                >
                  <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Dossier associé</Label>
              <Select
                value={form.caseId || undefined}
                onValueChange={(value) => setForm((s) => ({ ...s, caseId: value === 'none' ? '' : value }))}
                disabled={createBusy || analyzing}
              >
                <SelectTrigger><SelectValue placeholder="Aucun dossier sélectionné" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Document général, sans dossier</SelectItem>
                  {cases.map((item) => <SelectItem key={item.id} value={item.id}>{item.reference}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Optionnel : choisissez un dossier pour y classer automatiquement le document.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document-notes">Observations</Label>
              <Textarea
                id="document-notes"
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Informations utiles concernant ce document..."
                disabled={createBusy || analyzing}
              />
            </div>
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={createBusy || analyzing}>Annuler</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-6 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Validés</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {data?.summary.validated ?? 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Clock size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {data?.summary.pending ?? 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rejetés</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {data?.summary.rejected ?? 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Filter ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:max-w-2xl sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Nom, dossier ou mot-clé..." className="pl-9" aria-label="Rechercher un document" />
          </div>
        <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-64">
            <FolderOpen size={16} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {DOCUMENT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {data?.pagination.total ?? 0} document{(data?.pagination.total ?? 0) > 1 ? 's' : ''}
        </p>
      </div>

      {/* ─── Documents Grid ─── */}
      {documents.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText
            size={40}
            strokeWidth={1.5}
            className="mx-auto text-muted-foreground/40"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Aucun document ne correspond à votre recherche.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 [content-visibility:auto] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
      {data?.pagination ? <Card className="overflow-hidden"><PaginationFooter pagination={data.pagination} onPageChange={setPage} loading={isFetching} /></Card> : null}
    </div>
  )
}
