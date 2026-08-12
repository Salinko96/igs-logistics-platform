'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import jsPDF from 'jspdf'
import { strToU8, zipSync } from 'fflate'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { formatGNF, CASE_TYPES } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart3,
  TrendingUp,
  FolderOpen,
  DollarSign,
  Clock,
  Download,
  FileText,
  FileSpreadsheet,
} from 'lucide-react'

// ─── Types ───

type DashboardData = {
  totalCases: number
  activeCases: number
  blockedCases: number
  urgentCases: number
  casesByType: { type: string; count: number }[]
  recentCases: {
    id: string
    reference: string
    status: string
    priority: string
    type: string
    createdAt: string
    client: { name: string }
  }[]
  revenueByMonth: { month: string; revenue: number }[]
  totalRevenue: number
  totalUnpaid: number
  invoicesOverdue: number
  incidentsOpen: number
}

// ─── Demo Data ───

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function escapeCsv(value: string | number) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function escapeXml(value: string | number) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function exportCsv() {
  const headers = ['Service', 'Dossiers', 'Part', 'Revenus']
  const rows = [] as Array<Record<string, string | number>>
  return { headers, rows }
}

function buildReportRows(typeData: { name: string; value: number; color: string }[], totalRevenue: number) {
  return typeData.map((row) => ({
    Service: row.name,
    Dossiers: row.value,
    Part: `${Math.round((row.value / Math.max(1, typeData.reduce((sum, item) => sum + item.value, 0))) * 100)}%`,
    Revenus: Math.round(totalRevenue * (row.value / Math.max(1, typeData.reduce((sum, item) => sum + item.value, 0)))),
  }))
}

function exportCsvFromRows(rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] ?? {})
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv(row[header as keyof typeof row])).join(','),
    ),
  ]

  downloadBlob(
    new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
    'igs-rapport-kpi.csv',
  )
}

function exportXlsxFromRows(rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] ?? {})
  const sheetRows = [headers, ...rows.map((row) => headers.map((header) => row[header as keyof typeof row]))]
  const sheetXml = sheetRows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((cell, cellIndex) => {
            const column = String.fromCharCode(65 + cellIndex)
            const type = typeof cell === 'number' ? 'n' : 'inlineStr'
            const value =
              type === 'n'
                ? `<v>${cell}</v>`
                : `<is><t>${escapeXml(cell)}</t></is>`
            return `<c r="${column}${rowIndex + 1}" t="${type}">${value}</c>`
          })
          .join('')}</row>`,
    )
    .join('')

  const files = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="KPI IGS" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '</Relationships>',
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        `<sheetData>${sheetXml}</sheetData></worksheet>`,
    ),
  }

  const zipped = zipSync(files)
  downloadBlob(
    new Blob([zipped], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'igs-rapport-kpi.xlsx',
  )
}

function exportPdfFromRows(rows: Array<Record<string, string | number>>, title: string, metrics: string[]) {
  const doc = new jsPDF()
  const margin = 16
  let y = 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(title, margin, y)

  y += 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Généré le ${new Intl.DateTimeFormat('fr-FR').format(new Date())}`, margin, y)

  y += 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Indicateurs clés', margin, y)

  y += 8
  doc.setFont('helvetica', 'normal')
  metrics.forEach((item) => {
    doc.text(item, margin, y)
    y += 7
  })

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Volume de dossiers par mois', margin, y)
  y += 8
  doc.setFont('helvetica', 'normal')
  rows.forEach((row) => {
    doc.text(`${row.month}: ${row.volume} dossiers`, margin, y)
    y += 6
  })

  doc.save('igs-rapport-kpi.pdf')
}

// ─── Custom Tooltip ───

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} dossiers</p>
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground">
        {data.name} : {data.value} dossiers
      </p>
    </div>
  )
}

// ─── KPI Card ───

interface KpiCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  subtext?: string
}

function KpiCard({ label, value, icon, iconBg, iconColor, subtext }: KpiCardProps) {
  return (
    <Card className="p-6 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}
        >
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

// ─── Main Component ───

export default function ReportsView() {
  const { data } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard')
      if (!response.ok) throw new Error('Impossible de charger les rapports')
      return response.json()
    },
  })

  const monthlyData = data?.revenueByMonth?.map((row) => ({
    month: new Date(`${row.month}-01`).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
    volume: Math.round(row.revenue / 1_000_000),
  })) ?? []
  const typeData = (data?.casesByType ?? []).map((entry, index) => ({
    name: CASE_TYPES.find((t) => t.value === entry.type)?.label ?? entry.type,
    value: entry.count,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))
  const reportRows = useMemo(() => buildReportRows(typeData, data?.totalRevenue ?? 0), [typeData, data?.totalRevenue])
  const metrics = [
    `Dossiers traités: ${data?.totalCases ?? 0}`,
    `CA annuel: ${formatGNF(data?.totalRevenue ?? 0)}`,
    `Dossiers urgents: ${data?.urgentCases ?? 0}`,
    `Incidents ouverts: ${data?.incidentsOpen ?? 0}`,
  ]

  const exportPdf = () => exportPdfFromRows(monthlyData, 'Ibrahima Gold Service - Rapport KPI', metrics)
  const exportCsv = () => exportCsvFromRows(reportRows)
  const exportXlsx = () => exportXlsxFromRows(reportRows)

  return (
    <div className="space-y-6">
      {/* ─── Title Row ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Rapports & KPI
          </h1>
          <p className="text-sm text-muted-foreground">
            Analyse de performance et indicateurs clés
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={exportPdf}
          >
            <FileText size={14} />
            PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={exportXlsx}
          >
            <FileSpreadsheet size={14} />
            Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={exportCsv}
          >
            <Download size={14} />
            CSV
          </Button>
        </div>
      </div>

      {/* ─── KPI Summary Cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Dossiers traités"
          value={data?.totalCases ?? 0}
          subtext="cette année"
          icon={<FolderOpen size={22} />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <KpiCard
          label="CA annuel"
          value={formatGNF(data?.totalRevenue ?? 0)}
          subtext="chiffre d'affaires"
          icon={<TrendingUp size={22} />}
          iconBg="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
        />
        <KpiCard
          label="Dossiers urgents"
          value={data?.urgentCases ?? 0}
          subtext="priorité élevée"
          icon={<Clock size={22} />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <KpiCard
          label="Incidents ouverts"
          value={data?.incidentsOpen ?? 0}
          subtext="à traiter"
          icon={<DollarSign size={22} />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bar Chart - Volume par mois */}
        <Card className="lg:col-span-2 p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">
              Volume de dossiers par mois
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={monthlyData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar
                  dataKey="volume"
                  fill={CHART_COLORS[0]}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={56}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Répartition par type */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">
              Répartition par type
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  stroke="none"
                >
                  {typeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {typeData.map((entry) => (
                <div
                  key={entry.name}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Performance Table ─── */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">
            Répartition par type
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Dossiers</TableHead>
                <TableHead className="hidden sm:table-cell">Part</TableHead>
                <TableHead className="text-right">Revenus estimés</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportRows.map((row) => (
                <TableRow key={row.Service}>
                  <TableCell className="font-medium text-foreground">
                    {row.Service}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.Dossiers}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {row.Part}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground whitespace-nowrap">
                    {formatGNF(row.Revenus)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
