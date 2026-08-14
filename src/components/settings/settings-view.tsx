'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Shield, Users, Building2, Bell, Monitor, Smartphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SecuritySettings } from '@/components/settings/security-settings'
import { useI18n } from '@/lib/i18n'
import { PageHero } from '@/components/shared/page-hero'

type SettingsPayload = {
  legalIdentity: { complete: boolean; missingFields: string[] }
  organization: {
    name: string
    address: string | null
    city: string
    country: string
    phone: string | null
    email: string | null
    taxId: string | null
    settings: {
      currency: string
      dateFormat: string
      timezone: string
      language: string
      invoicePrefix: string
      casePrefix: string
      expenseApprovalMinAmount: number
      expenseApprovalMaxAmount: number
      quotationValidityDays: number
    } | null
  }
}

type ProfileRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  agency: string
  site: string
  isActive: boolean
  approvalStatus: string
  requestedRole: string | null
}

function getRoleLabel(role: string) {
  const map: Record<string, string> = {
    ADMIN: 'Administrateur',
    AGENT: 'Agent opérationnel',
    CLIENT: 'Client',
    COMMERCIAL: 'Commercial',
    EXPLOITANT: 'Exploitant',
    COMPTABLE: 'Comptable',
    dg: 'Directeur Général',
    do: 'Directeur des Opérations',
    daf: 'DAF',
    chef_maritime: 'Chef Maritime',
    chef_aerien: 'Chef Aérien',
    chef_terrestre: 'Chef Terrestre',
    agent_logistique: 'Agent Logistique',
    declarant: 'Déclarant en Douane',
    comptable: 'Comptable',
    commercial: 'Commercial',
  }
  return map[role] ?? role
}

function getRoleColor(role: string) {
  if (role.includes('chef')) return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
  if (role === 'dg') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
  if (role === 'daf' || role === 'comptable') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  if (role === 'commercial') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

function NotifToggle({ label, description, defaultChecked = true }: { label: string; description: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  )
}

export default function SettingsView() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const { data } = useQuery<SettingsPayload>({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings')
      if (!response.ok) throw new Error('Impossible de charger les paramètres')
      return response.json()
    },
  })
  const { data: profiles = [] } = useQuery<ProfileRow[]>({
    queryKey: ['settings-profiles'],
    queryFn: async () => {
      const response = await fetch('/api/profiles')
      if (!response.ok) throw new Error('Impossible de charger les utilisateurs')
      return response.json()
    },
  })

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    taxId: '',
    currency: '',
    dateFormat: '',
    timezone: '',
    language: '',
    invoicePrefix: '',
    casePrefix: '',
    expenseApprovalMinAmount: '',
    expenseApprovalMaxAmount: '',
    quotationValidityDays: '',
  })
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [userBusy, setUserBusy] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  })
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'AGENT',
    agency: 'Conakry',
    site: 'Conakry',
  })

  const defaults = useMemo(() => {
    const s = data?.organization.settings
    return {
      name: data?.organization.name ?? '',
      address: data?.organization.address ?? '',
      city: data?.organization.city ?? '',
      country: data?.organization.country ?? '',
      phone: data?.organization.phone ?? '',
      email: data?.organization.email ?? '',
      taxId: data?.organization.taxId ?? '',
      currency: s?.currency ?? 'GNF',
      dateFormat: s?.dateFormat ?? 'DD/MM/YYYY',
      timezone: s?.timezone ?? 'Africa/Conakry',
      language: s?.language ?? 'fr',
      invoicePrefix: s?.invoicePrefix ?? 'FAC',
      casePrefix: s?.casePrefix ?? 'IGS',
      expenseApprovalMinAmount: String(s?.expenseApprovalMinAmount ?? 500000),
      expenseApprovalMaxAmount: String(s?.expenseApprovalMaxAmount ?? 5000000),
      quotationValidityDays: String(s?.quotationValidityDays ?? 30),
    }
  }, [data])

  const fieldValue = (key: keyof typeof defaults) => form[key] || defaults[key]

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...defaults,
          ...form,
          expenseApprovalMinAmount: Number(fieldValue('expenseApprovalMinAmount')),
          expenseApprovalMaxAmount: Number(fieldValue('expenseApprovalMaxAmount')),
          quotationValidityDays: Number(fieldValue('quotationValidityDays')),
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Sauvegarde impossible')
      }
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUserBusy(true)
    setUserError(null)
    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Création impossible')
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      await queryClient.invalidateQueries({ queryKey: ['settings-profiles'] })
      setUserDialogOpen(false)
      setUserForm({ firstName: '', lastName: '', email: '', phone: '', role: 'AGENT', agency: 'Conakry', site: 'Conakry' })
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setUserBusy(false)
    }
  }

  const reviewUser = async (id: string, action: 'approve' | 'reject' | 'disable', role?: string | null) => {
    const response = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, role }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) { setUserError(payload.error || 'Décision impossible'); return }
    await queryClient.invalidateQueries({ queryKey: ['settings-profiles'] })
  }

  const updatePassword = async () => {
    setPasswordMessage(null)
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setPasswordMessage('Veuillez remplir tous les champs.')
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordMessage('La confirmation ne correspond pas.')
      return
    }
    const response = await fetch('/api/auth/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: passwordForm.current, nextPassword: passwordForm.next }) })
    const payload = await response.json()
    setPasswordMessage(response.ok ? 'Mot de passe mis à jour.' : payload.error || 'Mise à jour impossible.')
    if (response.ok) setPasswordForm({ current: '', next: '', confirm: '' })
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Administration" title={t('nav.settings')} description="Configurez votre organisation, vos utilisateurs, la sécurité et les préférences de la plateforme." />

      <Tabs defaultValue="organisation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="organisation" className="gap-2"><Building2 size={16} className="hidden sm:block" /><span className="sm:hidden">Org.</span><span className="hidden sm:inline">Organisation</span></TabsTrigger>
          <TabsTrigger value="utilisateurs" className="gap-2"><Users size={16} className="hidden sm:block" />Utilisateurs</TabsTrigger>
          <TabsTrigger value="securite" className="gap-2"><Shield size={16} className="hidden sm:block" /><span className="sm:hidden">Séc.</span><span className="hidden sm:inline">Sécurité</span></TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell size={16} className="hidden sm:block" /><span className="sm:hidden">Notif.</span><span className="hidden sm:inline">Notifications</span></TabsTrigger>
        </TabsList>

        <TabsContent value="organisation">
          <Card className="p-6">
            <CardHeader className="p-0 pb-6">
              <CardTitle>Informations de l'organisation</CardTitle>
              <CardDescription>Détails de votre entreprise et informations fiscales</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data && !data.legalIdentity.complete && <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Identité légale incomplète</p><p className="mt-1">Toute émission de facture sera bloquée jusqu’à la saisie de : {data.legalIdentity.missingFields.join(', ')}.</p></div>}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Raison sociale" value={fieldValue('name')} onChange={(value) => setForm((s) => ({ ...s, name: value }))} />
                <Field label="Adresse" value={fieldValue('address')} onChange={(value) => setForm((s) => ({ ...s, address: value }))} />
                <Field label="Ville" value={fieldValue('city')} onChange={(value) => setForm((s) => ({ ...s, city: value }))} />
                <Field label="Pays" value={fieldValue('country')} onChange={(value) => setForm((s) => ({ ...s, country: value }))} />
                <Field label="Téléphone" value={fieldValue('phone')} onChange={(value) => setForm((s) => ({ ...s, phone: value }))} />
                <Field label="Email" value={fieldValue('email')} onChange={(value) => setForm((s) => ({ ...s, email: value }))} />
                <Field label="NIF" value={fieldValue('taxId')} onChange={(value) => setForm((s) => ({ ...s, taxId: value }))} />
                <Field label="Préfixe facture" value={fieldValue('invoicePrefix')} onChange={(value) => setForm((s) => ({ ...s, invoicePrefix: value }))} />
                <Field label="Préfixe dossier" value={fieldValue('casePrefix')} onChange={(value) => setForm((s) => ({ ...s, casePrefix: value }))} />
                <Field label="Devise" value={fieldValue('currency')} onChange={(value) => setForm((s) => ({ ...s, currency: value }))} />
              </div>
              <Separator className="my-6" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Format date" value={fieldValue('dateFormat')} onChange={(value) => setForm((s) => ({ ...s, dateFormat: value }))} />
                <Field label="Fuseau horaire" value={fieldValue('timezone')} onChange={(value) => setForm((s) => ({ ...s, timezone: value }))} />
                <Field label="Langue" value={fieldValue('language')} onChange={(value) => setForm((s) => ({ ...s, language: value }))} />
                <Field label="Seuil approbation min" value={fieldValue('expenseApprovalMinAmount')} onChange={(value) => setForm((s) => ({ ...s, expenseApprovalMinAmount: value }))} />
                <Field label="Seuil approbation max" value={fieldValue('expenseApprovalMaxAmount')} onChange={(value) => setForm((s) => ({ ...s, expenseApprovalMaxAmount: value }))} />
                <Field label="Validité devis (jours)" value={fieldValue('quotationValidityDays')} onChange={(value) => setForm((s) => ({ ...s, quotationValidityDays: value }))} />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['settings'] })} type="button">Réinitialiser</Button>
                <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  <Save size={16} className="mr-2" />
                  {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utilisateurs">
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Utilisateurs</CardTitle>
                  <CardDescription>Gestion des comptes et des rôles</CardDescription>
                </div>
                <Button size="sm" onClick={() => setUserDialogOpen(true)} type="button"><Users size={14} className="mr-2" />Ajouter</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom complet</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead className="hidden md:table-cell">Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.firstName} {user.lastName}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{user.email}</TableCell>
                        <TableCell><Badge variant="secondary" className={`text-xs ${getRoleColor(user.requestedRole || user.role)}`}>{getRoleLabel(user.requestedRole || user.role)}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell"><Badge variant="secondary" className={user.approvalStatus === 'pending' ? 'bg-amber-100 text-amber-800' : user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{user.approvalStatus === 'pending' ? 'En attente' : user.isActive ? 'Actif' : 'Désactivé'}</Badge></TableCell>
                        <TableCell>{user.approvalStatus === 'pending' ? <div className="flex gap-2"><Button size="sm" onClick={() => void reviewUser(user.id, 'approve', user.requestedRole)}>Approuver</Button><Button size="sm" variant="outline" onClick={() => void reviewUser(user.id, 'reject')}>Rejeter</Button></div> : user.role !== 'ADMIN' && user.isActive ? <Button size="sm" variant="ghost" onClick={() => void reviewUser(user.id, 'disable')}>Désactiver</Button> : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-5 grid gap-3 border-t pt-5 md:grid-cols-3">
                <div className="rounded-lg border bg-muted/20 p-4"><p className="font-semibold">Administrateur</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Configuration, utilisateurs, abonnement, audit, finance et toutes les opérations. 2FA obligatoire.</p></div>
                <div className="rounded-lg border bg-muted/20 p-4"><p className="font-semibold">Agent opérationnel</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Dossiers, clients, douane, documents, tracking, débours, facturation et incidents de son organisation.</p></div>
                <div className="rounded-lg border bg-muted/20 p-4"><p className="font-semibold">Client</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Portail isolé : ses dossiers et les documents explicitement partagés avec lui.</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Ajouter un utilisateur</DialogTitle>
            </DialogHeader>
            <form className="grid gap-4" onSubmit={createUser}>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Prénom" value={userForm.firstName} onChange={(value) => setUserForm((s) => ({ ...s, firstName: value }))} />
                <Field label="Nom" value={userForm.lastName} onChange={(value) => setUserForm((s) => ({ ...s, lastName: value }))} />
              </div>
              <Field label="Email" value={userForm.email} onChange={(value) => setUserForm((s) => ({ ...s, email: value }))} />
              <Field label="Téléphone" value={userForm.phone} onChange={(value) => setUserForm((s) => ({ ...s, phone: value }))} />
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={userForm.role} onValueChange={(value) => setUserForm((s) => ({ ...s, role: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrateur</SelectItem>
                    <SelectItem value="AGENT">Agent opérationnel</SelectItem>
                    <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                    <SelectItem value="EXPLOITANT">Exploitant</SelectItem>
                    <SelectItem value="COMPTABLE">Comptable</SelectItem>
                    <SelectItem value="CLIENT">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Agence" value={userForm.agency} onChange={(value) => setUserForm((s) => ({ ...s, agency: value }))} />
                <Field label="Site" value={userForm.site} onChange={(value) => setUserForm((s) => ({ ...s, site: value }))} />
              </div>
              {userError ? <p className="text-sm text-destructive">{userError}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={userBusy}>{userBusy ? 'Création...' : 'Créer'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <TabsContent value="securite">
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle>Changer le mot de passe</CardTitle>
              <CardDescription>Modifiez votre mot de passe de connexion</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-w-md space-y-4">
                <div className="space-y-2"><Label>Mot de passe actuel</Label><Input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((s) => ({ ...s, current: e.target.value }))} placeholder="••••••••" /></div>
                <div className="space-y-2"><Label>Nouveau mot de passe</Label><Input type="password" value={passwordForm.next} onChange={(e) => setPasswordForm((s) => ({ ...s, next: e.target.value }))} placeholder="••••••••" /></div>
                <div className="space-y-2"><Label>Confirmer le mot de passe</Label><Input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((s) => ({ ...s, confirm: e.target.value }))} placeholder="••••••••" /></div>
                <Separator />
                {passwordMessage ? <p className="text-sm text-muted-foreground">{passwordMessage}</p> : null}
                <Button type="button" onClick={updatePassword}><Shield size={16} className="mr-2" />Mettre à jour</Button>
                <SecuritySettings />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle>Préférences de notification</CardTitle>
              <CardDescription>Configurez les alertes et notifications que vous recevez</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                <NotifToggle label="Nouveaux dossiers" description="Notification lors de la création d'un nouveau dossier" />
                <NotifToggle label="Changement de statut" description="Alerte lors d'un changement de statut de dossier" />
                <NotifToggle label="Incidents critiques" description="Alerte immédiate pour les incidents de sévérité critique" defaultChecked />
                <NotifToggle label="Factures échues" description="Rappel des factures arrivées à échéance" />
                <NotifToggle label="Débours en attente" description="Notification des débours nécessitant validation" />
                <NotifToggle label="Rapports hebdomadaires" description="Résumé hebdomadaire des activités par email" defaultChecked={false} />
                <NotifToggle label="Documents rejetés" description="Alerte lorsqu'un document est rejeté" />
                <NotifToggle label="Mises à jour système" description="Annonces de maintenance et mises à jour de la plateforme" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-background" />
    </div>
  )
}
