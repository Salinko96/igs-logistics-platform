import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { missingLegalOrganizationFields } from '@/lib/organization'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || (profile.role !== 'ADMIN' && profile.role !== 'AGENT')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const organization = await db.organization.findFirst({
      where: { id: profile.organizationId, isActive: true },
      include: { settings: true },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Aucune organisation active trouvée' }, { status: 404 })
    }

    return NextResponse.json({ organization, legalIdentity: { complete: missingLegalOrganizationFields(organization).length === 0, missingFields: missingLegalOrganizationFields(organization) } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const body = await request.json()

    const legalOrganization = {
      name: typeof body.name === 'string' ? body.name : '',
      address: typeof body.address === 'string' ? body.address : '',
      city: typeof body.city === 'string' ? body.city : '',
      country: typeof body.country === 'string' ? body.country : '',
      phone: typeof body.phone === 'string' ? body.phone : '',
      email: typeof body.email === 'string' ? body.email : '',
      taxId: typeof body.taxId === 'string' ? body.taxId : '',
    }
    const missingFields = missingLegalOrganizationFields(legalOrganization)
    if (missingFields.length) {
      return NextResponse.json({ error: `Informations légales obligatoires : ${missingFields.join(', ')}` }, { status: 400 })
    }
    if (!/^\S+@\S+\.\S+$/.test(legalOrganization.email)) {
      return NextResponse.json({ error: 'Adresse email de l’organisation invalide' }, { status: 400 })
    }

    const organization = await db.organization.findFirst({
      where: { id: profile.organizationId, isActive: true },
      include: { settings: true },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Aucune organisation active trouvée' }, { status: 404 })
    }

    const updatedOrganization = await db.organization.update({
      where: { id: organization.id },
      data: {
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : organization.name,
        address: typeof body.address === 'string' ? body.address.trim() || null : organization.address,
        city: typeof body.city === 'string' && body.city.trim() ? body.city.trim() : organization.city,
        country: typeof body.country === 'string' && body.country.trim() ? body.country.trim() : organization.country,
        phone: typeof body.phone === 'string' ? body.phone.trim() || null : organization.phone,
        email: typeof body.email === 'string' ? body.email.trim().toLowerCase() || null : organization.email,
        taxId: typeof body.taxId === 'string' ? body.taxId.trim() || null : organization.taxId,
      },
    })

    const updatedSettings = await db.organizationSettings.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        currency: typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim() : 'GNF',
        dateFormat: typeof body.dateFormat === 'string' && body.dateFormat.trim() ? body.dateFormat.trim() : 'DD/MM/YYYY',
        timezone: typeof body.timezone === 'string' && body.timezone.trim() ? body.timezone.trim() : 'Africa/Conakry',
        language: typeof body.language === 'string' && body.language.trim() ? body.language.trim() : 'fr',
        invoicePrefix: typeof body.invoicePrefix === 'string' && body.invoicePrefix.trim() ? body.invoicePrefix.trim() : 'FAC',
        casePrefix: typeof body.casePrefix === 'string' && body.casePrefix.trim() ? body.casePrefix.trim() : 'IGS',
        expenseApprovalMinAmount: typeof body.expenseApprovalMinAmount === 'number' ? body.expenseApprovalMinAmount : 500000,
        expenseApprovalMaxAmount: typeof body.expenseApprovalMaxAmount === 'number' ? body.expenseApprovalMaxAmount : 5000000,
        quotationValidityDays: typeof body.quotationValidityDays === 'number' ? body.quotationValidityDays : 30,
      },
      update: {
        currency: typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim() : undefined,
        dateFormat: typeof body.dateFormat === 'string' && body.dateFormat.trim() ? body.dateFormat.trim() : undefined,
        timezone: typeof body.timezone === 'string' && body.timezone.trim() ? body.timezone.trim() : undefined,
        language: typeof body.language === 'string' && body.language.trim() ? body.language.trim() : undefined,
        invoicePrefix: typeof body.invoicePrefix === 'string' && body.invoicePrefix.trim() ? body.invoicePrefix.trim() : undefined,
        casePrefix: typeof body.casePrefix === 'string' && body.casePrefix.trim() ? body.casePrefix.trim() : undefined,
        expenseApprovalMinAmount: typeof body.expenseApprovalMinAmount === 'number' ? body.expenseApprovalMinAmount : undefined,
        expenseApprovalMaxAmount: typeof body.expenseApprovalMaxAmount === 'number' ? body.expenseApprovalMaxAmount : undefined,
        quotationValidityDays: typeof body.quotationValidityDays === 'number' ? body.quotationValidityDays : undefined,
      },
    })

    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'settings_changed', entityType: 'organization', entityId: organization.id, details: { legalIdentityUpdated: true }, request })
    return NextResponse.json({ organization: updatedOrganization, settings: updatedSettings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
