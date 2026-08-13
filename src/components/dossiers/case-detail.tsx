'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  formatGNF,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
  CASE_TYPES,
  CASE_DIRECTIONS,
  EXPENSE_STATUSES,
  INVOICE_STATUSES,
  CUSTOMS_STATUSES,
  DOCUMENT_CATEGORIES,
  INCIDENT_TYPES,
  SEVERITY_LEVELS,
} from '@/lib/constants'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Plus,
  FileText,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Ship,
  Plane,
  Truck,
  Clock,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  User,
  FileUp,
  MessageSquare,
  Shield,
  Container,
  ChevronDown,
  CircleDot,
  XCircle,
  Eye,
  Send,
  MoreVertical,
  AlertOctagon,
  CircleCheck,
  Circle,
  X,
  ArrowRight,
  RotateCcw,
  TriangleAlert,
  FileCheck2,
  Ban,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getIncoterm } from '@/lib/customs/incoterms'
import { FileUploadDropzone } from '@/components/documents/file-upload-dropzone'

// ─── Types ───────────────────────────────────────────────

interface CaseData {
  id: string
  reference: string
  type: string
  direction: string
  status: string
  priority: string
  description: string | null
  merchandise: string | null
  weightKg: number | null
  volumeM3: number | null
  packageCount: number | null
  declaredValue: number | null
  declaredCurrency: string
  incoterm: string | null
  supplier: string | null
  shipper: string | null
  consignee: string | null
  originPort: string | null
  destinationPort: string | null
  eta: string | null
  etd: string | null
  ata: string | null
  estimatedRevenue: number | null
  estimatedCost: number | null
  currency: string
  gucegRef: string | null
  sydoniaRef: string | null
  riskLevel: string
  notes: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
  client: { id: string; name: string; contacts?: { firstName: string; lastName: string; email?: string | null; isPrimary: boolean }[] }
  serviceChef: { id: string; firstName: string; lastName: string; role: string; avatarUrl?: string | null }
  commercial: { id: string; firstName: string; lastName: string; role: string } | null
  statusHistory: {
    id: string
    fromStatus: string | null
    toStatus: string
    comment: string | null
    profileId: string
    createdAt: string
    profile: { id: string; firstName: string; lastName: string; role: string } | null
  }[]
  milestones: {
    id: string
    name: string
    type: string
    status: string
    plannedDate: string | null
    actualDate: string | null
    description: string | null
    createdAt: string
    updatedAt: string
  }[]
  checklists: {
    id: string
    label: string
    category: string | null
    isRequired: boolean
    isCompleted: boolean
    completedAt: string | null
    completedById: string | null
    createdAt: string
    updatedAt: string
  }[]
  assignees: {
    id: string
    profileId: string
    role: string
    assignedAt: string
    profile: { id: string; firstName: string; lastName: string; role: string; avatarUrl?: string | null }
  }[]
  documents: {
    id: string
    name: string
    category: string
    fileType: string | null
    fileSize: number | null
    fileUrl: string | null
    status: string
    version: number
    expiresAt: string | null
    uploadedById: string | null
    sharedWithClient: boolean
    notes: string | null
    createdAt: string
    updatedAt: string
  }[]
  comments: {
    id: string
    content: string
    isInternal: boolean
    createdAt: string
    updatedAt: string
    profile: { id: string; firstName: string; lastName: string; avatarUrl?: string | null }
  }[]
  shipments: {
    id: string
    vesselName: string | null
    voyageNumber: string | null
    blNumber: string | null
    shippingLine: string | null
    loadingPort: string | null
    dischargePort: string | null
    bookingNumber: string | null
    terminal: string | null
    freeTimeEndsAt: string | null
    containerReturnDeadline: string | null
    terminalFees: number | null
    demurrageFees: number | null
    createdAt: string
    updatedAt: string
    containers: {
      id: string
      containerNumber: string | null
      size: string | null
      type: string | null
      status: string
      sealNumber: string | null
      grossWeight: number | null
      createdAt: string
      updatedAt: string
    }[]
  }[]
  flights: {
    id: string
    awbNumber: string | null
    airline: string | null
    flightNumber: string | null
    departureAirport: string | null
    arrivalAirport: string | null
    departureTime: string | null
    arrivalTime: string | null
    grossWeightKg: number | null
    netWeightKg: number | null
    packageCount: number | null
    natureOfGoods: string | null
    createdAt: string
    updatedAt: string
  }[]
  transportMissions: {
    id: string
    type: string
    status: string
    vehiclePlate: string | null
    driverName: string | null
    driverPhone: string | null
    transporter: string | null
    pickupAddress: string | null
    deliveryAddress: string | null
    scheduledDate: string | null
    completedDate: string | null
    deliveryNote: string | null
    notes: string | null
    createdAt: string
    updatedAt: string
  }[]
  customsDeclarations: {
    id: string
    regime: string | null
    declarationType: string | null
    gucegRef: string | null
    sydoniaRef: string | null
    status: string
    declarationNumber: string | null
    submittedAt: string | null
    clearedAt: string | null
    releaseNoteNumber: string | null
    notes: string | null
    hsCode: string | null
    hsDescription: string | null
    tariffRate: number | null
    countryOfOrigin: string | null
    countryOfDestination: string | null
    customsValue: number | null
    customsValueCurrency: string
    dutyAmount: number | null
    vatAmount: number | null
    integrationMode: string
    createdAt: string
    updatedAt: string
    events: {
      id: string
      eventType: string
      description: string | null
      performedById: string | null
      performedAt: string
    }[]
  }[]
  expenseRequests: {
    id: string
    amount: number
    currency: string
    amountGnf: number | null
    description: string
    vendor: string | null
    vendorType: string | null
    category: string | null
    status: string
    rejectionReason: string | null
    approvedAt: string | null
    paidAt: string | null
    createdAt: string
    updatedAt: string
    requester: { id: string; firstName: string; lastName: string }
  }[]
  invoices: {
    id: string
    invoiceNumber: string
    status: string
    issuedAt: string | null
    dueDate: string | null
    paidAmount: number
    totalAmount: number
    currency: string
    taxRate: number
    taxAmount: number
    netAmount: number
    notes: string | null
    createdAt: string
    updatedAt: string
    items: {
      id: string
      description: string
      quantity: number
      unitPrice: number
      total: number
      createdAt: string
    }[]
    payments: {
      id: string
      amount: number
      currency: string
      method: string | null
      reference: string | null
      status: string
      confirmedAt: string | null
      createdAt: string
      updatedAt: string
    }[]
  }[]
  incidents: {
    id: string
    title: string
    description: string
    type: string
    severity: string
    status: string
    assignedToId: string | null
    resolvedAt: string | null
    resolution: string | null
    photoUrl: string | null
    createdAt: string
    updatedAt: string
  }[]
}

// ─── Lifecycle Stages ────────────────────────────────────

const LIFECYCLE_STAGES = [
  { key: 'brouillon', label: 'Brouillon' },
  { key: 'devis', label: 'Devis' },
  { key: 'ouvert', label: 'Ouvert' },
  { key: 'documents', label: 'Documents' },
  { key: 'transit', label: 'Transit' },
  { key: 'arrive', label: 'Arrivé' },
  { key: 'dedouanement', label: 'Dédouanement' },
  { key: 'livraison', label: 'Livraison' },
  { key: 'facturation', label: 'Facturation' },
  { key: 'cloture', label: 'Clôturé' },
] as const

// Map current case status to a lifecycle stage index
function getStatusStageIndex(status: string): number {
  const map: Record<string, number> = {
    brouillon: 0,
    demande_recue: 0,
    devis_en_preparation: 1,
    devis_envoye: 1,
    commande_confirme: 1,
    dossier_ouvert: 2,
    documents_en_attente: 3,
    documents_conformes: 3,
    en_preparation: 3,
    en_transit: 4,
    arrive_au_port: 5,
    en_dedouanement: 6,
    en_attente_paiement: 6,
    mainlevee_obtenue: 6,
    sortie_autorise: 6,
    en_livraison: 7,
    livre: 7,
    facturation_en_cours: 8,
    cloture: 9,
    suspendu: -1,
    annule: -1,
  }
  return map[status] ?? 0
}

// ─── Helper: status icon for timeline ───────────────────

function getEventTypeIcon(eventType: string) {
  switch (eventType) {
    case 'status_change':
      return <CircleDot className="size-4 text-blue-500" />
    case 'comment':
      return <MessageSquare className="size-4 text-emerald-500" />
    case 'milestone':
      return <CheckCircle2 className="size-4 text-amber-500" />
    case 'document':
      return <FileText className="size-4 text-purple-500" />
    case 'incident':
      return <AlertTriangle className="size-4 text-red-500" />
    default:
      return <Circle className="size-4 text-muted-foreground" />
  }
}

// ─── Loading Skeleton ────────────────────────────────────

function CaseDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-7 w-36 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      {/* Progress bar skeleton */}
      <Skeleton className="h-14 w-full rounded-lg" />
      {/* Main area skeleton */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────

export default function CaseDetail() {
  const caseId = useAppStore((s) => s.viewParams.id)
  const setView = useAppStore((s) => s.setView)
  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateText, setUpdateText] = useState('')
  const [updateBusy, setUpdateBusy] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('apercu')
  const [closeOpen, setCloseOpen] = useState(false)
  const [closeBusy, setCloseBusy] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [documentOpen, setDocumentOpen] = useState(false)
  const [documentBusy, setDocumentBusy] = useState(false)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [documentForm, setDocumentForm] = useState({
    name: '',
    category: 'autre',
    notes: '',
  })
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [incidentBusy, setIncidentBusy] = useState(false)
  const [incidentError, setIncidentError] = useState<string | null>(null)
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    description: '',
    type: 'autre',
    severity: 'moyen',
  })
  const [customsOpen, setCustomsOpen] = useState(false)
  const [customsBusy, setCustomsBusy] = useState(false)
  const [customsError, setCustomsError] = useState<string | null>(null)
  const [customsForm, setCustomsForm] = useState({
    regime: 'import',
    declarationType: '',
    hsCode: '',
    hsDescription: '',
    tariffRate: '',
    countryOfOrigin: '',
    countryOfDestination: 'Guinée',
    customsValue: '',
    customsValueCurrency: 'GNF',
  })

  const {
    data: caseData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CaseData>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Erreur réseau' }))
        throw new Error(body.error || `Erreur ${res.status}`)
      }
      return res.json()
    },
    enabled: !!caseId,
    refetchOnWindowFocus: false,
  })

  // ─── Error State ────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
          <XCircle className="size-8 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Impossible de charger le dossier
        </h2>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {error?.message || 'Une erreur inattendue est survenue.'}
        </p>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          <RotateCcw className="mr-2 size-4" />
          Réessayer
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => setView('cases')}
        >
          <ArrowLeft className="mr-2 size-4" />
          Retour à la liste
        </Button>
      </div>
    )
  }

  // ─── Loading State ──────────────────────────────────
  if (isLoading || !caseData) {
    return <CaseDetailSkeleton />
  }

  const c = caseData
  const currentStageIdx = getStatusStageIndex(c.status)
  const typeLabel = CASE_TYPES.find((t) => t.value === c.type)?.label ?? c.type
  const dirLabel = CASE_DIRECTIONS.find((d) => d.value === c.direction)?.label ?? c.direction
  const primaryContact = c.client.contacts?.find((contact) => contact.isPrimary)
  const clientEmail = primaryContact?.email || ''
  const isBlocked = c.status === 'suspendu'
  const isOverdue = c.eta && !c.ata && new Date(c.eta) < new Date()
  const estimatedMargin =
    c.estimatedRevenue != null && c.estimatedCost != null
      ? c.estimatedRevenue - c.estimatedCost
      : null
  const checklistCompleted = c.checklists.filter((ch) => ch.isCompleted).length
  const checklistTotal = c.checklists.length

  // ─── Build unified timeline events ───────────────────
  const timelineEvents = [
    // Status changes
    ...c.statusHistory.map((sh) => ({
      id: `status-${sh.id}`,
      type: 'status_change' as const,
      description: sh.comment || `Statut changé vers « ${getStatusLabel(sh.toStatus)} »`,
      author: sh.profile ? `${sh.profile.firstName} ${sh.profile.lastName}` : 'Système',
      timestamp: sh.createdAt,
      detail: getStatusLabel(sh.toStatus),
    })),
    // Comments
    ...c.comments.map((cm) => ({
      id: `comment-${cm.id}`,
      type: 'comment' as const,
      description: cm.content,
      author: `${cm.profile.firstName} ${cm.profile.lastName}`,
      timestamp: cm.createdAt,
      detail: cm.isInternal ? 'Interne' : 'Client',
    })),
    // Milestones (only reached ones)
    ...c.milestones
      .filter((m) => m.actualDate)
      .map((m) => ({
        id: `milestone-${m.id}`,
        type: 'milestone' as const,
        description: `Jalon atteint : ${m.name}`,
        author: 'Système',
        timestamp: m.actualDate!,
        detail: m.name,
      })),
    // Sort by date desc
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // ─── Helper: type icon ──────────────────────────────
  const TypeIcon = c.type === 'maritime' ? Ship : c.type === 'aerien' ? Plane : c.type === 'terrestre' ? Truck : Container

  // ─── Helper: expense status label/color ─────────────
  function getExpenseStatusLabel(s: string) {
    return EXPENSE_STATUSES.find((e) => e.value === s)?.label ?? s
  }
  function getExpenseStatusColor(s: string): string {
    const map: Record<string, string> = {
      cree: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      soumis: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
      en_validation: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      approuve: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      paye: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
      justifie: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      rapproche: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      rejete: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    }
    return map[s] ?? 'bg-gray-100 text-gray-700'
  }

  function getInvoiceStatusLabel(s: string) {
    return INVOICE_STATUSES.find((i) => i.value === s)?.label ?? s
  }
  function getInvoiceStatusColor(s: string): string {
    const map: Record<string, string> = {
      brouillon: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      emise: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
      envoyee: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      payee: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      partiellement_payee: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      echue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      annulee: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    }
    return map[s] ?? 'bg-gray-100 text-gray-700'
  }

  function getCustomsStatusLabel(s: string) {
    return CUSTOMS_STATUSES.find((cs) => cs.value === s)?.label ?? s
  }
  function getCustomsStatusColor(s: string): string {
    const map: Record<string, string> = {
      preparation: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      declare_preparee: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
      deposee: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      circuit: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      controle: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      paiement: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      mainlevee: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      rejet: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    }
    return map[s] ?? 'bg-gray-100 text-gray-700'
  }

  function getDocStatusLabel(s: string): string {
    const map: Record<string, string> = {
      recu: 'Reçu',
      en_verification: 'En vérification',
      conforme: 'Conforme',
      non_conforme: 'Non conforme',
      expire: 'Expiré',
      rejete: 'Rejeté',
    }
    return map[s] ?? s
  }
  function getDocStatusColor(s: string): string {
    const map: Record<string, string> = {
      recu: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      en_verification: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      conforme: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      non_conforme: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      expire: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      rejete: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    }
    return map[s] ?? 'bg-gray-100 text-gray-700'
  }

  function getDocCategoryLabel(cat: string): string {
    return DOCUMENT_CATEGORIES.find((d) => d.value === cat)?.label ?? cat
  }

  function getSeverityColor(s: string): string {
    return SEVERITY_LEVELS.find((sl) => sl.value === s)?.color ?? 'bg-gray-100 text-gray-700'
  }
  function getSeverityLabel(s: string): string {
    return SEVERITY_LEVELS.find((sl) => sl.value === s)?.label ?? s
  }
  function getIncidentStatusLabel(s: string): string {
    const map: Record<string, string> = {
      ouvert: 'Ouvert',
      en_cours: 'En cours',
      resolu: 'Résolu',
      clôturé: 'Clôturé',
    }
    return map[s] ?? s
  }
  function getIncidentStatusColor(s: string): string {
    const map: Record<string, string> = {
      ouvert: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      en_cours: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      resolu: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'clôturé': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    }
    return map[s] ?? 'bg-gray-100 text-gray-700'
  }
  function getTransportStatusLabel(s: string): string {
    const map: Record<string, string> = {
      assigne: 'Assigné',
      en_route: 'En route',
      arrive: 'Arrivé',
      charge: 'Chargé',
      en_transit: 'En transit',
      livre: 'Livré',
      incident: 'Incident',
    }
    return map[s] ?? s
  }
  function getTransportStatusColor(s: string): string {
    const map: Record<string, string> = {
      assigne: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      en_route: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
      arrive: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      charge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      en_transit: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      livre: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      incident: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    }
    return map[s] ?? 'bg-gray-100 text-gray-700'
  }
  function getContainerStatusLabel(s: string): string {
    const map: Record<string, string> = {
      en_transit: 'En transit',
      arrive: 'Arrivé',
      decharge: 'Déchargé',
      vide: 'Vide',
      retourne: 'Retourné',
    }
    return map[s] ?? s
  }

  const handleSubmitUpdate = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setUpdateBusy(true)
    setUpdateError(null)
    try {
      const response = await fetch(`/api/cases/${caseId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updateText }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Mise à jour impossible')
      }
      setUpdateText('')
      setUpdateOpen(false)
      await refetch()
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setUpdateBusy(false)
    }
  }

  const handleCreateCustoms = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCustomsBusy(true)
    setCustomsError(null)
    try {
      const response = await fetch('/api/customs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customsForm,
          caseId,
          tariffRate: customsForm.tariffRate ? Number(customsForm.tariffRate) : null,
          customsValue: customsForm.customsValue ? Number(customsForm.customsValue) : null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Création impossible')
      setCustomsOpen(false)
      setCustomsForm({ regime: 'import', declarationType: '', hsCode: '', hsDescription: '', tariffRate: '', countryOfOrigin: '', countryOfDestination: 'Guinée', customsValue: '', customsValueCurrency: 'GNF' })
      await refetch()
    } catch (error) {
      setCustomsError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setCustomsBusy(false)
    }
  }

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ─── HEADER ──────────────────────────────────── */}
      <div>
        {/* Top row: back + ref */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-ml-2"
            onClick={() => setView('cases')}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <TypeIcon className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {c.reference}
            </h1>
          </div>
        </div>

        {/* Badges + meta */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-11">
          <Badge className={cn('px-3 py-1 text-sm font-semibold', getStatusColor(c.status))}>
            {getStatusLabel(c.status)}
          </Badge>
          <Badge className={cn('px-2.5 py-0.5 text-xs', getPriorityColor(c.priority))}>
            {getPriorityLabel(c.priority)}
          </Badge>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <span className="text-sm text-muted-foreground">
            <User className="mr-1 inline size-3.5" />
            {c.client.name}
          </span>
          <span className="text-sm text-muted-foreground">
            <Shield className="mr-1 inline size-3.5" />
            {c.serviceChef.firstName} {c.serviceChef.lastName}
          </span>
          {c.eta && (
            <span className="text-sm text-muted-foreground">
              <Calendar className="mr-1 inline size-3.5" />
              ETA {formatDate(c.eta)}
            </span>
          )}
          {c.ata && (
            <span className="text-sm text-muted-foreground">
              <CheckCircle2 className="mr-1 inline size-3.5 text-green-500" />
              ATA {formatDate(c.ata)}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2 pl-11">
          <Button size="sm" onClick={() => setUpdateOpen(true)} type="button">
            <Plus className="mr-1.5 size-4" />
            Ajouter mise à jour
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDocumentOpen(true)} type="button">
            <FileUp className="mr-1.5 size-4" />
            Joindre document
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIncidentOpen(true)} type="button">
            <AlertTriangle className="mr-1.5 size-4" />
            Signaler incident
          </Button>
          <Button size="sm" variant="outline" onClick={() => setActiveTab('timeline')} type="button">
            <Bell className="mr-1.5 size-4" />
            Notifier client
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" type="button">
                <MoreVertical className="mr-1.5 size-4" />
                Actions
                <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Actions rapides</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveTab('apercu')}>
                <Eye className="mr-2 size-4" />
                Voir le résumé
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (clientEmail) {
                    const subject = encodeURIComponent(`Suivi dossier ${c.reference}`)
                    const body = encodeURIComponent(
                      `Bonjour ${primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : c.client.name},\n\nJe vous contacte au sujet du dossier ${c.reference}.\n\nCordialement,`,
                    )
                    window.location.href = `mailto:${clientEmail}?subject=${subject}&body=${body}`
                    return
                  }
                  setActiveTab('timeline')
                }}
              >
                <Send className="mr-2 size-4" />
                Envoyer par email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('documents')}>
                <FileCheck2 className="mr-2 size-4" />
                Marquer documents conformes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCloseOpen(true)}>
                <Ban className="mr-2 size-4 text-red-500" />
                <span className="text-red-600">Clôturer le dossier</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter une mise à jour</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitUpdate}>
            <div className="space-y-2">
              <Textarea
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="Décris l’avancement, un changement de statut ou une note opérationnelle..."
                className="min-h-32"
              />
            </div>
            {updateError ? <p className="text-sm text-destructive">{updateError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUpdateOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={updateBusy || !updateText.trim()}>
                {updateBusy ? 'Ajout...' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={documentOpen}
        onOpenChange={(open) => {
          setDocumentOpen(open)
          if (!open) {
            setDocumentError(null)
            setDocumentBusy(false)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Joindre un document</DialogTitle>
            <DialogDescription>
              Ajoute un document directement à ce dossier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="case-document-name">Nom du document</Label>
                <Input
                  id="case-document-name"
                  value={documentForm.name}
                  onChange={(e) => setDocumentForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Facultatif, nom du fichier par défaut"
                  disabled={documentBusy}
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={documentForm.category}
                  onValueChange={(value) => setDocumentForm((s) => ({ ...s, category: value }))}
                  disabled={documentBusy}
                >
                  <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="case-document-notes">Observations</Label>
              <Textarea
                id="case-document-notes"
                value={documentForm.notes}
                onChange={(e) => setDocumentForm((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Informations utiles concernant ce document..."
                disabled={documentBusy}
              />
            </div>
            <div className="space-y-2">
              <Label>Fichier</Label>
              <FileUploadDropzone
                caseId={caseId}
                category={documentForm.category}
                documentName={documentForm.name}
                notes={documentForm.notes}
                autoUpload={false}
                disabled={documentBusy}
                uploadButtonLabel="Joindre au dossier"
                onUploadStart={() => {
                  setDocumentBusy(true)
                  setDocumentError(null)
                }}
                onUploadComplete={() => {
                  setDocumentBusy(false)
                  setDocumentOpen(false)
                  setDocumentForm({ name: '', category: 'autre', notes: '' })
                  void refetch()
                }}
                onError={(message) => {
                  setDocumentBusy(false)
                  setDocumentError(message)
                }}
              />
            </div>
            {documentError ? <p className="text-sm text-destructive">{documentError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDocumentOpen(false)} disabled={documentBusy}>
                Annuler
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={incidentOpen}
        onOpenChange={(open) => {
          setIncidentOpen(open)
          if (!open) {
            setIncidentError(null)
            setIncidentBusy(false)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Signaler un incident</DialogTitle>
            <DialogDescription>
              Crée un incident lié à ce dossier sans quitter l’écran.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              setIncidentBusy(true)
              setIncidentError(null)
              try {
                const response = await fetch('/api/incidents', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...incidentForm,
                    caseId,
                  }),
                })
                const payload = await response.json()
                if (!response.ok) {
                  throw new Error(payload.error || 'Création impossible')
                }
                setIncidentOpen(false)
                setIncidentForm({ title: '', description: '', type: 'autre', severity: 'moyen' })
                setActiveTab('incidents')
                await refetch()
              } catch (error) {
                setIncidentError(error instanceof Error ? error.message : 'Erreur inconnue')
              } finally {
                setIncidentBusy(false)
              }
            }}
          >
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={incidentForm.title} onChange={(e) => setIncidentForm((s) => ({ ...s, title: e.target.value }))} placeholder="Incident douanier, retard, casse..." />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={incidentForm.description} onChange={(e) => setIncidentForm((s) => ({ ...s, description: e.target.value }))} placeholder="Décris le problème..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={incidentForm.type} onValueChange={(value) => setIncidentForm((s) => ({ ...s, type: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sévérité</Label>
                <Select value={incidentForm.severity} onValueChange={(value) => setIncidentForm((s) => ({ ...s, severity: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {incidentError ? <p className="text-sm text-destructive">{incidentError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIncidentOpen(false)} disabled={incidentBusy}>
                Annuler
              </Button>
              <Button type="submit" disabled={incidentBusy || !incidentForm.title.trim() || !incidentForm.description.trim()}>
                {incidentBusy ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={closeOpen}
        onOpenChange={(open) => {
          setCloseOpen(open)
          if (!open) {
            setCloseError(null)
            setCloseBusy(false)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Clôturer le dossier</DialogTitle>
            <DialogDescription>
              Cette action ferme le dossier et marque le statut comme clôturé.
            </DialogDescription>
          </DialogHeader>
          {closeError ? <p className="text-sm text-destructive">{closeError}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCloseOpen(false)}
              disabled={closeBusy}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={closeBusy}
              onClick={async () => {
                setCloseBusy(true)
                setCloseError(null)
                try {
                  const response = await fetch(`/api/cases/${caseId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'cloture' }),
                  })
                  const payload = await response.json()
                  if (!response.ok) {
                    throw new Error(payload.error || 'Clôture impossible')
                  }
                  setCloseOpen(false)
                  await refetch()
                } catch (error) {
                  setCloseError(error instanceof Error ? error.message : 'Erreur inconnue')
                } finally {
                  setCloseBusy(false)
                }
              }}
            >
              {closeBusy ? 'Clôture...' : 'Clôturer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={customsOpen} onOpenChange={(open) => { setCustomsOpen(open); if (!open) setCustomsError(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer une déclaration douanière</DialogTitle>
            <DialogDescription>Renseignez les éléments nécessaires au calcul prévisionnel des droits et taxes.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateCustoms}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Régime</Label><Select value={customsForm.regime} onValueChange={(value) => setCustomsForm((state) => ({ ...state, regime: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="import">Import</SelectItem><SelectItem value="export">Export</SelectItem><SelectItem value="transit">Transit</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Type de déclaration</Label><Input value={customsForm.declarationType} onChange={(event) => setCustomsForm((state) => ({ ...state, declarationType: event.target.value }))} placeholder="Importation définitive..." /></div>
              <div className="space-y-2"><Label>Code HS</Label><Input value={customsForm.hsCode} onChange={(event) => setCustomsForm((state) => ({ ...state, hsCode: event.target.value.replace(/\D/g, '') }))} placeholder="Ex. 8703" maxLength={10} /></div>
              <div className="space-y-2"><Label>Description HS</Label><Input value={customsForm.hsDescription} onChange={(event) => setCustomsForm((state) => ({ ...state, hsDescription: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Pays d’origine</Label><Input value={customsForm.countryOfOrigin} onChange={(event) => setCustomsForm((state) => ({ ...state, countryOfOrigin: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Pays de destination</Label><Input value={customsForm.countryOfDestination} onChange={(event) => setCustomsForm((state) => ({ ...state, countryOfDestination: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Valeur douanière</Label><Input type="number" min="0" value={customsForm.customsValue} onChange={(event) => setCustomsForm((state) => ({ ...state, customsValue: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Taux de droit (%)</Label><Input type="number" min="0" max="100" step="0.01" value={customsForm.tariffRate} onChange={(event) => setCustomsForm((state) => ({ ...state, tariffRate: event.target.value }))} /></div>
            </div>
            {customsError ? <p className="text-sm text-destructive">{customsError}</p> : null}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setCustomsOpen(false)} disabled={customsBusy}>Annuler</Button><Button type="submit" disabled={customsBusy}>{customsBusy ? 'Création...' : 'Créer la déclaration'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── PROGRESS BAR ────────────────────────────── */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between overflow-x-auto pb-1">
          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isCompleted = isBlocked || isOverdue ? false : idx < currentStageIdx
            const isCurrent = idx === currentStageIdx && !isBlocked
            const isFuture = idx > currentStageIdx && !isBlocked
            const isBlockedOrOverdue = isBlocked || isOverdue

            return (
              <div key={stage.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
                  <div
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full border-2 transition-all',
                      isCompleted &&
                        'border-emerald-500 bg-emerald-500 text-white',
                      isCurrent &&
                        'border-amber-500 bg-amber-500/10 ring-4 ring-amber-500/20',
                      isCurrent &&
                        'text-amber-600 dark:text-amber-400',
                      isFuture &&
                        'border-muted-foreground/30 bg-muted text-muted-foreground/50',
                      isBlockedOrOverdue && idx > 0 &&
                        'border-muted-foreground/20 bg-muted text-muted-foreground/40'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-4" />
                    ) : isCurrent ? (
                      <CircleDot className="size-4" />
                    ) : (
                      <Circle className="size-3" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-medium leading-tight text-center',
                      isCompleted && 'text-emerald-600 dark:text-emerald-400',
                      isCurrent &&
                        'font-semibold text-amber-600 dark:text-amber-400',
                      (isFuture || isBlockedOrOverdue) &&
                        idx > 0 &&
                        'text-muted-foreground/60'
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
                {idx < LIFECYCLE_STAGES.length - 1 && (
                  <div
                    className={cn(
                      'mx-1 h-0.5 w-6 sm:w-8 md:w-10 transition-colors',
                      idx < currentStageIdx && !isBlocked
                        ? 'bg-emerald-400'
                        : 'bg-muted-foreground/20'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
        {isBlocked && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-red-50 px-3 py-1.5 dark:bg-red-900/20">
            <Ban className="size-4 text-red-500" />
            <span className="text-xs font-medium text-red-700 dark:text-red-400">
              Dossier suspendu / bloqué — progression mise en pause
            </span>
          </div>
        )}
        {isOverdue && !isBlocked && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 dark:bg-amber-900/20">
            <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              ETA dépassé le {formatDate(c.eta!)} — le dossier est en retard
            </span>
          </div>
        )}
      </div>

      {/* ─── MAIN CONTENT: TABS + SIDEBAR ────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ─── TABS ──────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="apercu" className="text-sm">
              Aperçu
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-sm">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-sm">
              Documents
            </TabsTrigger>
            <TabsTrigger value="douane" className="text-sm">
              Douane
            </TabsTrigger>
            <TabsTrigger value="transport" className="text-sm">
              Transport
            </TabsTrigger>
            <TabsTrigger value="debours" className="text-sm">
              Débours
            </TabsTrigger>
            <TabsTrigger value="facturation" className="text-sm">
              Facturation
            </TabsTrigger>
            <TabsTrigger value="incidents" className="text-sm">
              Incidents
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: APERÇU ──────────────────────────── */}
          <TabsContent value="apercu" className="space-y-6">
            {/* Info cards grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Card 1: Info dossier */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Package className="size-4 text-muted-foreground" />
                    Informations dossier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <InfoRow label="Type" value={typeLabel} />
                    <InfoRow label="Direction" value={dirLabel} />
                    <InfoRow
                      label="Incoterm"
                      value={c.incoterm ? `${c.incoterm} · ${getIncoterm(c.incoterm)?.label ?? 'Référentiel 2020'}` : '—'}
                    />
                    <InfoRow label="Marchandise" value={c.merchandise || '—'} />
                    <InfoRow
                      label="Poids"
                      value={c.weightKg ? `${c.weightKg.toLocaleString('fr-FR')} kg` : '—'}
                    />
                    <InfoRow
                      label="Volume"
                      value={c.volumeM3 ? `${c.volumeM3} m³` : '—'}
                    />
                    <InfoRow
                      label="Colis"
                      value={c.packageCount ? String(c.packageCount) : '—'}
                    />
                    <InfoRow
                      label="Valeur"
                      value={
                        c.declaredValue
                          ? `${c.declaredValue.toLocaleString('fr-FR')} ${c.declaredCurrency}`
                          : '—'
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Transport */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="size-4 text-muted-foreground" />
                    Transport
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <InfoRow label="Origine" value={c.originPort || '—'} />
                    <InfoRow label="Destination" value={c.destinationPort || '—'} />
                    <InfoRow label="Fournisseur" value={c.supplier || '—'} />
                    <InfoRow label="Expéditeur" value={c.shipper || '—'} />
                    <InfoRow label="Destinataire" value={c.consignee || '—'} />
                    <InfoRow
                      label="Fret"
                      value={
                        c.flights[0]?.airline || c.shipments[0]?.shippingLine || '—'
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Dates clés */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Calendar className="size-4 text-muted-foreground" />
                    Dates clés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <InfoRow label="ETD" value={formatDate(c.etd || '')} />
                    <InfoRow label="ETA" value={formatDate(c.eta || '')} />
                    <InfoRow label="ATA" value={formatDate(c.ata || '')} />
                    <InfoRow
                      label="Créé le"
                      value={formatDate(c.createdAt)}
                    />
                    <InfoRow
                      label="MAJ le"
                      value={formatDate(c.updatedAt)}
                    />
                    {c.closedAt && (
                      <InfoRow label="Clôturé le" value={formatDate(c.closedAt)} />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Financier */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <DollarSign className="size-4 text-muted-foreground" />
                    Financier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <InfoRow
                      label="Revenu estimé"
                      value={
                        c.estimatedRevenue
                          ? formatGNF(c.estimatedRevenue)
                          : '—'
                      }
                      valueClassName={c.estimatedRevenue ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}
                    />
                    <InfoRow
                      label="Coût estimé"
                      value={
                        c.estimatedCost
                          ? formatGNF(c.estimatedCost)
                          : '—'
                      }
                      valueClassName={c.estimatedCost ? 'font-semibold text-red-600 dark:text-red-400' : ''}
                    />
                    <InfoRow
                      label="Marge estimée"
                      value={
                        estimatedMargin != null
                          ? formatGNF(estimatedMargin)
                          : '—'
                      }
                      valueClassName={
                        estimatedMargin != null && estimatedMargin > 0
                          ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                          : estimatedMargin != null && estimatedMargin < 0
                            ? 'font-semibold text-red-600 dark:text-red-400'
                            : ''
                      }
                    />
                    <InfoRow label="Devise" value={c.currency} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity timeline (recent) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="size-4 text-muted-foreground" />
                  Activité récente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timelineEvents.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Aucune activité enregistrée.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {timelineEvents.slice(0, 6).map((event) => (
                      <div key={event.id} className="flex gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          {getEventTypeIcon(event.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug text-foreground">
                            {event.description}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{event.author}</span>
                            <span>·</span>
                            <span>{formatDateTime(event.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: TIMELINE ────────────────────────── */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="size-4 text-muted-foreground" />
                  Historique complet
                </CardTitle>
                <CardDescription>
                  Tous les événements du dossier classés par date
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timelineEvents.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Aucun événement enregistré.
                  </p>
                ) : (
                  <div className="relative space-y-0">
                    {timelineEvents.map((event, idx) => (
                      <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                        {/* Timeline line */}
                        <div className="relative flex flex-col items-center">
                          <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full border bg-background">
                            {getEventTypeIcon(event.type)}
                          </div>
                          {idx < timelineEvents.length - 1 && (
                            <div className="w-px flex-1 bg-border" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="text-sm text-foreground">
                            {event.description}
                          </p>
                          {event.detail && (
                            <Badge
                              variant="outline"
                              className="mt-1.5 text-[10px]"
                            >
                              {event.detail}
                            </Badge>
                          )}
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="size-3" />
                            <span>{event.author}</span>
                            <span>·</span>
                            <span>{formatDateTime(event.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: DOCUMENTS ──────────────────────── */}
          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="size-4 text-muted-foreground" />
                    Documents
                    <Badge variant="secondary" className="ml-1">
                      {c.documents.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Documents attachés au dossier
                  </CardDescription>
                </div>
                <Button type="button" size="sm" onClick={() => setView('documents')}>
                  <FileUp className="mr-1.5 size-4" />
                  Téléverser
                </Button>
              </CardHeader>
              <CardContent>
                {c.documents.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <FileText className="size-6 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-medium">Aucun document</p>
                    <p className="text-xs">
                      Téléversez le premier document pour ce dossier.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Catégorie</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-center">Version</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {c.documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="size-4 text-muted-foreground" />
                                {doc.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {getDocCategoryLabel(doc.category)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  'text-[10px] px-1.5 py-0',
                                  getDocStatusColor(doc.status)
                                )}
                              >
                                {getDocStatusLabel(doc.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">v{doc.version}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(doc.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: DOUANE ──────────────────────────── */}
          <TabsContent value="douane">
            {c.customsDeclarations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <Shield className="size-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium">Aucune déclaration douanière</p>
                  <p className="text-xs text-center">
                    Les déclarations en douane apparaîtront ici une fois créées.
                  </p>
                  <Button type="button" size="sm" onClick={() => setCustomsOpen(true)}>
                    <Plus className="mr-2 size-4" /> Créer une déclaration
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button type="button" size="sm" onClick={() => setCustomsOpen(true)}>
                    <Plus className="mr-2 size-4" /> Nouvelle déclaration
                  </Button>
                </div>
                {c.customsDeclarations.map((cd) => (
                  <Card key={cd.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                          <Shield className="size-4 text-muted-foreground" />
                          Déclaration en douane
                        </CardTitle>
                        <Badge
                          className={cn(
                            'text-xs',
                            getCustomsStatusColor(cd.status)
                          )}
                        >
                          {getCustomsStatusLabel(cd.status)}
                        </Badge>
                        <Badge className="bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                          Manuel
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Declaration info grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                        <InfoRow label="Régime" value={cd.regime || '—'} />
                        <InfoRow label="Type" value={cd.declarationType || '—'} />
                        <InfoRow label="N° GUCEG" value={cd.gucegRef || c.gucegRef || '—'} />
                        <InfoRow label="N° SYDONIA" value={cd.sydoniaRef || c.sydoniaRef || '—'} />
                        <InfoRow label="N° Déclaration" value={cd.declarationNumber || '—'} />
                        <InfoRow label="Code HS" value={cd.hsCode ? `${cd.hsCode}${cd.hsDescription ? ` · ${cd.hsDescription}` : ''}` : '—'} />
                        <InfoRow label="Origine" value={cd.countryOfOrigin || '—'} />
                        <InfoRow label="Destination" value={cd.countryOfDestination || '—'} />
                        <InfoRow label="Valeur douanière" value={cd.customsValue !== null ? `${cd.customsValue.toLocaleString('fr-FR')} ${cd.customsValueCurrency}` : '—'} />
                        <InfoRow label="Droits / TVA" value={cd.dutyAmount !== null || cd.vatAmount !== null ? `${(cd.dutyAmount ?? 0).toLocaleString('fr-FR')} + ${(cd.vatAmount ?? 0).toLocaleString('fr-FR')}` : '—'} />
                        {cd.submittedAt && (
                          <InfoRow label="Déposée le" value={formatDate(cd.submittedAt)} />
                        )}
                        {cd.clearedAt && (
                          <InfoRow label="Mainlevée le" value={formatDate(cd.clearedAt)} />
                        )}
                        {cd.releaseNoteNumber && (
                          <InfoRow label="N° Quitus" value={cd.releaseNoteNumber} />
                        )}
                      </div>

                      {/* Customs events timeline */}
                      {cd.events.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Événements douaniers
                            </h4>
                            <div className="relative space-y-0">
                              {cd.events.map((evt, idx) => (
                                <div key={evt.id} className="flex gap-3 pb-4 last:pb-0">
                                  <div className="relative flex flex-col items-center">
                                    <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-full border bg-background">
                                      <CircleDot className="size-3 text-blue-500" />
                                    </div>
                                    {idx < cd.events.length - 1 && (
                                      <div className="w-px flex-1 bg-border" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1 pt-0.5">
                                    <p className="text-sm font-medium text-foreground">
                                      {evt.eventType}
                                    </p>
                                    {evt.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {evt.description}
                                      </p>
                                    )}
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {formatDateTime(evt.performedAt)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: TRANSPORT ──────────────────────── */}
          <TabsContent value="transport">
            <div className="space-y-4">
              {/* Maritime */}
              {c.type === 'maritime' && c.shipments.length > 0 &&
                c.shipments.map((sh) => (
                  <Card key={sh.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Ship className="size-4 text-muted-foreground" />
                        Expédition maritime
                        {sh.blNumber && (
                          <Badge variant="outline" className="ml-1 font-mono text-xs">
                            BL: {sh.blNumber}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                        <InfoRow label="Navire" value={sh.vesselName || '—'} />
                        <InfoRow label="Voyage N°" value={sh.voyageNumber || '—'} />
                        <InfoRow label="Compagnie" value={sh.shippingLine || '—'} />
                        <InfoRow label="Port chargement" value={sh.loadingPort || '—'} />
                        <InfoRow label="Port déchargement" value={sh.dischargePort || '—'} />
                        <InfoRow label="Terminal" value={sh.terminal || '—'} />
                        {sh.bookingNumber && (
                          <InfoRow label="Booking N°" value={sh.bookingNumber} />
                        )}
                        {sh.freeTimeEndsAt && (
                          <InfoRow label="Fin free time" value={formatDate(sh.freeTimeEndsAt)} />
                        )}
                        {sh.containerReturnDeadline && (
                          <InfoRow label="Retour conteneur" value={formatDate(sh.containerReturnDeadline)} />
                        )}
                      </div>
                      {sh.containers.length > 0 && (
                        <>
                          <Separator />
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Conteneurs ({sh.containers.length})
                          </h4>
                          <div className="max-h-64 overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>N° Conteneur</TableHead>
                                  <TableHead>Taille</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Plomb</TableHead>
                                  <TableHead>Poids</TableHead>
                                  <TableHead>Statut</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sh.containers.map((ct) => (
                                  <TableRow key={ct.id}>
                                    <TableCell className="font-mono text-xs">
                                      {ct.containerNumber || '—'}
                                    </TableCell>
                                    <TableCell>{ct.size || '—'}</TableCell>
                                    <TableCell>{ct.type || '—'}</TableCell>
                                    <TableCell className="font-mono text-xs">
                                      {ct.sealNumber || '—'}
                                    </TableCell>
                                    <TableCell>
                                      {ct.grossWeight
                                        ? `${ct.grossWeight.toLocaleString('fr-FR')} kg`
                                        : '—'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px]"
                                      >
                                        {getContainerStatusLabel(ct.status)}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}

              {/* Aérien */}
              {c.type === 'aerien' && c.flights.length > 0 &&
                c.flights.map((fl) => (
                  <Card key={fl.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Plane className="size-4 text-muted-foreground" />
                        Expédition aérienne
                        {fl.awbNumber && (
                          <Badge variant="outline" className="ml-1 font-mono text-xs">
                            AWB: {fl.awbNumber}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                        <InfoRow label="Compagnie" value={fl.airline || '—'} />
                        <InfoRow label="N° Vol" value={fl.flightNumber || '—'} />
                        <InfoRow label="Aéroport départ" value={fl.departureAirport || '—'} />
                        <InfoRow label="Aéroport arrivée" value={fl.arrivalAirport || '—'} />
                        <InfoRow label="Départ" value={formatDateTime(fl.departureTime || '')} />
                        <InfoRow label="Arrivée" value={formatDateTime(fl.arrivalTime || '')} />
                        <InfoRow
                          label="Poids brut"
                          value={fl.grossWeightKg ? `${fl.grossWeightKg.toLocaleString('fr-FR')} kg` : '—'}
                        />
                        <InfoRow
                          label="Poids net"
                          value={fl.netWeightKg ? `${fl.netWeightKg.toLocaleString('fr-FR')} kg` : '—'}
                        />
                        <InfoRow
                          label="Colis"
                          value={fl.packageCount ? String(fl.packageCount) : '—'}
                        />
                        {fl.natureOfGoods && (
                          <InfoRow label="Nature marchandise" value={fl.natureOfGoods} />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {/* Terrestre */}
              {(c.type === 'terrestre' || c.transportMissions.length > 0) && (
                <div className="space-y-4">
                  {c.transportMissions.length > 0 ? (
                    c.transportMissions.map((tm) => (
                      <Card key={tm.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                              <Truck className="size-4 text-muted-foreground" />
                              Mission de transport
                            </CardTitle>
                            <Badge
                              className={cn(
                                'text-[10px]',
                                getTransportStatusColor(tm.status)
                              )}
                            >
                              {getTransportStatusLabel(tm.status)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                            <InfoRow label="Type" value={tm.type === 'livraison' ? 'Livraison' : 'Enlèvement'} />
                            <InfoRow label="Chauffeur" value={tm.driverName || '—'} />
                            <InfoRow label="Téléphone" value={tm.driverPhone || '—'} />
                            <InfoRow label="Véhicule" value={tm.vehiclePlate || '—'} />
                            <InfoRow label="Transporteur" value={tm.transporter || '—'} />
                            <InfoRow label="Date prévue" value={formatDate(tm.scheduledDate || '')} />
                            <InfoRow label="Enlèvement" value={tm.pickupAddress || '—'} />
                            <InfoRow label="Livraison" value={tm.deliveryAddress || '—'} />
                            {tm.completedDate && (
                              <InfoRow label="Terminé le" value={formatDate(tm.completedDate)} />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : c.type === 'terrestre' ? (
                    <Card>
                      <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                          <Truck className="size-6 text-muted-foreground/60" />
                        </div>
                        <p className="text-sm font-medium">Aucune mission de transport</p>
                        <p className="text-xs">
                          Les missions de transport terrestre apparaîtront ici.
                        </p>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              )}

              {/* Fallback: no transport data */}
              {c.type !== 'maritime' && c.type !== 'aerien' && c.type !== 'terrestre' && c.transportMissions.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <Container className="size-6 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-medium">Aucune information de transport</p>
                    <p className="text-xs">
                      Les détails de transport apparaîtront ici une fois disponibles.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── TAB: DÉBOURS ────────────────────────── */}
          <TabsContent value="debours">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <DollarSign className="size-4 text-muted-foreground" />
                  Demandes de débours
                  <Badge variant="secondary" className="ml-1">
                    {c.expenseRequests.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Dépenses liées à ce dossier
                </CardDescription>
              </CardHeader>
              <CardContent>
                {c.expenseRequests.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <DollarSign className="size-6 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-medium">Aucun débours</p>
                    <p className="text-xs">
                      Les demandes de débours apparaîtront ici une fois créées.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Demandeur</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {c.expenseRequests.map((exp) => (
                          <TableRow key={exp.id}>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">
                                  {exp.description}
                                </p>
                                {exp.vendor && (
                                  <p className="text-xs text-muted-foreground">
                                    {exp.vendor}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatGNF(exp.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  'text-[10px] px-1.5 py-0',
                                  getExpenseStatusColor(exp.status)
                                )}
                              >
                                {getExpenseStatusLabel(exp.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {exp.requester
                                ? `${exp.requester.firstName} ${exp.requester.lastName}`.trim()
                                : '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(exp.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: FACTURATION ────────────────────── */}
          <TabsContent value="facturation">
            {c.invoices.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <FileCheck2 className="size-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium">Aucune facture</p>
                  <p className="text-xs">
                    Les factures liées à ce dossier apparaîtront ici.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {c.invoices.map((inv) => (
                  <Card key={inv.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                          <FileCheck2 className="size-4 text-muted-foreground" />
                          {inv.invoiceNumber}
                        </CardTitle>
                        <Badge
                          className={cn(
                            'text-xs',
                            getInvoiceStatusColor(inv.status)
                          )}
                        >
                          {getInvoiceStatusLabel(inv.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                        <InfoRow
                          label="Montant HT"
                          value={formatGNF(inv.netAmount)}
                        />
                        <InfoRow
                          label="TVA ({inv.taxRate}%)"
                          value={formatGNF(inv.taxAmount)}
                        />
                        <InfoRow
                          label="Montant TTC"
                          value={formatGNF(inv.totalAmount)}
                          valueClassName="font-semibold"
                        />
                        <InfoRow
                          label="Payé"
                          value={formatGNF(inv.paidAmount)}
                          valueClassName={
                            inv.paidAmount >= inv.totalAmount
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : ''
                          }
                        />
                        <InfoRow label="Devise" value={inv.currency} />
                        {inv.issuedAt && (
                          <InfoRow label="Émise le" value={formatDate(inv.issuedAt)} />
                        )}
                        {inv.dueDate && (
                          <InfoRow label="Échéance" value={formatDate(inv.dueDate)} />
                        )}
                      </div>

                      {/* Invoice items */}
                      {inv.items.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Lignes de facturation
                            </h4>
                            <div className="max-h-48 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Qté</TableHead>
                                    <TableHead className="text-right">P.U.</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {inv.items.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell className="text-sm">
                                        {item.description}
                                      </TableCell>
                                      <TableCell className="text-right text-sm">
                                        {item.quantity}
                                      </TableCell>
                                      <TableCell className="text-right text-sm">
                                        {formatGNF(item.unitPrice)}
                                      </TableCell>
                                      <TableCell className="text-right text-sm font-medium">
                                        {formatGNF(item.total)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Payments */}
                      {inv.payments.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Paiements ({inv.payments.length})
                            </h4>
                            <div className="max-h-36 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Montant</TableHead>
                                    <TableHead>Méthode</TableHead>
                                    <TableHead>Réf.</TableHead>
                                    <TableHead>Statut</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {inv.payments.map((pay) => (
                                    <TableRow key={pay.id}>
                                      <TableCell className="font-medium">
                                        {formatGNF(pay.amount)}
                                      </TableCell>
                                      <TableCell className="text-sm capitalize">
                                        {pay.method || '—'}
                                      </TableCell>
                                      <TableCell className="text-sm font-mono">
                                        {pay.reference || '—'}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={
                                            pay.status === 'confirme'
                                              ? 'default'
                                              : 'outline'
                                          }
                                          className={cn(
                                            'text-[10px]',
                                            pay.status === 'confime'
                                              ? 'bg-emerald-500 hover:bg-emerald-500'
                                              : pay.status === 'annule'
                                                ? 'bg-red-100 text-red-700'
                                                : ''
                                          )}
                                        >
                                          {pay.status === 'confirme'
                                            ? 'Confirmé'
                                            : pay.status === 'annule'
                                              ? 'Annulé'
                                              : 'En attente'}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: INCIDENTS ──────────────────────── */}
          <TabsContent value="incidents">
            {c.incidents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <CheckCircle2 className="size-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium">Aucun incident</p>
                  <p className="text-xs">
                    Aucun incident n'a été signalé pour ce dossier.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {c.incidents.map((inc) => (
                  <Card key={inc.id} className="overflow-hidden">
                    <div className="border-b px-6 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {inc.title}
                        </h3>
                        <Badge
                          className={cn(
                            'flex-shrink-0 text-[10px]',
                            getSeverityColor(inc.severity)
                          )}
                        >
                          {getSeverityLabel(inc.severity)}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            'text-[10px]',
                            getIncidentStatusColor(inc.status)
                          )}
                        >
                          {getIncidentStatusLabel(inc.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(inc.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                        {inc.description}
                      </p>
                      {inc.resolution && (
                        <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20">
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            Résolution : {inc.resolution}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ─── SIDEBAR ───────────────────────────────── */}
        <aside className="hidden space-y-4 lg:block">
          {/* Alertes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="size-4 text-amber-500" />
                Alertes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {isBlocked && (
                  <div className="flex items-start gap-2 rounded-md bg-red-50 p-2.5 dark:bg-red-900/20">
                    <Ban className="mt-0.5 size-4 flex-shrink-0 text-red-500" />
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                        Dossier bloqué
                      </p>
                      <p className="text-[11px] text-red-600/80 dark:text-red-400/80">
                        Ce dossier est actuellement suspendu.
                      </p>
                    </div>
                  </div>
                )}
                {isOverdue && !isBlocked && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2.5 dark:bg-amber-900/20">
                    <TriangleAlert className="mt-0.5 size-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        ETA dépassé
                      </p>
                      <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
                        Prévu le {formatDate(c.eta!)}
                      </p>
                    </div>
                  </div>
                )}
                {c.incidents.some((i) => i.status === 'ouvert' || i.status === 'en_cours') && (
                  <div className="flex items-start gap-2 rounded-md bg-orange-50 p-2.5 dark:bg-orange-900/20">
                    <AlertOctagon className="mt-0.5 size-4 flex-shrink-0 text-orange-600 dark:text-orange-400" />
                    <div>
                      <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                        Incidents ouverts
                      </p>
                      <p className="text-[11px] text-orange-600/80 dark:text-orange-400/80">
                        {c.incidents.filter((i) => i.status === 'ouvert' || i.status === 'en_cours').length} incident(s) non résolu(s)
                      </p>
                    </div>
                  </div>
                )}
                {c.documents.some((d) => d.status === 'non_conforme' || d.status === 'expire') && (
                  <div className="flex items-start gap-2 rounded-md bg-rose-50 p-2.5 dark:bg-rose-900/20">
                    <FileText className="mt-0.5 size-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                    <div>
                      <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                        Documents non conformes
                      </p>
                      <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
                        {c.documents.filter((d) => d.status === 'non_conforme' || d.status === 'expire').length} document(s) à traiter
                      </p>
                    </div>
                  </div>
                )}
                {!isBlocked && !isOverdue &&
                  !c.incidents.some((i) => i.status === 'ouvert' || i.status === 'en_cours') &&
                  !c.documents.some((d) => d.status === 'non_conforme' || d.status === 'expire') && (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-2.5 dark:bg-emerald-900/20">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Aucune alerte active
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Checklist Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="size-4 text-muted-foreground" />
                Checklist
              </CardTitle>
              <CardDescription className="text-xs">
                {checklistCompleted}/{checklistTotal} éléments complétés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklistTotal > 0 ? (
                <>
                  <Progress
                    value={
                      checklistTotal > 0
                        ? (checklistCompleted / checklistTotal) * 100
                        : 0
                    }
                    className="h-2"
                  />
                  <ScrollArea className="max-h-40">
                    <div className="space-y-1.5 pr-2">
                      {c.checklists.map((ch) => (
                        <div
                          key={ch.id}
                          className={cn(
                            'flex items-center gap-2 rounded px-1.5 py-1 text-xs',
                            ch.isCompleted && 'text-muted-foreground'
                          )}
                        >
                          {ch.isCompleted ? (
                            <CircleCheck className="size-3.5 flex-shrink-0 text-emerald-500" />
                          ) : (
                            <Circle className="size-3.5 flex-shrink-0 text-muted-foreground/50" />
                          )}
                          <span className={cn(ch.isCompleted && 'line-through')}>
                            {ch.label}
                          </span>
                          {ch.isRequired && (
                            <span className="ml-auto text-[10px] text-amber-600">*</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <p className="py-2 text-xs text-muted-foreground">
                  Aucune checklist définie.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Prochains jalons */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ArrowRight className="size-4 text-muted-foreground" />
                Prochains jalons
              </CardTitle>
            </CardHeader>
            <CardContent>
              {c.milestones.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">
                  Aucun jalon défini.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {c.milestones
                    .filter((m) => m.status !== 'atteint')
                    .slice(0, 5)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="flex items-start gap-2.5"
                      >
                        <div className="mt-0.5">
                          {m.status === 'echoue' ? (
                            <XCircle className="size-4 text-red-500" />
                          ) : m.status === 'en_retard' ? (
                            <TriangleAlert className="size-4 text-amber-500" />
                          ) : m.status === 'en_cours' ? (
                            <CircleDot className="size-4 text-blue-500" />
                          ) : (
                            <Circle className="size-4 text-muted-foreground/50" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground">
                            {m.name}
                          </p>
                          {m.plannedDate && (
                            <p className="text-[11px] text-muted-foreground">
                              {formatDate(m.plannedDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collaborateurs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <User className="size-4 text-muted-foreground" />
                Collaborateurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {c.assignees.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">
                  Aucun collaborateur assigné.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {c.assignees.map((a) => {
                    const p = a.profile
                    const initials = `${p.firstName[0]}${p.lastName[0]}`.toUpperCase()
                    return (
                      <div key={a.id} className="flex items-center gap-2.5">
                        <Avatar className="size-7">
                          <AvatarImage src={p.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-[10px] font-medium">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {a.role.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

// ─── InfoRow Sub-component ──────────────────────────────

function InfoRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-sm font-medium text-foreground', valueClassName)}>
        {value}
      </p>
    </div>
  )
}
